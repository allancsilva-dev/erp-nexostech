'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

interface UserPermissions {
  permissions: string[];
  isAdmin: boolean;
}

export function usePermissions() {
  const { data } = useQuery({
    queryKey: queryKeys.permissions.me,
    queryFn: () => api.get<UserPermissions>('/users/me/permissions'),
    staleTime: 5 * 60 * 1000,
  });

  const hasPermission = (code: string): boolean => {
    if (data?.data.isAdmin) {
      return true;
    }
    return data?.data.permissions.includes(code) ?? false;
  };

  const hasAnyPermission = (codes: string[]): boolean => codes.some(hasPermission);

  return {
    hasPermission,
    hasAnyPermission,
    isAdmin: data?.data.isAdmin ?? false,
  };
}
