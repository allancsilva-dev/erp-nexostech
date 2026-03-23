export type EntryStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'PENDING'
  | 'PARTIAL'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED';

export type PaymentMethod = 'BOLETO' | 'PIX' | 'TRANSFER' | 'CARD' | 'CASH' | 'OTHER';

export interface Entry {
  id: string;
  documentNumber: string | null;
  type: 'PAYABLE' | 'RECEIVABLE';
  description: string;
  amount: string;
  issueDate: string;
  dueDate: string;
  paidDate: string | null;
  paidAmount: string | null;
  remainingBalance: string;
  status: EntryStatus;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  contactId: string | null;
  contactName: string | null;
  bankAccountId: string | null;
  paymentMethod: PaymentMethod | null;
  hasBoleto?: boolean;
  installmentNumber: number | null;
  installmentTotal: number | null;
  installmentLabel: string | null;
  reconciled: boolean;
  notes: string | null;
  createdAt: string;
}

export interface Payment {
  id: string;
  entryId: string;
  amount: string;
  paymentDate: string;
  paymentMethod: PaymentMethod | null;
  bankAccountId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface EntryFilters {
  page?: number;
  pageSize?: number;
  type?: 'PAYABLE' | 'RECEIVABLE';
  status?: EntryStatus;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface Branch {
  id: string;
  name: string;
  document: string | null;
  isHeadquarters: boolean;
  active: boolean;
}
