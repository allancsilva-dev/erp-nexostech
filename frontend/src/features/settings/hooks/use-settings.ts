'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { fetchLockPeriods } from '@/lib/api/settings';
import { useBranch } from '@/hooks/use-branch';
import { queryKeys } from '@/lib/query-keys';

export function useSettings() {
  const { activeBranchId } = useBranch();
  return useQuery({
    queryKey: queryKeys.settings.all(activeBranchId || 'default'),
    queryFn: () => api.get('/settings'),
    enabled: Boolean(activeBranchId),
  });
}

export function useBankAccounts() {
  const { activeBranchId } = useBranch();
  return useQuery({
    queryKey: queryKeys.settings.bankAccounts(activeBranchId || 'default'),
    queryFn: () => api.get('/bank-accounts'),
    enabled: Boolean(activeBranchId),
  });
}

export function useLockPeriods() {
  const { activeBranchId } = useBranch();
  return useQuery({
    queryKey: queryKeys.settings.lockPeriods(activeBranchId || 'default'),
    queryFn: () => fetchLockPeriods(activeBranchId!),
    enabled: Boolean(activeBranchId),
    staleTime: 60_000,
  });
}

export function useRoles() {
  return useQuery({
    queryKey: queryKeys.roles,
    queryFn: () => api.get('/roles'),
  });
}
