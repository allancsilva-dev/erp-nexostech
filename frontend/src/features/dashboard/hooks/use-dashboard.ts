'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useBranch } from '@/hooks/use-branch';

export interface DashboardSummary {
  currentBalance: string;
  totalReceivable30d: string;
  totalPayable30d: string;
  monthResult: string;
}

export interface CashflowPoint {
  label: string;
  incoming: string;
  outgoing: string;
}

export interface ExpenseBreakdownItem {
  category: string;
  value: string;
  color: string;
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
    queryFn: () => api.get<CashflowPoint[]>('/dashboard/cashflow-chart'),
    enabled: Boolean(activeBranchId),
  });
}

export function useDashboardExpenseBreakdown() {
  const { activeBranchId } = useBranch();
  return useQuery({
    queryKey: [...queryKeys.dashboard.all(activeBranchId || 'default'), 'expense-breakdown'],
    queryFn: () => api.get<ExpenseBreakdownItem[]>('/dashboard/expense-breakdown'),
    enabled: Boolean(activeBranchId),
  });
}
