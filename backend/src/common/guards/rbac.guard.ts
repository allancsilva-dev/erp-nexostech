import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSION_KEY } from '../decorators/require-permission.decorator';
import type { AuthUser } from '../types/auth-user.type';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
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

    throw new ForbiddenException({
      error: {
        code: 'FORBIDDEN',
        message: `Sem permissao: ${required}`,
      },
    });
  }
}
