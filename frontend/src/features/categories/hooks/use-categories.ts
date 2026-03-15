'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useBranch } from '@/hooks/use-branch';
import type { Category } from '@/features/categories/types/category.types';

export function useCategories(type?: 'RECEITA' | 'DESPESA') {
  const { activeBranchId } = useBranch();
  return useQuery({
    queryKey: ['categories', activeBranchId, type],
    queryFn: () => api.get<Category[]>('/categories/tree', type ? { type } : undefined),
    enabled: Boolean(activeBranchId),
  });
}
