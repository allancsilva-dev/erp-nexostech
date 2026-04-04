import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'crypto';
import { Observable, from, of, switchMap } from 'rxjs';
import {
  IDEMPOTENT_KEY,
  IDEMPOTENT_TTL_MS,
} from '../decorators/idempotent.decorator';
import { CacheService } from '../../infrastructure/cache/cache.service';

type CachedIdempotentResponse = {
  payloadHash: string;
  response: unknown;
};

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly cacheService: CacheService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const enabled = this.reflector.getAllAndOverride<boolean>(IDEMPOTENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!enabled) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      body: unknown;
      method: string;
      originalUrl: string;
      path: string;
      route?: { path?: string };
      user?: {
        tenantId?: string;
        sub?: string;
        userId?: string;
      };
    }>();

    const idempotencyKey = request.headers['idempotency-key'];
    if (!idempotencyKey) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Chave de segurança obrigatória. Tente novamente.',
        },
      });
    }

    const payloadHash = createHash('sha256')
      .update(
        JSON.stringify({
          method: request.method,
          url: request.originalUrl,
          body: request.body,
        }),
      )
      .digest('hex');

    const tenantId = request.user?.tenantId;
    const userId = request.user?.sub ?? request.user?.userId;
    const routePath = request.route?.path || request.path;
    const cacheKey = `idempotency:${tenantId}:${userId}:${request.method}:${routePath}:${idempotencyKey}`;

    return from(this.cacheService.get<CachedIdempotentResponse>(cacheKey)).pipe(
      switchMap((cached) => {
        if (cached) {
          if (cached.payloadHash !== payloadHash) {
            throw new ConflictException({
              error: {
                code: 'CONFLICT',
                message: 'Esta operação já foi processada.',
              },
            });
          }

          return of(cached.response);
        }

        return next
          .handle()
          .pipe(
            switchMap((response) =>
              from(
                this.cacheService.set(
                  cacheKey,
                  { payloadHash, response } satisfies CachedIdempotentResponse,
                  IDEMPOTENT_TTL_MS,
                ),
              ).pipe(switchMap(() => of(response))),
            ),
          );
      }),
    );
  }
}
