'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useBranch } from '@/hooks/use-branch';
import type { Category } from '@/features/categories/types/category.types';
import { queryKeys } from '@/lib/query-keys';

export function useCategories(type?: 'PAYABLE' | 'RECEIVABLE') {
  const { activeBranchId } = useBranch();
  return useQuery({
    queryKey: queryKeys.categories.tree(activeBranchId || 'default', type),
    queryFn: () => api.get<Category[]>('/categories', type ? { type } : undefined),
    enabled: Boolean(activeBranchId),
  });
}
