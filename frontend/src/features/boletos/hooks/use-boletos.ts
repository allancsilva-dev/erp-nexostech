'use client';

import { useQuery } from '@tanstack/react-query';
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
