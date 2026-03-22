'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useBranch } from '@/hooks/use-branch';
import { queryKeys } from '@/lib/query-keys';

interface PendingApproval {
  id: string;
  documentNumber: string;
}

export function useApprovals(options?: { enabled?: boolean }) {
  const { activeBranchId } = useBranch();
  const queryClient = useQueryClient();
  const isEnabled = options?.enabled ?? true;

  const pending = useQuery({
    queryKey: queryKeys.approvals.pending(activeBranchId || 'default'),
    queryFn: () => api.get<PendingApproval[]>('/approvals/pending'),
    enabled: Boolean(activeBranchId) && isEnabled,
  });

  const approve = useMutation({
    mutationFn: (entryId: string) => api.post(`/approvals/${entryId}/approve`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.pending(activeBranchId || 'default') }),
  });

  const reject = useMutation({
    mutationFn: ({ entryId, reason }: { entryId: string; reason: string }) =>
      api.post(`/approvals/${entryId}/reject`, { reason }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.pending(activeBranchId || 'default') }),
  });

  return { pending, approve, reject };
}
