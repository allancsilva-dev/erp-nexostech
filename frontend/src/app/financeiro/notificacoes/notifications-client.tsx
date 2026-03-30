'use client';

import { useEffect } from 'react';
import { useQueryState } from 'nuqs';
import { useNotifications } from '@/hooks/use-notifications';
import { EmptyState } from '@/components/shared/empty-state';
import { NotificationItem } from '@/components/notifications/notification-item';

export default function NotificationsClient() {
  const [filter, setFilter] = useQueryState('filter', { defaultValue: 'all' });
  const [page, setPage] = useQueryState('page', { defaultValue: '1' });

  useEffect(() => {
    void setPage('1');
  }, [filter, setPage]);

  const pageNum = Number(page);

  const { notifications, total, deletingId, isLoading, markAsRead, deleteNotification } = useNotifications({ page: pageNum, limit: 20, unreadOnly: filter === 'unread' }, { enabled: true });

  const totalPages = Math.ceil((total || 0) / 20);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Notificações</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void setFilter('all')}
            className="rounded-md px-3 py-1.5 text-xs"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '0.5px solid var(--border-default)' }}
          >
            Todas
          </button>
          <button
            type="button"
            onClick={() => void setFilter('unread')}
            className="rounded-md px-3 py-1.5 text-xs"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '0.5px solid var(--border-default)' }}
          >
            Não lidas
          </button>
        </div>
      </div>

      {isLoading && (!notifications || notifications.length === 0) ? (
        <div className="space-y-2">
          <div className="h-12 rounded-md bg-[hsl(var(--muted))] animate-pulse" />
          <div className="h-12 rounded-md bg-[hsl(var(--muted))] animate-pulse" />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          title={filter === 'unread' ? 'Nenhuma notificação não lida' : 'Você não tem notificações'}
          description=""
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onRead={(id) => markAsRead(id)}
              onDelete={(id) => deleteNotification(id)}
              isDeleting={deletingId === n.id}
            />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              if (pageNum > 1) void setPage(String(pageNum - 1));
            }}
            className="rounded-md px-3 py-1.5 text-xs"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '0.5px solid var(--border-default)' }}
          >
            Anterior
          </button>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Página {pageNum} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => {
              if (pageNum < totalPages) void setPage(String(pageNum + 1));
            }}
            className="rounded-md px-3 py-1.5 text-xs"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '0.5px solid var(--border-default)' }}
          >
            Próxima
          </button>
        </div>
      ) : null}
    </div>
  );
}
