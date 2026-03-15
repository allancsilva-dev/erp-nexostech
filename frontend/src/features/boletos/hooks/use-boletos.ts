'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useBranch } from '@/hooks/use-branch';
import { queryKeys } from '@/lib/query-keys';

export function useBoletos() {
  const { activeBranchId } = useBranch();
  return useQuery({
    queryKey: queryKeys.boletos.list(activeBranchId || 'default'),
    queryFn: () => api.get('/boletos'),
    enabled: Boolean(activeBranchId),
  });
}
