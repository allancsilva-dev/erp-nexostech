import {
  quoteIdent,
  quoteLiteral,
} from '../../../infrastructure/database/sql-builder.util';
import { BusinessException } from '../../../common/exceptions/business.exception';

export function resolveTenantSchema(payload: Record<string, unknown>): string {
  if (
    typeof payload.tenantSchema === 'string' &&
    payload.tenantSchema.length > 0
  ) {
    return quoteIdent(payload.tenantSchema);
  }

  // TEMPORARIO - remover apos confirmar que todos os jobs
  // propagam tenantSchema no payload (ver backlog)
  if (typeof payload.tenantId === 'string' && payload.tenantId.length > 0) {
    return quoteIdent(`tenant_${payload.tenantId}`);
  }

  throw new BusinessException('INTERNAL_ERROR', 500, {
    reason: 'JOB_PAYLOAD_MISSING_TENANT_SCHEMA',
  });
}

export function optionalBranchClause(
  payload: Record<string, unknown>,
  columnName = 'branch_id',
): string {
  if (typeof payload.branchId === 'string' && payload.branchId.length > 0) {
    return ` AND ${columnName} = ${quoteLiteral(payload.branchId)}`;
  }

  return '';
}
