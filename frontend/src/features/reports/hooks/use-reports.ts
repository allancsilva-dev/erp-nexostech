'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useBranch } from '@/hooks/use-branch';
import { queryKeys } from '@/lib/query-keys';

export function useReports() {
  const { activeBranchId } = useBranch();

  const dre = useQuery({
    queryKey: queryKeys.reports.dre(activeBranchId || 'default'),
    queryFn: () => api.get('/reports/dre'),
    enabled: Boolean(activeBranchId),
  });

  const balanceSheet = useQuery({
    queryKey: queryKeys.reports.balanceSheet(activeBranchId || 'default'),
    queryFn: () => api.get('/reports/balance-sheet'),
    enabled: Boolean(activeBranchId),
  });

  const aging = useQuery({
    queryKey: queryKeys.reports.aging(activeBranchId || 'default'),
    queryFn: () => api.get('/reports/aging'),
    enabled: Boolean(activeBranchId),
  });

  return { dre, balanceSheet, aging };
}
