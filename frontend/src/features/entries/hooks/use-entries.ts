'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { v4 as uuid } from 'uuid';
import type { PaginatedResponse } from '@/lib/api-types';
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

  return useMutation({
    mutationFn: ({ entryId, ...dto }: PayEntryInput & { entryId: string }) =>
      api.post<Payment>(`/entries/${entryId}/pay`, dto, uuid()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.entries.all(activeBranchId || 'default') });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(activeBranchId || 'default') });
      toast.success('Pagamento registrado');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
