'use client';

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage as getUiErrorMessage, showUnknownError } from '@/components/ui/error-toast';
import { api } from '@/lib/api-client';
import { useBranch } from '@/hooks/use-branch';
import { queryKeys } from '@/lib/query-keys';

type ReconciliationStatus =
  | 'UNMATCHED'
  | 'SUGGESTED'
  | 'RECONCILED'
  | 'DIVERGENT';

interface ReconciliationItemApi {
  id: string;
  batchId: string;
  paymentId: string;
  entryId: string;
  amount: string;
  paymentDate: string;
  reconciled: boolean;
  createdAt?: string;
  status?: ReconciliationStatus;
}

interface EntryListItem {
  id: string;
  description: string;
  amount: string;
  issueDate: string;
  dueDate: string;
  status: string;
}

interface ImportedBatch {
  id: string;
  batchId?: string;
  branchId: string;
  bankAccountId: string;
  startDate: string;
  endDate: string;
  createdBy: string;
  createdAt: string;
  importedCount: number;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return getUiErrorMessage(error, fallback);
}

interface ReconciliationUiState {
  activeBatchId: string | null;
  selectedStatementId: string | null;
  selectedEntryId: string | null;
}

interface ImportStatementParams {
  file: File;
  bankAccountId: string;
  startDate?: string;
  endDate?: string;
}

const UI_STATE_QUERY_KEY = ['reconciliation', 'ui-state'] as const;

const DEFAULT_UI_STATE: ReconciliationUiState = {
  activeBatchId: null,
  selectedStatementId: null,
  selectedEntryId: null,
};

function monthStartIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function deriveStatus(item: ReconciliationItemApi): ReconciliationStatus {
  if (item.status) {
    return item.status;
  }

  if (item.reconciled) {
    return 'RECONCILED';
  }

  if (item.entryId) {
    return 'SUGGESTED';
  }

  return 'UNMATCHED';
}

