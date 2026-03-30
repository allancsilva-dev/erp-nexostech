"use client";

import { useRouter } from 'next/navigation';
import { KeyboardEvent } from 'react';
import { Trash2, Bell } from 'lucide-react';
import { Notification } from '@/types/notifications';

export function getNotificationHref(n: Notification): string | null {
  if (
    n.type === 'APPROVAL_PENDING' ||
    n.type === 'APPROVAL_DONE' ||
    n.type === 'APPROVAL_REJECTED'
  )
    return '/financeiro/aprovacoes';
  if (!n.metadata?.entry_id) return null;
  if (n.metadata.type === 'PAYABLE') return `/financeiro/contas-pagar/${n.metadata.entry_id}`;
  if (n.metadata.type === 'RECEIVABLE') return `/financeiro/contas-receber/${n.metadata.entry_id}`;
  return null;
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} dias`;
  return new Date(isoString).toLocaleDateString('pt-BR');
}

export function NotificationItem({
  notification,
  onRead,
  onDelete,
  onNavigate,
  isDeleting,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate?: () => void;
  isDeleting?: boolean;
}) {
  const router = useRouter();

  const handleActivate = async () => {
    onRead(notification.id);
    if (onNavigate) onNavigate();
    const href = getNotificationHref(notification);
    if (href) router.push(href);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      if (e.key === ' ') e.preventDefault();
      void handleActivate();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => void handleActivate()}
      onKeyDown={onKeyDown}
      className="flex items-start gap-3 rounded-md px-3 py-2 text-sm transition-colors cursor-pointer"
      style={{
        background: notification.read_at ? 'transparent' : 'var(--bg-input)',
        color: 'var(--text-primary)'
      }}
    >
      <div className="flex-shrink-0 mt-1">
        <Bell className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {!notification.read_at ? (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
            ) : null}
            <div className="font-medium truncate">{notification.title}</div>
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">{formatRelativeTime(notification.created_at)}</div>
        </div>
        <div className="mt-1 text-[13px] truncate" style={{ color: 'var(--text-secondary)' }}>{notification.message}</div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification.id);
        }}
        aria-label="Deletar notificação"
        className="ml-2 flex items-center justify-center"
        disabled={isDeleting}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
