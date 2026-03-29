'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';
import { ACTION_LABELS, ENTITY_LABELS } from '../audit-labels';
import { formatDateTime } from '@/lib/format';
import { AuditLogDetail } from '@/features/audit/components/audit-log-detail';
import { useAuditLogDetail, useAuditLogs, useExportAuditLogs } from '@/features/audit/hooks/use-audit-logs';

interface AuditItem {
  id: string;
  userEmail?: string;
  action?: string;
  entity?: string;
  createdAt?: string;
}

function toAuditList(value: unknown): AuditItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is AuditItem => {
    if (typeof item !== 'object' || !item || !('id' in item)) {
      return false;
    }
    return typeof (item as { id: unknown }).id === 'string';
  });
}

export function AuditLogTable() {
  const logs = useAuditLogs();
  const exportMutation = useExportAuditLogs();
  const { hasPermission } = usePermissions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detail = useAuditLogDetail(selectedId);
  const canViewAudit = hasPermission('financial.audit.view');

  if (logs.isLoading) {
    return <TableSkeleton rows={8} cols={5} />;
  }

  if (logs.isError) {
    return <ErrorBanner message={logs.error.message} onRetry={() => logs.refetch()} />;
  }

  const list = toAuditList(logs.data?.data);

  if (list.length === 0) {
    return <EmptyState title="Sem logs de auditoria" description="Não há eventos para o período atual." />;
  }

  return (
    <div className="space-y-3">
      {canViewAudit ? (
        <div className="flex justify-end">
          <Button type="button" onClick={() => exportMutation.mutate(undefined)} disabled={exportMutation.isPending}>
            {exportMutation.isPending ? 'Processando...' : 'Exportar CSV'}
          </Button>
        </div>
      ) : null}

      <div className="surface-card overflow-x-auto p-3">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left bg-[var(--bg-surface-raised)]">
              <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Data</th>
              <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Usuário</th>
              <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Ação</th>
              <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Entidade</th>
            </tr>
          </thead>
          <tbody>
            {list.map((log) => (
              <tr key={log.id} className="cursor-pointer border-b hover:bg-blue-50/50 dark:hover:bg-blue-900/20" onClick={() => setSelectedId(log.id)}>
                <td className="px-3 py-2">{log.createdAt ? formatDateTime(log.createdAt) : '-'}</td>
                <td className="px-3 py-2">{log.userEmail ?? '-'}</td>
                <td className="px-3 py-2">{ACTION_LABELS[log.action ?? ''] ?? log.action ?? '-'}</td>
                <td className="px-3 py-2">{ENTITY_LABELS[log.entity ?? ''] ?? log.entity ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AuditLogDetail
        open={Boolean(selectedId)}
        item={detail.data?.data ?? null}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
