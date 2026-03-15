'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useBranch } from '@/hooks/use-branch';
import { queryKeys } from '@/lib/query-keys';

export function useCollectionRules() {
  const { activeBranchId } = useBranch();

  return useQuery({
    queryKey: queryKeys.settings.collectionRules(activeBranchId || 'default'),
    queryFn: () => api.get('/collection-rules'),
    enabled: Boolean(activeBranchId),
  });
}
