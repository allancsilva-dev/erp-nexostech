import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import pino from 'pino';
import { Observable, tap } from 'rxjs';
import { AuthUser } from '../types/auth-user.type';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      requestId?: string;
      user?: AuthUser;
      headers: Record<string, string | undefined>;
    }>();

    return next.handle().pipe(
      tap(() => {
        logger.info({
          message: 'request.completed',
          method: request.method,
          url: request.url,
          durationMs: Date.now() - now,
          requestId: request.requestId,
          tenantId: request.user?.tenantId,
          userId: request.user?.sub,
          branchId: request.headers['x-branch-id'],
        });
      }),
    );
  }
}
