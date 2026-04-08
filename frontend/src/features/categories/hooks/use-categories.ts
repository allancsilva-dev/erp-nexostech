'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useBranch } from '@/hooks/use-branch';
import type { Category } from '@/features/categories/types/category.types';
import { queryKeys } from '@/lib/query-keys';

export function useCategories(type?: 'PAYABLE' | 'RECEIVABLE') {
  const { activeBranchId } = useBranch();

  return useQuery({
    queryKey: queryKeys.categories.tree(activeBranchId!, type),
    queryFn: ({ signal }) => api
      .get<Category[]>('/categories', {}, { signal, branchId: activeBranchId! })
      .then((res) => res.data),
    enabled: Boolean(activeBranchId),
    staleTime: 5 * 60 * 1000,
    select: type
      ? (allCategories: Category[]) => allCategories.filter((c) => c.type === type)
      : undefined,
  });
}
