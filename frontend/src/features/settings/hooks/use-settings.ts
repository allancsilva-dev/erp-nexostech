'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useBranch } from '@/hooks/use-branch';

export function useSettings() {
  const { activeBranchId } = useBranch();
  return useQuery({
    queryKey: ['settings', activeBranchId],
    queryFn: () => api.get('/settings'),
    enabled: Boolean(activeBranchId),
  });
}

export function useBankAccounts() {
  const { activeBranchId } = useBranch();
  return useQuery({
    queryKey: ['bank-accounts', activeBranchId],
    queryFn: () => api.get('/bank-accounts'),
    enabled: Boolean(activeBranchId),
  });
}

export function useLockPeriods() {
  const { activeBranchId } = useBranch();
  return useQuery({
    queryKey: ['lock-periods', activeBranchId],
    queryFn: () => api.get('/lock-periods'),
    enabled: Boolean(activeBranchId),
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles'),
  });
}
