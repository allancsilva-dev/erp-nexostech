'use client';

import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { formatDateTime } from '@/lib/format';
import { useAuditLogs } from '@/features/audit/hooks/use-audit-logs';

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

  if (logs.isLoading) {
    return <TableSkeleton rows={8} cols={5} />;
  }

  if (logs.isError) {
    return <ErrorBanner message={logs.error.message} onRetry={() => logs.refetch()} />;
  }

  const list = toAuditList(logs.data?.data);

  if (list.length === 0) {
    return <EmptyState title="Sem logs de auditoria" description="Nao ha eventos para o periodo atual." />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-white p-3 dark:bg-slate-800">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left dark:bg-slate-900/60">
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Data</th>
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Usuario</th>
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Acao</th>
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Entidade</th>
          </tr>
        </thead>
        <tbody>
          {list.map((log) => (
            <tr key={log.id} className="border-b hover:bg-blue-50/50 dark:hover:bg-blue-900/20">
              <td className="px-3 py-2">{log.createdAt ? formatDateTime(log.createdAt) : '-'}</td>
              <td className="px-3 py-2">{log.userEmail ?? '-'}</td>
              <td className="px-3 py-2">{log.action ?? '-'}</td>
              <td className="px-3 py-2">{log.entity ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
