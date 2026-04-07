'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useBranch } from '@/hooks/use-branch';
import {
  fetchCashflowChart,
  fetchDashboardSummary,
  fetchOverdueEntries,
} from '@/lib/api/dashboard';
import { queryKeys } from '@/lib/query-keys';
import { normalizeCashflowData } from '@/lib/utils/normalize';

export type DashboardPeriod = '3m' | '6m' | '12m';

type UseCashflowDataOptions = {
  period?: DashboardPeriod;
};

export function useDashboardSummary() {
  const { activeBranchId } = useBranch();

  return useQuery({
    queryKey: queryKeys.dashboard.summary(activeBranchId),
    queryFn: ({ signal }) => fetchDashboardSummary(activeBranchId as string, signal),
    enabled: !!activeBranchId,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useCashflowData(options?: UseCashflowDataOptions) {
  const { activeBranchId } = useBranch();
  const period = options?.period ?? '12m';

  return useQuery({
    queryKey: queryKeys.dashboard.cashflow(activeBranchId, period),
    queryFn: async ({ signal }) => {
      const raw = await fetchCashflowChart(activeBranchId as string, period, signal);
      return normalizeCashflowData(raw);
    },
    enabled: !!activeBranchId,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useOverdueEntries() {
  const { activeBranchId } = useBranch();

  return useQuery({
    queryKey: queryKeys.dashboard.overdue(activeBranchId),
    queryFn: ({ signal }) => fetchOverdueEntries(activeBranchId as string, signal),
    enabled: !!activeBranchId,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
