export type BoletoStatus = 'ACTIVE' | 'PAID' | 'CANCELLED' | 'EXPIRED';

export interface Boleto {
  id: string;
  entryId: string;
  bankAccountId: string;
  ourNumber: string;
  barCode: string;
  digitableLine: string;
  amount: string;
  dueDate: string;
  status: BoletoStatus;
  pdfUrl: string | null;
  registeredAt: string;
  cancelledAt: string | null;
}

export interface BoletoFilters {
  page?: number;
  pageSize?: number;
  status?: BoletoStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
