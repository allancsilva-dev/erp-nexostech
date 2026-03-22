import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { AuthUser } from '../types/auth-user.type';
import { DrizzleService } from '../../infrastructure/database/drizzle.service';
import {
  quoteIdent,
  quoteLiteral,
} from '../../infrastructure/database/sql-builder.util';

function getRows(result: unknown): Array<Record<string, unknown>> {
  if (!result || typeof result !== 'object' || !('rows' in result)) {
    return [];
  }

  const rows = (result as { rows?: unknown }).rows;
  return Array.isArray(rows) ? (rows as Array<Record<string, unknown>>) : [];
}

@Injectable()
export class BranchGuard implements CanActivate {
  constructor(private readonly drizzleService: DrizzleService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: AuthUser;
    }>();

    // ADMIN tem acesso total - nao precisa de X-Branch-Id
    if (request.user?.roles.includes('ADMIN')) {
      return true;
    }

    const branchId = request.headers['x-branch-id'];
    if (!branchId) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_BRANCH',
          message: 'Header X-Branch-Id ausente',
        },
      });
    }

    const userId = request.user?.sub;
    if (!userId) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: 'Usuario sem contexto de filial' },
      });
    }

    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const result: unknown = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT 1
      FROM ${schema}.user_branches
      WHERE user_id = ${quoteLiteral(userId)}
        AND branch_id = ${quoteLiteral(branchId)}
      LIMIT 1
    `),
    );

    if (getRows(result).length === 0) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: 'Sem acesso a filial' },
      });
    }

    return true;
  }
}
