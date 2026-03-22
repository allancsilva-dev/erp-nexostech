import { api } from '@/lib/api-client';
import { toNumber } from '@/lib/utils/normalize';

export interface DashboardSummary {
  totalBalance: string | number;
  receivable30d: string | number;
  payable30d: string | number;
  monthResult: string | number;
  variations?: {
    receivable?: number | null;
    payable?: number | null;
    result?: number | null;
  };
}

export interface DashboardCashflowRawPoint {
  month?: string;
  date?: string;
  income?: string | number;
  totalIn?: string | number;
  expense?: string | number;
  totalOut?: string | number;
  balance?: string | number;
}

export interface OverdueEntry {
  id: string;
  documentNumber?: string | null;
  description: string;
  contact?: string | null;
  contactName?: string | null;
  amount: string | number;
  dueDate: string;
  daysOverdue: number;
  type: 'PAYABLE' | 'RECEIVABLE';
}

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

export async function fetchDashboardSummary(branchId: string): Promise<DashboardSummary> {
  void branchId;
  const response = await api.get<DashboardSummary>('/dashboard/summary');
  const data = unwrapData<DashboardSummary>(response);

  return {
    ...data,
    totalBalance: toNumber(data.totalBalance),
    receivable30d: toNumber(data.receivable30d),
    payable30d: toNumber(data.payable30d),
    monthResult: toNumber(data.monthResult),
  };
}

export async function fetchCashflowChart(branchId: string): Promise<DashboardCashflowRawPoint[]> {
  void branchId;
  const response = await api.get<DashboardCashflowRawPoint[]>('/dashboard/cashflow-chart');
  return unwrapData<DashboardCashflowRawPoint[]>(response);
}

export async function fetchOverdueEntries(branchId: string): Promise<OverdueEntry[]> {
  void branchId;
  const response = await api.get<OverdueEntry[]>('/dashboard/overdue');
  return unwrapData<OverdueEntry[]>(response);
}
