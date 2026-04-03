'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { v4 as uuid } from 'uuid';
import { showUnknownError } from '@/components/ui/error-toast';
import { api } from '@/lib/api-client';
import { useBranch } from '@/hooks/use-branch';
import { queryKeys } from '@/lib/query-keys';

export interface TransferFilters {
  startDate?: string;
  endDate?: string;
  accountId?: string;
}

export function useTransfers(filters?: TransferFilters) {
  const { activeBranchId } = useBranch();

  return useQuery({
    queryKey: [
      'transfers',
      activeBranchId || 'default',
      filters?.startDate || '',
      filters?.endDate || '',
      filters?.accountId || '',
    ] as const,
    queryFn: () =>
      api.get('/transfers', {
        startDate: filters?.startDate,
        endDate: filters?.endDate,
        accountId: filters?.accountId,
      }),
    enabled: Boolean(activeBranchId),
  });
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();
  const { activeBranchId } = useBranch();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/transfers', payload, uuid()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.list(activeBranchId || 'default') });
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.bankAccounts(activeBranchId || 'default') });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(activeBranchId || 'default') });
      toast.success('Transferencia registrada com sucesso');
    },
    onError: (error: unknown) => {
      showUnknownError(error);
    },
  });
}
