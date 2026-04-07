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

type OverdueEntryPayload = {
  id?: unknown;
  documentNumber?: unknown;
  document_number?: unknown;
  description?: unknown;
  contact?: unknown;
  contactName?: unknown;
  contact_name?: unknown;
  amount?: unknown;
  dueDate?: unknown;
  due_date?: unknown;
  daysOverdue?: unknown;
  days_overdue?: unknown;
  type?: unknown;
};

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

export async function fetchDashboardSummary(
  branchId: string,
  signal?: AbortSignal,
): Promise<DashboardSummary> {
  const response = await api.get<unknown>('/dashboard/summary', {}, { branchId, signal });
  const raw = unwrapData<unknown>(response) as Record<string, unknown>;

  const getVal = (keys: string[]) => {
    for (const k of keys) {
      const v = raw[k];
      if (v !== undefined && v !== null) return v as string | number;
    }
    return undefined as string | number | undefined;
  };

  return {
    // backend returns `currentBalance`, map to our `totalBalance`
    totalBalance: toNumber(getVal(['currentBalance', 'totalBalance'])),
    receivable30d: toNumber(getVal(['totalReceivable30d', 'receivable30d'])),
    payable30d: toNumber(getVal(['totalPayable30d', 'payable30d'])),
    monthResult: toNumber(getVal(['monthResult', 'month_result'])),
    variations: (raw['variations'] as unknown) ?? undefined,
  };
}

export async function fetchCashflowChart(
  branchId: string,
  period = '12m',
  signal?: AbortSignal,
): Promise<DashboardCashflowRawPoint[]> {
  const response = await api.get<DashboardCashflowRawPoint[]>(
    '/dashboard/cashflow-chart',
    { period },
    { branchId, signal },
  );
  return unwrapData<DashboardCashflowRawPoint[]>(response);
}

export async function fetchOverdueEntries(
  branchId: string,
  signal?: AbortSignal,
): Promise<OverdueEntry[]> {
  const response = await api.get<OverdueEntryPayload[]>('/dashboard/overdue', {}, { branchId, signal });
  const raw = unwrapData<OverdueEntryPayload[]>(response);

  return raw.map((entry) => {
    const dueDate = String(entry.dueDate ?? entry.due_date ?? '');
    const explicitDays = entry.daysOverdue ?? entry.days_overdue;
    const daysOverdue = explicitDays == null
      ? computeDaysOverdue(dueDate)
      : toNumber(explicitDays as string | number | null | undefined);

    return {
      id: String(entry.id ?? ''),
      documentNumber: toNullableString(entry.documentNumber ?? entry.document_number),
      description: String(entry.description ?? ''),
      contact: toNullableString(entry.contact),
      contactName: toNullableString(entry.contactName ?? entry.contact_name),
      amount: toNumber(entry.amount as string | number | null | undefined),
      dueDate,
      daysOverdue,
      type: normalizeEntryType(entry.type),
    };
  });
}

function toNullableString(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function normalizeEntryType(value: unknown): 'PAYABLE' | 'RECEIVABLE' {
  return String(value).toUpperCase() === 'PAYABLE' ? 'PAYABLE' : 'RECEIVABLE';
}

function computeDaysOverdue(dueDate: string): number {
  if (!dueDate) {
    return 0;
  }

  const parsed = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return 0;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - parsed.getTime();
  return diffMs <= 0 ? 0 : Math.floor(diffMs / 86_400_000);
}
