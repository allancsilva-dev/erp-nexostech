'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi, type FinancialSettings } from '@/lib/api/settings-api';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
    staleTime: 120_000,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: FinancialSettings) => settingsApi.update(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}
