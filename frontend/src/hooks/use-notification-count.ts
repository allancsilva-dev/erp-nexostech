'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { fetchNotificationCount } from '@/lib/api/notifications';
import { queryKeys } from '@/lib/query-keys';

export function useNotificationCount() {
  const user = useAuth();
  const userId = user?.id ?? null;
  const key = userId
    ? queryKeys.notifications.count(userId)
    : (['notifications', 'disabled'] as const);

  const q = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => fetchNotificationCount(signal),
    enabled: !!userId,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 25_000,
    retry: 1,
  });

  return { unreadCount: q.data?.unread_count ?? 0 };
}
