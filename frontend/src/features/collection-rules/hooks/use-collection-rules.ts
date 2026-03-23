'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useBranch } from '@/hooks/use-branch';
import { queryKeys } from '@/lib/query-keys';

export function useCollectionRules() {
  const { activeBranchId } = useBranch();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.settings.collectionRules(activeBranchId || 'default'),
    queryFn: () => api.get('/collection-rules'),
    enabled: Boolean(activeBranchId),
  });

  const saveRuleMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string | null; payload: Record<string, unknown> }) => {
      if (id) {
        await api.put(`/collection-rules/${id}`, payload);
        return;
      }

      await api.post('/collection-rules', payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings.collectionRules(activeBranchId || 'default') });
    },
  });

  return {
    ...query,
    saveRule: async ({ id, payload }: { id: string | null; payload: Record<string, unknown> }) =>
      saveRuleMutation.mutateAsync({ id, payload }),
  };
}

export function useEmailTemplates() {
  const { activeBranchId } = useBranch();
  return useQuery({
    queryKey: ['email-templates', activeBranchId || 'default'] as const,
    queryFn: () => api.get('/email-templates'),
    enabled: Boolean(activeBranchId),
  });
}
