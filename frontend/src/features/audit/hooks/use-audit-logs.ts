'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useBranch } from '@/hooks/use-branch';

export function useAuditLogs() {
  const { activeBranchId } = useBranch();
  return useQuery({
    queryKey: ['audit-logs', activeBranchId],
    queryFn: () => api.get('/audit-logs'),
    enabled: Boolean(activeBranchId),
  });
}
