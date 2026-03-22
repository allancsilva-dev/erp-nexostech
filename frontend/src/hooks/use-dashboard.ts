'use client';

import { useQuery } from '@tanstack/react-query';
import { useBranchContext } from '@/providers/branch-provider';
import {
  fetchCashflowChart,
  fetchDashboardSummary,
  fetchOverdueEntries,
} from '@/lib/api/dashboard';
import { normalizeCashflowData } from '@/lib/utils/normalize';

export function useDashboardSummary() {
  const { activeBranchId } = useBranchContext();

  return useQuery({
    queryKey: ['dashboard', 'summary', activeBranchId],
    queryFn: () => fetchDashboardSummary(activeBranchId),
    enabled: !!activeBranchId,
    staleTime: 60_000,
  });
}

export function useCashflowData() {
  const { activeBranchId } = useBranchContext();

  return useQuery({
    queryKey: ['dashboard', 'cashflow', activeBranchId],
    queryFn: async () => {
      const raw = await fetchCashflowChart(activeBranchId);
      return normalizeCashflowData(raw);
    },
    enabled: !!activeBranchId,
    staleTime: 60_000,
  });
}

export function useOverdueEntries() {
  const { activeBranchId } = useBranchContext();

  return useQuery({
    queryKey: ['dashboard', 'overdue', activeBranchId],
    queryFn: () => fetchOverdueEntries(activeBranchId),
    enabled: !!activeBranchId,
    staleTime: 60_000,
  });
}
