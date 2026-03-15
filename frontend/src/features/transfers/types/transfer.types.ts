export interface Transfer {
  id: string;
  fromBankAccountId: string;
  fromBankAccountName: string;
  toBankAccountId: string;
  toBankAccountName: string;
  amount: string;
  transferDate: string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateTransferInput {
  fromBankAccountId: string;
  toBankAccountId: string;
  amount: string;
  transferDate: string;
  reference?: string;
  notes?: string;
}

export interface TransferFilters {
  page?: number;
  pageSize?: number;
  fromBankAccountId?: string;
  toBankAccountId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
