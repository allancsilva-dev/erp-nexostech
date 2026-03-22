import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  UnauthorizedException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Observable } from 'rxjs';
import { AuthUser } from '../types/auth-user.type';

type TenantAwareRequest = {
  user?: AuthUser;
  headers: Record<string, string | string[] | undefined>;
  originalUrl?: string;
  url?: string;
  tenantId?: string | null;
};

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly clsService: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<TenantAwareRequest>();
    const path = (request.url ?? request.originalUrl ?? '').split('?')[0];
    const publicRoutes = ['/api/v1/health', '/api/v1/metrics'];

    if (publicRoutes.some((route) => path.endsWith(route))) {
      return next.handle();
    }

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
    }

    request.tenantId = tenantId;

    if (tenantId) {
      this.clsService.set('tenantId', tenantId);
    }

    return next.handle();
  }
}
