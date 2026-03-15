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
import { quoteIdent, quoteLiteral } from '../../infrastructure/database/sql-builder.util';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly drizzleService: DrizzleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string>(REQUIRED_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;

    // Bootstrap: ADMIN liberado. Integracao com cache/role_permissions entra em modulo RBAC completo.
    if (user?.roles.includes('ADMIN')) {
      return true;
    }

    const tenantSchema = quoteIdent(this.drizzleService.getTenantSchema());
    const userId = quoteLiteral(user?.sub ?? '');
    const permission = quoteLiteral(required);
    const result = await this.drizzleService.getClient().execute(sql.raw(`
      SELECT 1
      FROM ${tenantSchema}.user_roles ur
      JOIN ${tenantSchema}.role_permissions rp ON rp.role_id = ur.role_id
      WHERE ur.user_id = ${userId}
        AND rp.permission_code = ${permission}
      LIMIT 1
    `));

    if (result.rows.length > 0) {
      return true;
    }

    throw new ForbiddenException({
      error: {
        code: 'FORBIDDEN',
        message: `Sem permissao: ${required}`,
      },
    });
  }
}
