'use client';

import { formatDateTime } from '@/lib/format';

export interface ApprovalHistoryItem {
  id: string;
  entryId: string;
  userId: string;
  action: string;
  notes: string | null;
  createdAt: string;
}

export function ApprovalHistory({ items }: { items: ApprovalHistoryItem[] }) {
  if (items.length === 0) {
     return <p className="text-sm text-slate-500">Nenhum registro de histórico encontrado.</p>;
  }

  return (
    <div className="surface-card overflow-x-auto p-3">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
            <tr className="border-b text-left bg-[var(--bg-surface-raised)]">
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Lançamento</th>
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Ação</th>
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Por quem</th>
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Data</th>
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Motivo</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="px-3 py-2 font-mono">{item.entryId}</td>
              <td className="px-3 py-2">{item.action}</td>
              <td className="px-3 py-2">{item.userId}</td>
              <td className="px-3 py-2">{formatDateTime(item.createdAt)}</td>
              <td className="px-3 py-2">{item.notes ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
