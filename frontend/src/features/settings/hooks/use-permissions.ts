import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function usePermissions() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const res = await api.get<string[]>('/permissions');
      const data = res.data;

      if (Array.isArray(data)) {
        if (data.length === 0) return [];
        if (typeof data[0] === 'string') return data as string[];
        const arr = data as unknown as Array<{ code: string }>;
        return arr.map((p) => p.code);
      }

      return [];
    },
  });
}

export default usePermissions;