export function useReconciliation() {
  const { activeBranchId } = useBranch();
  const queryClient = useQueryClient();

  const uiStateQuery = useQuery({
    queryKey: UI_STATE_QUERY_KEY,
    queryFn: async (): Promise<ReconciliationUiState> => DEFAULT_UI_STATE,
    initialData: DEFAULT_UI_STATE,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const state = uiStateQuery.data;

  const pending = useQuery({
    queryKey: queryKeys.reconciliation.all(activeBranchId!),
    queryFn: ({ signal }) =>
      api.get<ReconciliationItemApi[]>('/reconciliation/pending', {}, { signal, branchId: activeBranchId! }),
    enabled: Boolean(activeBranchId),
    staleTime: 30_000,
  });

  const batchItems = useQuery({
    queryKey: ['reconciliation', 'batch', state.activeBatchId, activeBranchId] as const,
    queryFn: ({ signal }) =>
      api.get<ReconciliationItemApi[]>(
        `/reconciliation/${state.activeBatchId}`,
        {},
        { signal, branchId: activeBranchId! },
      ),
    enabled: Boolean(activeBranchId && state.activeBatchId),
    staleTime: 10_000,
  });

  const entries = useQuery({
    queryKey: queryKeys.entries.list(activeBranchId!, { status: 'PENDING' }),
    queryFn: ({ signal }) =>
      api.getList<EntryListItem>(
        '/entries',
        { status: 'PENDING', pageSize: 100 },
        { signal, branchId: activeBranchId! },
      ),
    enabled: Boolean(activeBranchId),
    staleTime: 30_000,
  });

  const importBatch = useMutation({
    mutationFn: async ({ file, bankAccountId, startDate, endDate }: ImportStatementParams) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bankAccountId', bankAccountId);
      formData.append('startDate', startDate ?? monthStartIso());
      formData.append('endDate', endDate ?? todayIso());

      const response = await api.postForm<ImportedBatch>('/reconciliation/import', formData);
      return response.data;
    },
    onSuccess: (batch) => {
      const batchId = batch.batchId ?? batch.id;

      if (!batchId) {
        toast.error('Importacao falhou: servidor nao retornou ID do lote.');
        return;
      }

      queryClient.setQueryData<ReconciliationUiState>(UI_STATE_QUERY_KEY, (previous) => ({
        ...(previous ?? DEFAULT_UI_STATE),
        activeBatchId: batchId,
        selectedStatementId: null,
        selectedEntryId: null,
      }));

      void queryClient.invalidateQueries({
        queryKey: ['reconciliation', 'batch', batchId, activeBranchId],
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.reconciliation.all(activeBranchId!),
      });

      toast.success('Extrato importado com sucesso');
    },
    onError: (error: unknown) => {
      showUnknownError(error);
      console.error('[reconciliation:import]', error);
    },
  });

  const confirmMatchMutation = useMutation({
    mutationFn: async ({ statementId, entryId }: { statementId: string; entryId: string }) => {
      await api.post('/reconciliation/match', {
        itemId: statementId,
        entryId,
      });
    },
    onSuccess: () => {
      if (state.activeBatchId) {
        void queryClient.invalidateQueries({
          queryKey: ['reconciliation', 'batch', state.activeBatchId, activeBranchId],
        });
      }
      void queryClient.invalidateQueries({
        queryKey: queryKeys.reconciliation.all(activeBranchId!),
      });
    },
  });

  const rejectMatchMutation = useMutation({
    mutationFn: async ({ statementId }: { statementId: string }) => {
      await api.post('/reconciliation/match', {
        itemId: statementId,
      });
    },
    onSuccess: () => {
      if (state.activeBatchId) {
        void queryClient.invalidateQueries({
          queryKey: ['reconciliation', 'batch', state.activeBatchId, activeBranchId],
        });
      }
      void queryClient.invalidateQueries({
        queryKey: queryKeys.reconciliation.all(activeBranchId!),
      });
    },
  });

  const undoBatchMutation = useMutation({
    mutationFn: async ({ batchId }: { batchId: string }) => {
      await api.delete(`/reconciliation/${batchId}`);
    },
    onSuccess: () => {
      queryClient.setQueryData<ReconciliationUiState>(UI_STATE_QUERY_KEY, (previous) => ({
        ...(previous ?? DEFAULT_UI_STATE),
        activeBatchId: null,
        selectedStatementId: null,
        selectedEntryId: null,
      }));

      void queryClient.invalidateQueries({
        queryKey: queryKeys.reconciliation.all(activeBranchId!),
      });
    },
  });

  const selectStatement = useCallback((id: string | null) => {
    queryClient.setQueryData<ReconciliationUiState>(UI_STATE_QUERY_KEY, (previous) => ({
      ...(previous ?? DEFAULT_UI_STATE),
      selectedStatementId: id,
    }));
  }, [queryClient]);

  const selectEntry = useCallback((id: string | null) => {
    queryClient.setQueryData<ReconciliationUiState>(UI_STATE_QUERY_KEY, (previous) => ({
      ...(previous ?? DEFAULT_UI_STATE),
      selectedEntryId: id,
    }));
  }, [queryClient]);

  const reset = useCallback(() => {
    queryClient.setQueryData<ReconciliationUiState>(UI_STATE_QUERY_KEY, DEFAULT_UI_STATE);
  }, [queryClient]);

  const items = useMemo(() => {
    const source = state.activeBatchId
      ? (batchItems.data?.data ?? [])
      : (pending.data?.data ?? []);

    return source.map((item) => ({
      ...item,
      status: deriveStatus(item),
    }));
  }, [batchItems.data?.data, pending.data?.data, state.activeBatchId]);

  const actions = useMemo(
    () => ({
      selectStatement,
      selectEntry,
      reset,
      setActiveBatchId: (batchId: string | null) => {
        queryClient.setQueryData<ReconciliationUiState>(UI_STATE_QUERY_KEY, (previous) => ({
          ...(previous ?? DEFAULT_UI_STATE),
          activeBatchId: batchId,
          selectedStatementId: null,
          selectedEntryId: null,
        }));
      },
      importStatement: async (file: File, bankAccountId: string) => {
        await importBatch.mutateAsync({ file, bankAccountId });
      },
      fetchBatchItems: async (batchId: string) => {
        queryClient.setQueryData<ReconciliationUiState>(UI_STATE_QUERY_KEY, (previous) => ({
          ...(previous ?? DEFAULT_UI_STATE),
          activeBatchId: batchId,
        }));

        await queryClient.invalidateQueries({
          queryKey: ['reconciliation', 'batch', batchId, activeBranchId],
        });
      },
      confirmMatch: async (statementId: string, entryId: string) => {
        await confirmMatchMutation.mutateAsync({ statementId, entryId });
      },
      rejectMatch: async (statementId: string) => {
        await rejectMatchMutation.mutateAsync({ statementId });
      },
      undoBatch: async (batchId: string) => {
        await undoBatchMutation.mutateAsync({ batchId });
      },
    }),
    [
      activeBranchId,
      confirmMatchMutation,
      importBatch,
      queryClient,
      rejectMatchMutation,
      reset,
      selectEntry,
      selectStatement,
      undoBatchMutation,
    ],
  );

  return {
    state,
    items,
    entries: entries.data?.data ?? [],
    isLoading: pending.isLoading || batchItems.isLoading || entries.isLoading,
    isMutating:
      importBatch.isPending ||
      confirmMatchMutation.isPending ||
      rejectMatchMutation.isPending ||
      undoBatchMutation.isPending,
    error:
      pending.error?.message ??
      batchItems.error?.message ??
      entries.error?.message ??
      (importBatch.error ? getErrorMessage(importBatch.error, '') : null) ??
      (confirmMatchMutation.error ? getErrorMessage(confirmMatchMutation.error, '') : null) ??
      (rejectMatchMutation.error ? getErrorMessage(rejectMatchMutation.error, '') : null) ??
      (undoBatchMutation.error ? getErrorMessage(undoBatchMutation.error, '') : null) ??
      null,
    ...actions,
  };
}
