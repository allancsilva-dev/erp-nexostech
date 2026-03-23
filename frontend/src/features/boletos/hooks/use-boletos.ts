'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { v4 as uuid } from 'uuid';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { useBranch } from '@/hooks/use-branch';

export interface BoletoFilters {
  startDate?: string;
  endDate?: string;
  status?: 'PENDENTE' | 'PAGO' | 'CANCELADO' | 'VENCIDO' | '';
  contactId?: string;
}

export function useBoletos(filters?: BoletoFilters) {
  const { activeBranchId } = useBranch();

  return useQuery({
    queryKey: [
      'boletos',
      activeBranchId || 'default',
      filters?.startDate || '',
      filters?.endDate || '',
      filters?.status || '',
      filters?.contactId || '',
    ] as const,
    queryFn: () =>
      api.get('/boletos', {
        startDate: filters?.startDate,
        endDate: filters?.endDate,
        status: filters?.status,
        contactId: filters?.contactId,
      }),
    enabled: Boolean(activeBranchId),
  });
}

export function useGenerateBoleto() {
  const { activeBranchId } = useBranch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId: string) =>
      api.post(`/boletos/${entryId}/generate`, {}, uuid()),
    onSuccess: () => {
      toast.success('Boleto gerado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['boletos', activeBranchId || 'default'] });
      queryClient.invalidateQueries({ queryKey: ['entries', activeBranchId || 'default'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Erro inesperado. Tente novamente.';
      toast.error(message);
      console.error('[boletos:generate]', error);
    },
  });
}
