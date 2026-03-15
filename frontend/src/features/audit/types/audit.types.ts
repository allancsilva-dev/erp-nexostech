export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'CANCEL'
  | 'RESTORE'
  | 'PAY'
  | 'REFUND'
  | 'APPROVE'
  | 'REJECT'
  | 'RECONCILE'
  | 'EXPORT';

export interface AuditLog {
  id: string;
  branchId: string | null;
  userId: string;
  userEmail: string | null;
  action: AuditAction | string;
  entity: string;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditFilters {
  page?: number;
  pageSize?: number;
  action?: AuditAction;
  entity?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
