import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

type Permission = {
  code: string;
  module: string;
  description?: string;
};

export type PermissionsByModule = Record<string, Permission[]>;

export function usePermissions() {
  return useQuery<PermissionsByModule>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const res = await api.get<PermissionsByModule>('/permissions');
      // ApiResponse<T> has shape { data: T }
      return res.data ?? {};
    },
  });
}

export default usePermissions;
