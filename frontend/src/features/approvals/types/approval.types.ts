export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PendingApproval {
  id: string;
  documentNumber: string;
  description: string;
  amount: string;
  dueDate: string;
  type: 'PAYABLE' | 'RECEIVABLE';
  createdBy: string;
  branchId: string;
}

export interface ApprovalAction {
  entryId: string;
  reason?: string;
}

export interface ApprovalFilters {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
