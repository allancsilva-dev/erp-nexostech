'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useBranch } from '@/hooks/use-branch';

interface PendingApproval {
  id: string;
  documentNumber: string;
}

export function useApprovals() {
  const { activeBranchId } = useBranch();
  const queryClient = useQueryClient();

  const pending = useQuery({
    queryKey: ['approvals', activeBranchId, 'pending'],
    queryFn: () => api.get<PendingApproval[]>('/approvals/pending'),
    enabled: Boolean(activeBranchId),
  });

  const approve = useMutation({
    mutationFn: (entryId: string) => api.post(`/approvals/${entryId}/approve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['approvals', activeBranchId, 'pending'] }),
  });

  const reject = useMutation({
    mutationFn: ({ entryId, reason }: { entryId: string; reason: string }) =>
      api.post(`/approvals/${entryId}/reject`, { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['approvals', activeBranchId, 'pending'] }),
  });

  return { pending, approve, reject };
}
