'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useBranch } from '@/hooks/use-branch';
import { queryKeys } from '@/lib/query-keys';

export function useAuditLogs() {
  const { activeBranchId } = useBranch();
  return useQuery({
    queryKey: queryKeys.auditLogs.list(activeBranchId || 'default'),
    queryFn: () => api.get('/audit-logs'),
    enabled: Boolean(activeBranchId),
  });
}
