'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { useBranch } from '@/hooks/use-branch';
import { queryKeys } from '@/lib/query-keys';

interface AuditListItem {
  id: string;
  branchId: string | null;
  userId: string;
  userEmail?: string | null;
  action: string;
  entity: string;
  entityId: string;
  requestId: string | null;
  ipAddress?: string | null;
  fieldChanges?: unknown[];
  createdAt: string;
}

interface ExportPayload {
  filename: string;
  content: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export function useAuditLogs() {
  const { activeBranchId } = useBranch();
  return useQuery({
    queryKey: queryKeys.auditLogs.list(activeBranchId || 'default'),
    queryFn: () => api.get<AuditListItem[]>('/audit-logs', { page: 1, pageSize: 100 }),
    enabled: Boolean(activeBranchId),
  });
}

export function useAuditLogDetail(id: string | null) {
  const { activeBranchId } = useBranch();

  return useQuery({
    queryKey: ['audit-logs', activeBranchId, 'detail', id] as const,
    queryFn: () => api.get<AuditListItem>(`/audit-logs/${id}`),
    enabled: Boolean(activeBranchId && id),
  });
}

export function useExportAuditLogs() {
  return useMutation({
    mutationFn: (filters?: { page?: number; pageSize?: number }) =>
      api.get<ExportPayload>('/audit-logs/export', {
        page: filters?.page ?? 1,
        pageSize: filters?.pageSize ?? 500,
      }),
    onSuccess: (response) => {
      const file = response.data;
      const blob = new Blob([file.content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.filename || `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success('Exportação concluída com sucesso');
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error, 'Erro inesperado. Tente novamente.');
      toast.error(message);
      console.error('[audit-logs:export]', error);
    },
  });
}
