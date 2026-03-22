import React from 'react';
import { AlertCircle, Inbox } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import type { OverdueEntry } from '@/lib/api/dashboard';

interface OverdueTableProps {
  title: string;
  entries: OverdueEntry[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export const OverdueTable = React.memo(function OverdueTable({
  title,
  entries,
  isLoading,
  isError,
  refetch,
}: OverdueTableProps) {
  if (isLoading) {
    return (
      <div className="surface-card p-4">
        <div className="skeleton mb-3 h-4 w-40" />
        {[1, 2, 3].map((index) => (
          <div key={index} className="skeleton mb-2 h-8 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="surface-card p-4">
        <div className="mb-2 flex items-center gap-2">
          <AlertCircle size={14} style={{ color: 'var(--danger)' }} />
          <span className="text-xs" style={{ color: 'var(--danger)' }}>Erro ao carregar</span>
        </div>
        <button onClick={refetch} className="text-xs underline" style={{ color: 'var(--text-secondary)' }}>
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="surface-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
        {entries.length > 0 ? (
          <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: 'var(--danger-muted)', color: 'var(--danger)' }}>
            {entries.length}
          </span>
        ) : null}
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center py-6">
          <Inbox size={24} style={{ color: 'var(--text-muted)' }} strokeWidth={1.2} />
          <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            Nenhuma conta vencida
          </p>
        </div>
      ) : (
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ color: 'var(--text-muted)' }}>
              <th className="pb-2 text-left text-[10px] font-medium uppercase tracking-wider">Codigo</th>
              <th className="pb-2 text-left text-[10px] font-medium uppercase tracking-wider">Descricao</th>
              <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-wider">Valor</th>
              <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-wider">Atraso</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <td className="py-2 font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {entry.documentNumber ?? '-'}
                </td>
                <td className="max-w-[180px] truncate py-2" style={{ color: 'var(--text-secondary)' }}>
                  {entry.description}
                </td>
                <td className="py-2 text-right font-semibold tabular-nums" style={{ color: 'var(--danger)' }}>
                  {formatCurrency(entry.amount)}
                </td>
                <td className="py-2 text-right">
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: 'var(--danger-muted)', color: 'var(--danger)' }}>
                    {entry.daysOverdue}d
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
});
