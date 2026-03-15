import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../infrastructure/database/drizzle.service';
import { quoteIdent, quoteLiteral } from '../../infrastructure/database/sql-builder.util';
import type { AuthUser } from '../types/auth-user.type';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly drizzleService: DrizzleService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      method: string;
      originalUrl?: string;
      route?: { path?: string };
      params?: Record<string, string | undefined>;
      headers: Record<string, string | undefined>;
      requestId?: string;
      user?: AuthUser;
    }>();

    const method = request.method?.toUpperCase() ?? 'GET';
    if (method === 'GET') {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: () => {
          void this.writeAudit(request).catch(() => undefined);
        },
      }),
    );
  }

  private async writeAudit(request: {
    method: string;
    originalUrl?: string;
    route?: { path?: string };
    params?: Record<string, string | undefined>;
    headers: Record<string, string | undefined>;
    requestId?: string;
    user?: AuthUser;
  }): Promise<void> {
    const user = request.user;
    if (!user?.sub) {
      return;
    }

    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const action = this.mapAction(request.method);
    const entity = this.resolveEntity(request.originalUrl ?? request.route?.path ?? 'unknown');
    const entityId = this.resolveEntityId(request.params);
    const metadata = JSON.stringify({
      method: request.method,
      path: request.originalUrl ?? request.route?.path ?? null,
    });

    await this.drizzleService.getClient().execute(sql.raw(`
      INSERT INTO ${schema}.audit_logs (
        branch_id,
        user_id,
        action,
        entity,
        entity_id,
        request_id,
        metadata
      ) VALUES (
        ${quoteLiteral(request.headers['x-branch-id'] ?? null)},
        ${quoteLiteral(user.sub)},
        ${quoteLiteral(action)},
        ${quoteLiteral(entity)},
        ${quoteLiteral(entityId)},
        ${quoteLiteral(request.requestId ?? null)},
        ${quoteLiteral(metadata)}::jsonb
      )
    `));
  }

  private mapAction(method: string): string {
    switch (method.toUpperCase()) {
      case 'POST':
        return 'CREATE';
      case 'PUT':
      case 'PATCH':
        return 'UPDATE';
      case 'DELETE':
        return 'DELETE';
      default:
        return 'UPDATE';
    }
  }

  private resolveEntity(url: string): string {
    const cleanPath = url.split('?')[0] ?? url;
    const segments = cleanPath.split('/').filter(Boolean);
    if (segments.length >= 3 && segments[0] === 'api' && segments[1] === 'v1') {
      return segments[2];
    }

    return segments[0] ?? 'unknown';
  }

  private resolveEntityId(params?: Record<string, string | undefined>): string {
    if (!params) return 'n/a';
    const firstParam = Object.values(params).find((value) => Boolean(value));
    return firstParam ?? 'n/a';
  }
}
