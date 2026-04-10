import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClsService } from 'nestjs-cls';
import { sql } from 'drizzle-orm';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthUser } from '../types/auth-user.type';
import { DrizzleService } from '../../infrastructure/database/drizzle.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { quoteLiteral } from '../../infrastructure/database/sql-builder.util';

type TenantAwareRequest = {
  user?: AuthUser;
  headers: Record<string, string | string[] | undefined>;
  originalUrl?: string;
  url?: string;
  tenantId?: string | null;
};

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly clsService: ClsService,
    private readonly drizzleService: DrizzleService,
    private readonly cacheService: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<TenantAwareRequest>();
    const tenantFromToken = request.user?.tenantId ?? null;
    const headerValue = request.headers['x-tenant-id'];
    const tenantFromHeader =
      (Array.isArray(headerValue) ? headerValue[0] : headerValue)?.trim() ||
      null;
    const isSuperAdmin = request.user?.roles?.includes('SUPERADMIN') ?? false;

    let tenantId = tenantFromToken;

    if (!tenantId && isSuperAdmin && tenantFromHeader) {
      tenantId = tenantFromHeader;
    }

    if (!tenantId) {
      if (!isSuperAdmin) {
        throw new UnauthorizedException('Tenant nao encontrado no contexto');
      }

      const path = (request.url ?? request.originalUrl ?? '').split('?')[0];
      const superadminNoTenantRoutes = [
        '/tenants',
        '/admin',
        '/users/me/permissions',
        '/users/me',
        '/branches/my',
      ];

      const isAllowedSuperAdminRoute = superadminNoTenantRoutes.some(
        (route) =>
          path === `/api/v1${route}` || path.startsWith(`/api/v1${route}/`),
      );

      if (!isAllowedSuperAdminRoute) {
        throw new UnauthorizedException('Tenant nao encontrado no contexto');
      }

      return true;
    }

    request.tenantId = tenantId;
    this.clsService.set('tenantId', tenantId);

    const schemaName = await this.resolveSchema(tenantId);
    this.clsService.set('tenantSchema', schemaName);

    return true;
  }

  private async resolveSchema(tenantId: string): Promise<string> {
    const cacheKey = `tenant:schema:${tenantId}`;

    const cached = await this.cacheService.get<string>(cacheKey);
    if (cached) return cached;

    const result = await this.drizzleService
      .getClient()
      .execute(
        sql.raw(
          `SELECT schema_name FROM public.tenants WHERE id = ${quoteLiteral(tenantId)}::uuid LIMIT 1`,
        ),
      );

    const schemaName = result.rows[0]?.schema_name as string | undefined;

    if (!schemaName) {
      throw new UnauthorizedException('Tenant nao encontrado no banco');
    }

    await this.cacheService.set(cacheKey, schemaName, 5 * 60 * 1000);

    return schemaName;
  }
}