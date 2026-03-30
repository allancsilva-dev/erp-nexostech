"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotificationCount } from '@/hooks/use-notification-count';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationItem } from './notification-item';

export function BellButton() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const { unreadCount } = useNotificationCount();
  const {
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isMarkingAllRead,
    deletingId,
  } = useNotifications({ limit: 10 }, { enabled: open });

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((p) => !p)}
        className="relative"
        aria-label="Abrir notificações"
      >
        {unreadCount > 0 ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      </Button>

      {unreadCount > 0 ? (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-red-600 text-white text-[11px] px-1" style={{ minWidth: 20 }}>
          {unreadCount > 99 ? '99+' : String(unreadCount)}
        </span>
      ) : null}

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-md border bg-[var(--popover)] p-2 shadow-lg" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center justify-between px-2">
            <div className="font-medium">Notificações</div>
            <button
              type="button"
              onClick={() => void markAllAsRead()}
              disabled={unreadCount === 0 || isMarkingAllRead}
              className="text-xs text-[var(--text-secondary)]"
            >
              Marcar todas como lidas
            </button>
          </div>

          <div ref={listContainerRef} className="max-h-80 overflow-y-auto mt-2">
            {/* Skeleton — visible only on first load (no cached data) */}
            <div hidden={!(isLoading && (!notifications || notifications.length === 0))} className="space-y-2 px-1">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>

            {/* Empty state — visible when not loading and list is empty */}
            <div hidden={!( !isLoading && notifications.length === 0 )} className="px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
              <div className="flex items-center justify-center">
                <BellOff className="h-4 w-4" />
              </div>
              <div className="mt-2">Nenhuma notificação</div>
            </div>

            {/* Lista — visible when there are notifications */}
            <div hidden={notifications.length === 0} className="space-y-1 px-1">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={(id) => markAsRead(id)}
                  onDelete={(id) => deleteNotification(id)}
                  onNavigate={() => setOpen(false)}
                  isDeleting={deletingId === n.id}
                />
              ))}
            </div>
          </div>

          <hr className="my-2" style={{ borderColor: 'var(--border-subtle)' }} />
          <div className="px-3 py-2 text-sm">
            <Link href="/financeiro/notificacoes" onClick={() => setOpen(false)} className="text-[var(--accent)]">
              Ver todas as notificações
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default BellButton;
