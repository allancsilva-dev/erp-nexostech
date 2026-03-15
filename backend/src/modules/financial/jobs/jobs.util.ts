import { quoteIdent, quoteLiteral } from '../../../infrastructure/database/sql-builder.util';

export function resolveTenantSchema(payload: Record<string, unknown>): string {
  if (typeof payload.tenantSchema === 'string' && payload.tenantSchema.length > 0) {
    return quoteIdent(payload.tenantSchema);
  }

  if (typeof payload.tenantId === 'string' && payload.tenantId.length > 0) {
    return quoteIdent(`tenant_${payload.tenantId}`);
  }

  throw new Error('Payload do job deve conter tenantSchema ou tenantId');
}

export function optionalBranchClause(payload: Record<string, unknown>, columnName = 'branch_id'): string {
  if (typeof payload.branchId === 'string' && payload.branchId.length > 0) {
    return ` AND ${columnName} = ${quoteLiteral(payload.branchId)}`;
  }

  return '';
}
