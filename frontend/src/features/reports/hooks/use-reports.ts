'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useBranch } from '@/hooks/use-branch';

export function useReports() {
  const { activeBranchId } = useBranch();

  const dre = useQuery({
    queryKey: ['reports', activeBranchId, 'dre'],
    queryFn: () => api.get('/reports/dre'),
    enabled: Boolean(activeBranchId),
  });

  const balanceSheet = useQuery({
    queryKey: ['reports', activeBranchId, 'balance-sheet'],
    queryFn: () => api.get('/reports/balance-sheet'),
    enabled: Boolean(activeBranchId),
  });

  const aging = useQuery({
    queryKey: ['reports', activeBranchId, 'aging'],
    queryFn: () => api.get('/reports/aging'),
    enabled: Boolean(activeBranchId),
  });

  return { dre, balanceSheet, aging };
}
