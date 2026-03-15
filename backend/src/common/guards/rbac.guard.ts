import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { sql } from 'drizzle-orm';
import { REQUIRED_PERMISSION_KEY } from '../decorators/require-permission.decorator';
import type { AuthUser } from '../types/auth-user.type';
import { DrizzleService } from '../../infrastructure/database/drizzle.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { quoteIdent, quoteLiteral } from '../../infrastructure/database/sql-builder.util';

const RBAC_CACHE_TTL_MS = 300_000;

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly drizzleService: DrizzleService,
    private readonly cacheService: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string>(REQUIRED_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;

    if (user?.roles.includes('ADMIN')) {
      return true;
    }

    if (!user?.sub || !user.tenantId) {
      throw new ForbiddenException({
        error: {
          code: 'FORBIDDEN',
          message: 'Usuario sem contexto de permissao',
        },
      });
    }

    const permissions = await this.loadUserPermissions(user);
    if (permissions.includes(required)) {
      return true;
    }

    throw new ForbiddenException({
      error: {
        code: 'FORBIDDEN',
        message: `Sem permissao: ${required}`,
      },
    });
  }

  private async loadUserPermissions(user: AuthUser): Promise<string[]> {
    const cacheKey = this.buildCacheKey(user.tenantId, user.sub);
    const cached = await this.cacheService.get<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const tenantSchema = quoteIdent(this.drizzleService.getTenantSchema());
    const userId = quoteLiteral(user.sub);
    const result = await this.drizzleService.getClient().execute(sql.raw(`
      SELECT DISTINCT rp.permission_code
      FROM ${tenantSchema}.user_roles ur
      JOIN ${tenantSchema}.role_permissions rp ON rp.role_id = ur.role_id
      WHERE ur.user_id = ${userId}
    `));

    const permissions = (result.rows as Array<Record<string, unknown>>).map((row) =>
      String(row.permission_code),
    );
    await this.cacheService.set(cacheKey, permissions, RBAC_CACHE_TTL_MS);

    return permissions;
  }

  private buildCacheKey(tenantId: string, userId: string): string {
    return `rbac:${tenantId}:${userId}`;
  }
}
