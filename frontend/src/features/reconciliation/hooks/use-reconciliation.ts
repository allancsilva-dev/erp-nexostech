'use client';

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  branchId: string;
  bankAccountId: string;
  startDate: string;
  endDate: string;
  createdBy: string;
  createdAt: string;
  importedCount: number;
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
    queryKey: ['reconciliation', 'pending', activeBranchId || 'default'] as const,
    queryFn: () => api.get<ReconciliationItemApi[]>('/reconciliation/pending'),
    enabled: Boolean(activeBranchId),
    staleTime: 30_000,
  });

  const batchItems = useQuery({
    queryKey: ['reconciliation', 'batch', state.activeBatchId || 'none', activeBranchId || 'default'] as const,
    queryFn: () => api.get<ReconciliationItemApi[]>(`/reconciliation/${state.activeBatchId}`),
    enabled: Boolean(activeBranchId && state.activeBatchId),
    staleTime: 10_000,
  });

  const entries = useQuery({
    queryKey: queryKeys.entries.all(activeBranchId || 'default'),
    queryFn: () => api.get<EntryListItem[]>('/entries'),
    enabled: Boolean(activeBranchId),
    staleTime: 30_000,
  });

  const importBatch = useMutation({
    mutationFn: async ({ file, bankAccountId, startDate, endDate }: ImportStatementParams) => {
      void file;
      const response = await api.post<ImportedBatch>('/reconciliation/import', {
        bankAccountId,
        startDate: startDate ?? monthStartIso(),
        endDate: endDate ?? todayIso(),
      });

      return response.data;
    },
    onSuccess: (batch) => {
      queryClient.setQueryData<ReconciliationUiState>(UI_STATE_QUERY_KEY, (previous) => ({
        ...(previous ?? DEFAULT_UI_STATE),
        activeBatchId: batch.id,
        selectedStatementId: null,
        selectedEntryId: null,
      }));

      void queryClient.invalidateQueries({
        queryKey: ['reconciliation', 'batch', batch.id, activeBranchId || 'default'],
      });
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
          queryKey: ['reconciliation', 'batch', state.activeBatchId, activeBranchId || 'default'],
        });
      }
      void queryClient.invalidateQueries({
        queryKey: ['reconciliation', 'pending', activeBranchId || 'default'],
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
          queryKey: ['reconciliation', 'batch', state.activeBatchId, activeBranchId || 'default'],
        });
      }
      void queryClient.invalidateQueries({
        queryKey: ['reconciliation', 'pending', activeBranchId || 'default'],
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
        queryKey: ['reconciliation', 'pending', activeBranchId || 'default'],
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
          queryKey: ['reconciliation', 'batch', batchId, activeBranchId || 'default'],
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
      importBatch.error?.message ??
      confirmMatchMutation.error?.message ??
      rejectMatchMutation.error?.message ??
      undoBatchMutation.error?.message ??
      null,
    ...actions,
  };
}
