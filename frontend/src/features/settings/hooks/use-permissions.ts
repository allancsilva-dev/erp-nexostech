import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

type Permission = { code: string; description?: string };
type PermissionsByModule = Record<string, Permission[]>;

export function usePermissions() {
  return useQuery<PermissionsByModule>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const res = await api.get('/permissions');
      // backend returns { data: { module1: [...], module2: [...] } }
      const payload = res.data as any;
      return payload?.data || {};
    },
  });
}

export default usePermissions;
