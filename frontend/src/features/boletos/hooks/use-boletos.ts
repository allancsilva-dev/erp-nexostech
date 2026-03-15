'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useBranch } from '@/hooks/use-branch';

export function useBoletos() {
  const { activeBranchId } = useBranch();
  return useQuery({
    queryKey: ['boletos', activeBranchId],
    queryFn: () => api.get('/boletos'),
    enabled: Boolean(activeBranchId),
  });
}
