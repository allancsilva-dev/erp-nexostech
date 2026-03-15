import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthUser } from '../types/auth-user.type';

@Injectable()
export class BranchGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: AuthUser;
    }>();

    const branchId = request.headers['x-branch-id'];
    if (!branchId) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_BRANCH',
          message: 'Header X-Branch-Id ausente',
        },
      });
    }

    // Placeholder da fase atual: ADMIN passa sempre. Validacao de user_branches entra no proximo passo.
    if (request.user?.roles.includes('ADMIN')) {
      return true;
    }

    if (!branchId) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: 'Sem acesso a filial' },
      });
    }

    return true;
  }
}
