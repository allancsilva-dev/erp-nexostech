'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { v4 as uuid } from 'uuid';
import { useMemo } from 'react';
import Decimal from 'decimal.js';
import { showUnknownError } from '@/components/ui/error-toast';
import type { ApiResponse, PaginatedResponse } from '@/lib/api-types';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useBranch } from '@/hooks/use-branch';
import type { CreateEntryInput, PayEntryInput } from '@/features/entries/types/entry.schemas';
import type { Entry, EntryFilters, EntryStatus, Payment } from '@/features/entries/types/entry.types';

export function useEntries(filters: EntryFilters) {
  const { activeBranchId } = useBranch();

  const normalizedFilters = useMemo(() => ({
    page:       filters.page      ?? 1,
    pageSize:   filters.pageSize  ?? 10,
    type:       filters.type,
    status:     filters.status,
    categoryId: filters.categoryId,
    startDate:  filters.startDate,
    endDate:    filters.endDate,
    search:     filters.search,
    sortBy:     filters.sortBy    ?? 'dueDate',
    sortOrder:  filters.sortOrder ?? 'desc',
  }), [
    filters.page,
    filters.pageSize,
    filters.type,
    filters.status,
    filters.categoryId,
    filters.startDate,
    filters.endDate,
    filters.search,
    filters.sortBy,
    filters.sortOrder,
  ]);

    return useQuery<PaginatedResponse<Entry>>({
    queryKey: queryKeys.entries.list(activeBranchId!, normalizedFilters),
    queryFn: ({ signal }) =>
      api.getList<Entry>('/entries', normalizedFilters as Record<string, unknown>, {
        signal,
        branchId: activeBranchId!,
      }),
    enabled: !!activeBranchId,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useEntry(id: string) {
  const { activeBranchId } = useBranch();

  return useQuery({
    queryKey: queryKeys.entries.detail(activeBranchId!, id),
    queryFn: ({ signal }) =>
      api.get<Entry>(`/entries/${id}`, {}, { signal, branchId: activeBranchId! }),
    enabled: !!id && !!activeBranchId,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useEntryPayments(entryId: string) {
  const { activeBranchId } = useBranch();

  return useQuery({
    queryKey: queryKeys.entries.payments(activeBranchId!, entryId),
    queryFn: ({ signal }) =>
      api.getList<Payment>(`/entries/${entryId}/payments`, {}, { signal, branchId: activeBranchId! }),
    enabled: !!entryId && !!activeBranchId,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreateEntry() {
  const queryClient = useQueryClient();
  const { activeBranchId } = useBranch();
  const idempotencyKey = useMemo(() => uuid(), []);

  return useMutation({
    mutationFn: (dto: CreateEntryInput) => {
      if (!activeBranchId) throw new Error('[useCreateEntry] Branch não definida');
      return api.post<Entry>('/entries', dto, { idempotencyKey, branchId: activeBranchId });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.entries.all(activeBranchId!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(activeBranchId!) });
      void queryClient.invalidateQueries({ queryKey: ['approvals', activeBranchId] });
      void queryClient.invalidateQueries({ queryKey: ['reports', activeBranchId] });
    },
    onError: (error: unknown) => {
      showUnknownError(error);
    },
  });
}

export function usePayEntry() {
  const queryClient = useQueryClient();
  const { activeBranchId } = useBranch();
  const idempotencyKey = useMemo(() => uuid(), []);

  return useMutation({
    mutationFn: ({ entryId, ...dto }: PayEntryInput & { entryId: string }) => {
      if (!activeBranchId) throw new Error('[usePayEntry] Branch não definida');
      return api.post<Payment>(`/entries/${entryId}/pay`, dto, { idempotencyKey, branchId: activeBranchId });
    },
    onMutate: async ({ entryId, amount }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.entries.detail(activeBranchId!, entryId) });

      const previousDetail = queryClient.getQueryData<ApiResponse<Entry>>(
        queryKeys.entries.detail(activeBranchId!, entryId),
      );

      queryClient.setQueryData<ApiResponse<Entry>>(
        queryKeys.entries.detail(activeBranchId!, entryId),
        (old) => {
          if (!old?.data) return old;

          const paying    = new Decimal(amount);
          const remaining = new Decimal(old.data.remainingBalance);
          const optimisticStatus: EntryStatus = paying.gte(remaining) ? 'PAID' : 'PARTIAL';

          return {
            ...old,
            data: {
              ...old.data,
              status:           optimisticStatus,
              paidAmount:       paying.plus(new Decimal(old.data.paidAmount ?? '0')).toFixed(2),
              remainingBalance: remaining.minus(paying).toFixed(2),
            },
          };
        },
      );

      return { previousDetail, entryId };
    },
    onSuccess: () => {
      toast.success('Pagamento registrado');
    },
    onError: (error: unknown, _variables, context) => {
      if (context?.previousDetail && context.entryId) {
        queryClient.setQueryData(
          queryKeys.entries.detail(activeBranchId!, context.entryId),
          context.previousDetail,
        );
      }
      showUnknownError(error);
    },
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.entries.detail(activeBranchId!, variables.entryId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.entries.payments(activeBranchId!, variables.entryId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.entries.all(activeBranchId!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(activeBranchId!) });
      void queryClient.invalidateQueries({ queryKey: ['approvals', activeBranchId] });
      void queryClient.invalidateQueries({ queryKey: ['reports', activeBranchId] });
    },
  });
}

export function useUpdateEntry() {
  const queryClient = useQueryClient();
  const { activeBranchId } = useBranch();

  return useMutation({
    mutationFn: ({ entryId, ...dto }: CreateEntryInput & { entryId: string }) => {
      if (!activeBranchId) throw new Error('[useUpdateEntry] Branch não definida');
      return api.put<Entry>(`/entries/${entryId}`, dto, { branchId: activeBranchId });
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.entries.detail(activeBranchId!, variables.entryId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.entries.all(activeBranchId!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(activeBranchId!) });
      void queryClient.invalidateQueries({ queryKey: ['reports', activeBranchId] });
      toast.success('Lançamento atualizado com sucesso');
    },
    onError: (error: unknown) => {
      showUnknownError(error);
    },
  });
}

export function useCancelEntry() {
  const queryClient = useQueryClient();
  const { activeBranchId } = useBranch();
  const idempotencyKey = useMemo(() => uuid(), []);

  return useMutation({
    mutationFn: ({ entryId, reason }: { entryId: string; reason: string }) => {
      if (!activeBranchId) throw new Error('[useCancelEntry] Branch não definida');
      return api.post<void>(`/entries/${entryId}/cancel`, { reason }, { idempotencyKey, branchId: activeBranchId });
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.entries.detail(activeBranchId!, variables.entryId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.entries.all(activeBranchId!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(activeBranchId!) });
      void queryClient.invalidateQueries({ queryKey: ['approvals', activeBranchId] });
      void queryClient.invalidateQueries({ queryKey: ['reports', activeBranchId] });
      toast.success('Lançamento cancelado');
    },
    onError: (error: unknown) => {
      showUnknownError(error);
    },
  });
}

export function useRefundPayment() {
  const queryClient = useQueryClient();
  const { activeBranchId } = useBranch();
  const idempotencyKey = useMemo(() => uuid(), []);

  return useMutation({
    mutationFn: ({ entryId, paymentId, reason }: {
      entryId: string;
      paymentId: string;
      reason: string;
    }) => {
      if (!activeBranchId) throw new Error('[useRefundPayment] Branch não definida');
      return api.post<void>(
        `/entries/${entryId}/refund`,
        { paymentId, reason },
        { idempotencyKey, branchId: activeBranchId },
      );
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.entries.detail(activeBranchId!, variables.entryId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.entries.payments(activeBranchId!, variables.entryId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.entries.all(activeBranchId!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(activeBranchId!) });
      void queryClient.invalidateQueries({ queryKey: ['approvals', activeBranchId] });
      void queryClient.invalidateQueries({ queryKey: ['reports', activeBranchId] });
      toast.success('Pagamento estornado');
    },
    onError: (error: unknown) => {
      showUnknownError(error);
    },
  });
}