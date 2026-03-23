'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
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

  const history = useQuery({
    queryKey: ['approvals', 'history', activeBranchId] as const,
    queryFn: () => api.get<ApprovalHistoryItem[]>('/approvals/history'),
    enabled: Boolean(activeBranchId) && isEnabled,
  });

  const approve = useMutation({
    mutationFn: (entryId: string) => api.post(`/approvals/${entryId}/approve`),
    onSuccess: () => {
      toast.success('Lancamento aprovado com sucesso');
      void queryClient.invalidateQueries({ queryKey: queryKeys.approvals.pending(activeBranchId || 'default') });
      void queryClient.invalidateQueries({ queryKey: ['approvals', 'history', activeBranchId] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Erro inesperado. Tente novamente.'));
      console.error('[approvals:approve]', error);
    },
  });

  const reject = useMutation({
    mutationFn: ({ entryId, reason }: { entryId: string; reason: string }) =>
      api.post(`/approvals/${entryId}/reject`, { reason }),
    onSuccess: () => {
      toast.success('Lancamento rejeitado com sucesso');
      void queryClient.invalidateQueries({ queryKey: queryKeys.approvals.pending(activeBranchId || 'default') });
      void queryClient.invalidateQueries({ queryKey: ['approvals', 'history', activeBranchId] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Erro inesperado. Tente novamente.'));
      console.error('[approvals:reject]', error);
    },
  });

  const batchApprove = useMutation({
    mutationFn: (entryIds: string[]) => api.post('/approvals/batch-approve', { entryIds }),
    onSuccess: () => {
      toast.success('Lancamentos aprovados em lote');
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.pending(activeBranchId || 'default') });
      queryClient.invalidateQueries({ queryKey: ['approvals', 'history', activeBranchId] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Erro inesperado. Tente novamente.'));
      console.error('[approvals:batch-approve]', error);
    },
  });

  return { pending, history, approve, reject, batchApprove };
}
