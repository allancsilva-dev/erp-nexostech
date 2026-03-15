'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useBranch } from '@/hooks/use-branch';

export function useCollectionRules() {
  const { activeBranchId } = useBranch();

  return useQuery({
    queryKey: ['collection-rules', activeBranchId],
    queryFn: () => api.get('/collection-rules'),
    enabled: Boolean(activeBranchId),
  });
}
