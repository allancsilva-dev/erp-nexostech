'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useBranch } from '@/hooks/use-branch';
import type { Category } from '@/features/categories/types/category.types';
import { queryKeys } from '@/lib/query-keys';

export function useCategories(type?: 'PAYABLE' | 'RECEIVABLE') {
  const { activeBranchId } = useBranch();

  return useQuery({
    queryKey: queryKeys.categories.tree(activeBranchId || 'default'),
    queryFn: async () => {
      const res = await api.get<Category[]>('/categories');
      return res.data;
    },
    enabled: Boolean(activeBranchId),
    select: (allCategories: Category[]) => (
      type ? allCategories.filter((c) => c.type === type) : allCategories
    ),
  });
}
