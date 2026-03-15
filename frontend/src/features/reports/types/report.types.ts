export type ReportType = 'DRE' | 'CASHFLOW' | 'AGING';

export interface DreRow {
  categoryId: string;
  category: string;
  type: 'RECEIVABLE' | 'PAYABLE';
  amount: string;
  percentage: number;
}

export interface DreSummary {
  totalRevenue: string;
  totalExpense: string;
  netResult: string;
  rows: DreRow[];
}

export interface CashflowRow {
  date: string;
  incoming: string;
  outgoing: string;
  balance: string;
}

export interface AgingBucket {
  label: string;
  receivable: string;
  payable: string;
  count: number;
}

export interface AgingReport {
  buckets: AgingBucket[];
  totalReceivable: string;
  totalPayable: string;
}

export interface ReportFilters {
  startDate: string;
  endDate: string;
  categoryId?: string;
  type?: 'RECEIVABLE' | 'PAYABLE';
}
