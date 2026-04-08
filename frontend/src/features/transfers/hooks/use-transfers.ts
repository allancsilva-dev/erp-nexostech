'use client';

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { v4 as uuid } from 'uuid';
import { showUnknownError } from '@/components/ui/error-toast';
import type { ApiResponse } from '@/lib/api-types';
import { api } from '@/lib/api-client';
import { useBranch } from '@/hooks/use-branch';
import { queryKeys } from '@/lib/query-keys';

export interface TransferFilters {
  startDate?: string;
  endDate?: string;
  accountId?: string;
}

type TransferItem = {
  id: string;
  branchId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  transferDate: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
};

type CreateTransferPayload = {
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  transferDate: string;
  description?: string;
  idempotencyKey?: string;
};

export function useTransfers(filters?: TransferFilters) {
  const { activeBranchId } = useBranch();

  const normalizedFilters = useMemo(
    () => ({
      startDate: filters?.startDate,
      endDate: filters?.endDate,
      accountId: filters?.accountId,
    }),
    [filters?.startDate, filters?.endDate, filters?.accountId],
  );

  return useQuery<ApiResponse<TransferItem[]>>({
    queryKey: queryKeys.transfers.list(activeBranchId!, normalizedFilters),
    queryFn: ({ signal }) =>
      api.get<TransferItem[]>('/transfers', normalizedFilters, {
        signal,
        branchId: activeBranchId!,
      }),
    enabled: Boolean(activeBranchId),
    staleTime: 30_000,
  });
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();
  const { activeBranchId } = useBranch();

  return useMutation({
    mutationFn: ({ idempotencyKey, ...payload }: CreateTransferPayload) => {
      if (!activeBranchId) {
        throw new Error('[useCreateTransfer] Branch não definida');
      }

      return api.post<TransferItem>(
        '/transfers',
        payload,
        { idempotencyKey: idempotencyKey ?? uuid(), branchId: activeBranchId },
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all(activeBranchId!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings.bankAccounts(activeBranchId!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(activeBranchId!) });
      toast.success('Transferência registrada com sucesso');
    },
    onError: (error: unknown) => {
      showUnknownError(error);
    },
  });
}
