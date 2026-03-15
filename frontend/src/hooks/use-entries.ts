'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { entriesApi, type EntryFilters } from '@/lib/api/entries-api';

export function useEntries(filters: EntryFilters) {
  return useQuery({
    queryKey: ['entries', filters],
    queryFn: () => entriesApi.list(filters),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
