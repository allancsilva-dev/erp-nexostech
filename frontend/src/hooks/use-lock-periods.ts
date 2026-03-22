'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchLockPeriods } from '@/lib/api/settings';
import { useBranch } from '@/hooks/use-branch';
import { queryKeys } from '@/lib/query-keys';

export function useLockPeriods() {
  const { activeBranchId } = useBranch();

  return useQuery({
    queryKey: queryKeys.settings.lockPeriods(activeBranchId || 'default'),
    queryFn: () => fetchLockPeriods(activeBranchId!),
    enabled: Boolean(activeBranchId),
    staleTime: 60_000,
  });
}
