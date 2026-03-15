'use client';

import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api/reports-api';

export function useDre(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['reports', 'dre', startDate, endDate],
    queryFn: () => reportsApi.dre(startDate, endDate),
    staleTime: 300_000,
  });
}
