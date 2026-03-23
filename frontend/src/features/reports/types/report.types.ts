export interface ReportFilters {
  [key: string]: unknown;
  startDate: string;
  endDate: string;
}

export interface DreReport {
  revenueTotal: string;
  expenseTotal: string;
  netResult: string;
}

export interface CashflowRow {
  date: string;
  inflow: string;
  outflow: string;
}

export interface CashflowReport {
  startBalance: string;
  rows: CashflowRow[];
  accumulated: string[];
}

export interface BalanceSheetRow {
  categoryName: string;
  inflow: string;
  outflow: string;
  net: string;
}

export interface BalanceSheetReport {
  byCategory: BalanceSheetRow[];
  totals: {
    inflow: string;
    outflow: string;
    net: string;
  };
}

export interface AgingRange {
  range: string;
  total: string;
  count: number;
}

export interface AgingReport {
  ranges: AgingRange[];
}

export type ExportReportName = 'dre' | 'cashflow' | 'balance-sheet' | 'aging';

export type ExportFormat = 'csv' | 'pdf';

export interface ExportReportPayload extends ReportFilters {
  report: ExportReportName;
  format: ExportFormat;
}

export interface ReportExportResponse {
  format: ExportFormat;
  filename: string;
  content: string;
}

