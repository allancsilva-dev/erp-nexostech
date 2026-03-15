'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { v4 as uuid } from 'uuid';
import type { ApiResponse, PaginatedResponse } from '@/lib/api-types';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useBranch } from '@/hooks/use-branch';
import type { CreateEntryInput, PayEntryInput } from '@/features/entries/types/entry.schemas';
import type { Entry, EntryFilters, Payment } from '@/features/entries/types/entry.types';

export function useEntries(filters: EntryFilters) {
  const { activeBranchId } = useBranch();

  return useQuery({
    queryKey: queryKeys.entries.list(activeBranchId || 'default', filters),
    queryFn: () => api.getList<Entry>('/entries', filters as Record<string, unknown>),
    enabled: Boolean(activeBranchId),
    placeholderData: keepPreviousData as (previousData: PaginatedResponse<Entry> | undefined) => PaginatedResponse<Entry> | undefined,
  });
}

export function useEntry(id: string) {
  const { activeBranchId } = useBranch();

  return useQuery({
    queryKey: queryKeys.entries.detail(activeBranchId || 'default', id),
    queryFn: () => api.get<Entry>(`/entries/${id}`),
    enabled: Boolean(id && activeBranchId),
  });
}

export function useEntryPayments(entryId: string) {
  const { activeBranchId } = useBranch();

  return useQuery({
    queryKey: queryKeys.entries.payments(activeBranchId || 'default', entryId),
    queryFn: () => api.getList<Payment>(`/entries/${entryId}/payments`),
    enabled: Boolean(entryId && activeBranchId),
  });
}

export function useCreateEntry() {
  const queryClient = useQueryClient();
  const { activeBranchId } = useBranch();

  return useMutation({
    mutationFn: (dto: CreateEntryInput) => api.post<Entry>('/entries', dto, uuid()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.entries.all(activeBranchId || 'default') });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(activeBranchId || 'default') });
      toast.success('Lancamento criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function usePayEntry() {
  const queryClient = useQueryClient();
  const { activeBranchId } = useBranch();
  const branchId = activeBranchId || 'default';

  return useMutation({
    mutationFn: ({ entryId, ...dto }: PayEntryInput & { entryId: string }) =>
      api.post<Payment>(`/entries/${entryId}/pay`, dto, uuid()),
    onMutate: async ({ entryId, amount }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.entries.detail(branchId, entryId) });

      const previousDetail = queryClient.getQueryData<ApiResponse<Entry>>(queryKeys.entries.detail(branchId, entryId));

      queryClient.setQueryData<ApiResponse<Entry>>(queryKeys.entries.detail(branchId, entryId), (old) => {
        if (!old?.data) {
          return old;
        }

        return {
          ...old,
          data: {
            ...old.data,
            status: 'PAID',
            paidAmount: amount,
          },
        };
      });

      return { previousDetail, entryId };
    },
    onSuccess: () => {
      toast.success('Pagamento registrado');
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousDetail && context.entryId) {
        queryClient.setQueryData(queryKeys.entries.detail(branchId, context.entryId), context.previousDetail);
      }
      toast.error(error.message);
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.entries.detail(branchId, variables.entryId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.entries.all(branchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(branchId) });
    },
  });
}

export function useUpdateEntry() {
  const queryClient = useQueryClient();
  const { activeBranchId } = useBranch();
  const branchId = activeBranchId || 'default';

  return useMutation({
    mutationFn: ({ entryId, ...dto }: CreateEntryInput & { entryId: string }) =>
      api.put<Entry>(`/entries/${entryId}`, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.entries.detail(branchId, variables.entryId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.entries.all(branchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(branchId) });
      toast.success('Lancamento atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCancelEntry() {
  const queryClient = useQueryClient();
  const { activeBranchId } = useBranch();
  const branchId = activeBranchId || 'default';

  return useMutation({
    mutationFn: ({ entryId, reason }: { entryId: string; reason: string }) =>
      api.post<void>(`/entries/${entryId}/cancel`, { reason }, uuid()),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.entries.detail(branchId, variables.entryId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.entries.all(branchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(branchId) });
      toast.success('Lancamento cancelado');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRefundPayment() {
  const queryClient = useQueryClient();
  const { activeBranchId } = useBranch();
  const branchId = activeBranchId || 'default';

  return useMutation({
    mutationFn: ({ entryId, reason }: { entryId: string; reason: string }) =>
      api.post<void>(`/entries/${entryId}/refund`, { reason }, uuid()),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.entries.detail(branchId, variables.entryId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.entries.payments(branchId, variables.entryId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.entries.all(branchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(branchId) });
      toast.success('Pagamento estornado');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
