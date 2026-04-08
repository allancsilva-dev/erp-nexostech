'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { fetchLockPeriods } from '@/lib/api/settings';
import { useAuth } from '@/hooks/use-auth';
import { useBranch } from '@/hooks/use-branch';
import { queryKeys } from '@/lib/query-keys';

export function useSettings() {
  const { activeBranchId } = useBranch();

  return useQuery({
    queryKey: queryKeys.settings.all(activeBranchId!),
    queryFn: ({ signal }) =>
      api.get('/settings', {}, { signal, branchId: activeBranchId! }),
    enabled: !!activeBranchId,
  });
}

export function useBankAccounts() {
  const { activeBranchId } = useBranch();

  return useQuery({
    queryKey: queryKeys.settings.bankAccounts(activeBranchId!),
    queryFn: ({ signal }) =>
      api.get('/bank-accounts', {}, { signal, branchId: activeBranchId! }),
    enabled: !!activeBranchId,
    staleTime: 60_000,
  });
}

export function useLockPeriods() {
  const { activeBranchId } = useBranch();

  return useQuery({
    queryKey: queryKeys.settings.lockPeriods(activeBranchId!),
    queryFn: ({ signal }) => fetchLockPeriods(activeBranchId!, signal),
    enabled: !!activeBranchId,
    staleTime: 60_000,
  });
}

export function useRoles() {
  const user = useAuth();
  const tenantId = user?.tenantId ?? null;

  return useQuery({
    queryKey: tenantId ? queryKeys.roles(tenantId) : ['roles', 'disabled'],
    queryFn: ({ signal }) => api.get('/roles', {}, { signal }),
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}
