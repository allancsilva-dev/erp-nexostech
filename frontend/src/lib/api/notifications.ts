import { httpFetch } from '@/lib/http-client';
import type { NotificationsResponse, NotificationCountResponse } from '@/types/notifications';

const API_BASE = '/api/v1';

function buildQuery(params?: Record<string, unknown>) {
  if (!params) return '';
  const entries = Object.entries(params).reduce<Record<string, string>>((acc, [k, v]) => {
    if (v === undefined || v === null) return acc;
    if (typeof v === 'object') acc[k] = JSON.stringify(v);
    else acc[k] = String(v);
    return acc;
  }, {});
  const qs = new URLSearchParams(entries).toString();
  return qs ? `?${qs}` : '';
}

export async function fetchNotifications(
  params?: { page?: number; limit?: number; unread_only?: boolean },
  signal?: AbortSignal,
): Promise<NotificationsResponse> {
  const qs = buildQuery(params as Record<string, unknown> | undefined);
  const res = await httpFetch(`${API_BASE}/notifications${qs}`, { method: 'GET', signal });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error?.message ?? body?.message ?? 'Erro ao buscar notificações');
  }
  return body?.data as NotificationsResponse;
}

export async function fetchNotificationCount(signal?: AbortSignal): Promise<NotificationCountResponse> {
  const res = await httpFetch(`${API_BASE}/notifications/count`, { method: 'GET', signal });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error?.message ?? body?.message ?? 'Erro ao buscar contagem de notificações');
  }
  return body?.data as NotificationCountResponse;
}

export async function markNotificationRead(id: string): Promise<void> {
  const res = await httpFetch(`${API_BASE}/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? body?.message ?? 'Erro ao marcar notificação como lida');
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const res = await httpFetch(`${API_BASE}/notifications/read-all`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? body?.message ?? 'Erro ao marcar todas as notificações como lidas');
  }
}

export async function deleteNotification(id: string): Promise<void> {
  const res = await httpFetch(`${API_BASE}/notifications/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? body?.message ?? 'Erro ao deletar notificação');
  }
}
