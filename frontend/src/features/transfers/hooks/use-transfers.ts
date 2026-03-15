'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useBranch } from '@/hooks/use-branch';
import { queryKeys } from '@/lib/query-keys';

export function useTransfers() {
  const { activeBranchId } = useBranch();
  return useQuery({
    queryKey: queryKeys.transfers.list(activeBranchId || 'default'),
    queryFn: () => api.get('/transfers'),
    enabled: Boolean(activeBranchId),
  });
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();
  const { activeBranchId } = useBranch();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/transfers', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.list(activeBranchId || 'default') });
    },
  });
}
