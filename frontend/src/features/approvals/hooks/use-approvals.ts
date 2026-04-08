'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { showUnknownError } from '@/components/ui/error-toast';
import { api } from '@/lib/api-client';
import { useBranch } from '@/hooks/use-branch';
import { queryKeys } from '@/lib/query-keys';

interface PendingApproval {
  entryId: string;
  documentNumber: string;
  amount: string;
  dueDate: string;
  status: string;
  categoryName: string | null;
  contactName: string | null;
}

interface ApprovalHistoryItem {
  id: string;
  entryId: string;
  userId: string;
  action: string;
  notes: string | null;
  createdAt: string;
}

interface UseApprovalsOptions {
  enabled?: {
    pending?: boolean;
    history?: boolean;
  };
}

export function useApprovals(options?: UseApprovalsOptions) {
  const { activeBranchId } = useBranch();
  const queryClient = useQueryClient();

  const pendingEnabled = options?.enabled?.pending ?? true;
  const historyEnabled = options?.enabled?.history ?? false;

  const pending = useQuery({
    queryKey: queryKeys.approvals.pending(activeBranchId!),
    queryFn: ({ signal }) =>
      api.get<PendingApproval[]>('/approvals/pending', {}, { signal, branchId: activeBranchId! }),
    enabled: !!activeBranchId && pendingEnabled,
    staleTime: 30_000,
  });

  const history = useQuery({
    queryKey: queryKeys.approvals.history(activeBranchId!),
    queryFn: ({ signal }) =>
      api.get<ApprovalHistoryItem[]>('/approvals/history', {}, { signal, branchId: activeBranchId! }),
    enabled: !!activeBranchId && historyEnabled,
    staleTime: 60_000,
  });

  const approve = useMutation({
    mutationFn: (entryId: string) => api.post(`/approvals/${entryId}/approve`),
    onSuccess: () => {
      toast.success('Lançamento aprovado com sucesso');
      void queryClient.invalidateQueries({ queryKey: queryKeys.approvals.pending(activeBranchId!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.approvals.history(activeBranchId!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.entries.all(activeBranchId!) });
    },
    onError: (error: unknown) => {
      showUnknownError(error);
      console.error('[approvals:approve]', error);
    },
  });

  const reject = useMutation({
    mutationFn: ({ entryId, reason }: { entryId: string; reason: string }) =>
      api.post(`/approvals/${entryId}/reject`, { reason }),
    onSuccess: () => {
      toast.success('Lançamento rejeitado');
      void queryClient.invalidateQueries({ queryKey: queryKeys.approvals.pending(activeBranchId!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.approvals.history(activeBranchId!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.entries.all(activeBranchId!) });
    },
    onError: (error: unknown) => {
      showUnknownError(error);
      console.error('[approvals:reject]', error);
    },
  });

  const batchApprove = useMutation({
    mutationFn: (entryIds: string[]) => api.post('/approvals/batch-approve', { entryIds }),
    onSuccess: () => {
      toast.success('Lançamentos aprovados em lote');
      void queryClient.invalidateQueries({ queryKey: queryKeys.approvals.pending(activeBranchId!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.approvals.history(activeBranchId!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.entries.all(activeBranchId!) });
    },
    onError: (error: unknown) => {
      showUnknownError(error);
      console.error('[approvals:batch-approve]', error);
    },
  });

  return { pending, history, approve, reject, batchApprove };
}