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
  // New backend fields (forecast vs actual)
  forecastInflow?: string | number;
  forecastOutflow?: string | number;
  forecast_inflow?: string | number;
  forecast_outflow?: string | number;
  actualInflow?: string | number;
  actualOutflow?: string | number;
  actual_inflow?: string | number;
  actual_outflow?: string | number;
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
  const response = await api.get<any>('/dashboard/summary');
  const raw = unwrapData<any>(response);

  return {
    // backend returns `currentBalance`, map to our `totalBalance`
    totalBalance: toNumber(raw.currentBalance),
    receivable30d: toNumber(raw.totalReceivable30d ?? raw.receivable30d),
    payable30d: toNumber(raw.totalPayable30d ?? raw.payable30d),
    monthResult: toNumber(raw.monthResult ?? raw.month_result),
    variations: raw.variations ?? undefined,
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
