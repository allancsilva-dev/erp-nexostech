'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '@/lib/api/notifications';
import { queryKeys } from '@/lib/query-keys';
import type { NotificationsResponse } from '@/types/notifications';

interface UseNotificationsOptions {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export function useNotifications(
  opts: UseNotificationsOptions = {},
  queryConfig?: { enabled?: boolean },
) {
  const { page = 1, limit = 20, unreadOnly = false } = opts;
  const user = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  const baseKey = userId
    ? queryKeys.notifications.all(userId)
    : (['notifications', 'disabled'] as const);
  const fullKey = userId
    ? queryKeys.notifications.list(userId, { page, limit, unreadOnly })
    : (['notifications', 'disabled', 'list'] as const);
  const countKey = userId
    ? queryKeys.notifications.count(userId)
    : (['notifications', 'disabled', 'count'] as const);

  const query = useQuery<NotificationsResponse>({
    queryKey: fullKey,
    queryFn: ({ signal }) =>
      fetchNotifications({ page, limit, unread_only: unreadOnly }, signal),
    enabled: Boolean(userId) && (queryConfig?.enabled ?? true),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  // mark as read
  const markMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) {
        return;
      }
      await markNotificationRead(id);
    },
    onMutate: async (id: string) => {
      if (!userId) {
        return { previousData: undefined };
      }

      await queryClient.cancelQueries({ queryKey: baseKey, exact: false });

      const previousData = queryClient.getQueryData<NotificationsResponse>(fullKey);

      queryClient.setQueryData<NotificationsResponse>(fullKey, (old) => {
        if (!old) return { data: [], total: 0, unread_count: 0 } as NotificationsResponse;
        const now = new Date().toISOString();
        let dec = 0;
        const data = old.data.map((n) => {
          if (n.id === id) {
            if (!n.read_at) dec = 1;
            return { ...n, read_at: now };
          }
          return n;
        });
        return { ...old, data, unread_count: Math.max(0, old.unread_count - dec) };
      });

      return { previousData };
    },
    onError: (_err, _vars, context: { previousData?: NotificationsResponse } | undefined) => {
      if (context?.previousData) {
        queryClient.setQueryData(fullKey, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: baseKey, exact: false });
      queryClient.invalidateQueries({ queryKey: countKey });
    },
  });

  // mark all as read
  const markAllMutation = useMutation({
    mutationFn: async () => {
      if (!userId) {
        return;
      }
      await markAllNotificationsRead();
    },
    onMutate: async () => {
      if (!userId) {
        return { previousData: undefined };
      }

      await queryClient.cancelQueries({ queryKey: baseKey, exact: false });
      const previousData = queryClient.getQueryData<NotificationsResponse>(fullKey);

      queryClient.setQueryData<NotificationsResponse>(fullKey, (old) => {
        if (!old) return { data: [], total: 0, unread_count: 0 } as NotificationsResponse;
        const now = new Date().toISOString();
        const data = old.data.map((n) => (n.read_at ? n : { ...n, read_at: now }));
        return { ...old, data, unread_count: 0 };
      });

      return { previousData };
    },
    onError: (_err, _vars, context: { previousData?: NotificationsResponse } | undefined) => {
      if (context?.previousData) {
        queryClient.setQueryData(fullKey, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: baseKey, exact: false });
      queryClient.invalidateQueries({ queryKey: countKey });
    },
  });

  // delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) {
        return;
      }
      await deleteNotification(id);
    },
    retry: 0,
    onMutate: async (id: string) => {
      if (!userId) {
        return { previousData: undefined };
      }

      setDeletingId(id);
      await queryClient.cancelQueries({ queryKey: baseKey, exact: false });
      const previousData = queryClient.getQueryData<NotificationsResponse>(fullKey);

      queryClient.setQueryData<NotificationsResponse>(fullKey, (old) => {
        if (!old) return { data: [], total: 0, unread_count: 0 } as NotificationsResponse;
        const item = old.data.find((n) => n.id === id);
        const wasUnread = item?.read_at === null;
        const data = old.data.filter((n) => n.id !== id);
        return { ...old, data, unread_count: wasUnread ? Math.max(0, old.unread_count - 1) : old.unread_count };
      });

      return { previousData };
    },
    onError: (_err, _vars, context: { previousData?: NotificationsResponse } | undefined) => {
      setDeletingId(null);
      if (context?.previousData) {
        queryClient.setQueryData(fullKey, context.previousData);
      }
    },
    onSettled: () => {
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: baseKey, exact: false });
      queryClient.invalidateQueries({ queryKey: countKey });
    },
  });

  return {
    notifications: query.data?.data ?? [],
    unreadCount: query.data?.unread_count ?? 0,
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    markAsRead: (id: string) => markMutation.mutate(id),
    markAllAsRead: () => markAllMutation.mutate(),
    deleteNotification: (id: string) => deleteMutation.mutate(id),
    isMarkingRead: markMutation.isPending,
    isMarkingAllRead: markAllMutation.isPending,
    isDeleting: deleteMutation.isPending,
    deletingId,
  };
}
