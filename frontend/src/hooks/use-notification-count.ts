'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { fetchNotificationCount } from '@/lib/api/notifications';

export function useNotificationCount() {
  const user = useAuth();
  const userId = user?.id;
  const key = ['notifications', 'count', userId];

  const q = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => fetchNotificationCount(signal),
    enabled: Boolean(userId),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 0,
    retry: 1,
  });

  return { unreadCount: q.data?.unread_count ?? 0 };
}
