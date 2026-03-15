'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { approvalsApi } from '@/lib/api/approvals-api';

export function usePendingApprovals() {
  return useQuery({
    queryKey: ['approvals', 'pending'],
    queryFn: () => approvalsApi.listPending(),
    staleTime: 30_000,
  });
}

export function useApproveEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) => approvalsApi.approve(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals', 'pending'] });
    },
  });
}

export function useRejectEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, reason }: { entryId: string; reason: string }) =>
      approvalsApi.reject(entryId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals', 'pending'] });
    },
  });
}
