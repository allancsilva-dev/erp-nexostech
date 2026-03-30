'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { fetchCashflowChart } from '@/lib/api/dashboard';
import { normalizeCashflowData } from '@/lib/utils/normalize';
import { queryKeys } from '@/lib/query-keys';
import { useBranch } from '@/hooks/use-branch';

export interface DashboardSummary {
  currentBalance: string;
  totalReceivable30d: string;
  totalPayable30d: string;
  monthResult: string;
}

export interface CashflowPoint {
  month: string;
  forecastInflow: string;
  forecastOutflow: string;
  actualInflow: string;
  actualOutflow: string;
}

export interface OverdueItem {
  id: string;
  documentNumber: string;
  description: string;
  contactName: string;
  dueDate: string;
  amount: string;
}

export function useDashboardSummary() {
  const { activeBranchId } = useBranch();
  return useQuery({
    queryKey: queryKeys.dashboard.summary(activeBranchId || 'default'),
    queryFn: () => api.get<DashboardSummary>('/dashboard/summary'),
    enabled: Boolean(activeBranchId),
  });
}

export function useDashboardOverdue() {
  const { activeBranchId } = useBranch();
  return useQuery({
    queryKey: queryKeys.dashboard.overdue(activeBranchId || 'default'),
    queryFn: () => api.getList<OverdueItem>('/dashboard/overdue'),
    enabled: Boolean(activeBranchId),
  });
}

export function useDashboardCashflowChart() {
  const { activeBranchId } = useBranch();
  return useQuery({
    queryKey: [...queryKeys.dashboard.all(activeBranchId || 'default'), 'cashflow'],
    queryFn: async () => {
      const raw = await fetchCashflowChart(activeBranchId || 'default');
      return normalizeCashflowData(raw as unknown[]);
    },
    enabled: Boolean(activeBranchId),
  });
}
