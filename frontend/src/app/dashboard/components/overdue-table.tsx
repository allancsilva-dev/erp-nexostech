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

      <table className="w-full text-[12px]">
        <thead>
          <tr>
            <th
              className="pb-2 text-left text-[10px] font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              Código
            </th>
            <th
              className="pb-2 text-left text-[10px] font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              Descrição
            </th>
            <th
              className="pb-2 text-right text-[10px] font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              Valor
            </th>
            <th
              className="pb-2 text-right text-[10px] font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              Atraso
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-8 text-center">
                <Inbox
                  size={24}
                  style={{ color: 'var(--text-muted)' }}
                  strokeWidth={1.2}
                  className="mx-auto mb-2"
                />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Nenhuma conta vencida
                </p>
              </td>
            </tr>
          ) : (
            entries.map((entry) => (
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
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                    style={{ background: 'var(--danger-muted)', color: 'var(--danger)' }}
                  >
                    {entry.daysOverdue}d
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
});
