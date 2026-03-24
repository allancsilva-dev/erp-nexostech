import React from 'react';
import Link from 'next/link';
import { AlertCircle, Inbox } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { StatusBadge } from '@/components/shared/status-badge';
import type { Entry } from '@/features/entries/types/entry.types';

interface EntriesTableProps {
  entries: Entry[];
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  refetch: () => void;
  type: 'PAYABLE' | 'RECEIVABLE';
  basePath: string;
}

export const EntriesTable = React.memo(function EntriesTable({
  entries,
  isLoading,
  isError,
  error,
  refetch,
  type,
  basePath,
}: EntriesTableProps) {
  if (isLoading) {
    return (
      <div className="surface-card overflow-hidden">
        <div className="p-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 py-3">
              <div className="skeleton h-4 w-28" />
              <div className="skeleton h-4 w-48 flex-1" />
              <div className="skeleton h-4 w-24" />
              <div className="skeleton h-4 w-20" />
              <div className="skeleton h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="surface-card flex items-center justify-between p-4" style={{ background: 'var(--danger-muted)' }}>
        <div className="flex items-center gap-3">
          <AlertCircle size={18} style={{ color: 'var(--danger)' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>
              Falha ao carregar dados
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {error?.message || 'Erro desconhecido'}
            </p>
          </div>
        </div>
        <button
          onClick={refetch}
          className="rounded-md px-3 py-1.5 text-xs font-medium"
          style={{
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '0.5px solid var(--border-default)',
          }}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="surface-card flex flex-col items-center justify-center p-12 text-center">
        <Inbox size={40} style={{ color: 'var(--text-muted)' }} strokeWidth={1} />
        <p className="mt-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          {type === 'PAYABLE' ? 'Nenhuma conta a pagar' : 'Nenhuma conta a receber'}
        </p>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          Crie o primeiro lancamento para comecar
        </p>
      </div>
    );
  }

  const contactLabel = type === 'PAYABLE' ? 'Fornecedor' : 'Cliente';

  return (
    <div className="surface-card overflow-hidden">
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: '0.5px solid var(--border-default)' }}>
            {['Codigo', 'Descricao', contactLabel, 'Categoria', 'Vencimento', 'Valor', 'Status'].map((header) => (
              <th
                key={header}
                className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-wider ${header === 'Valor' ? 'text-right' : 'text-left'}`}
                style={{ color: 'var(--text-muted)', background: 'var(--bg-surface-raised)' }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const isOverdue = entry.status === 'OVERDUE';
            return (
              <tr
                key={entry.id}
                className="cursor-pointer transition-colors"
                style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = 'var(--bg-surface-raised)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = 'transparent';
                }}
              >
                <td className="px-4 py-3">
                  <Link href={`${basePath}/${entry.id}`} className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {entry.documentNumber ?? (
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px]"
                        style={{ background: 'var(--bg-surface-raised)', color: 'var(--text-muted)' }}
                      >
                        Sem no
                      </span>
                    )}
                  </Link>
                </td>
                <td className="max-w-[200px] px-4 py-3">
                  <Link
                    href={`${basePath}/${entry.id}`}
                    className="block truncate text-[13px] font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {entry.description}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                  {entry.contactName ?? '-'}
                </td>
                <td className="px-4 py-3">
                  {entry.categoryName ? (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{ background: 'var(--bg-surface-raised)', color: 'var(--text-secondary)' }}
                    >
                      {entry.categoryColor ? (
                        <span className="h-2 w-2 rounded-full" style={{ background: entry.categoryColor }} />
                      ) : null}
                      {entry.categoryName}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>-</span>
                  )}
                </td>
                <td
                  className="px-4 py-3 text-[12px]"
                  style={{ color: isOverdue ? 'var(--danger)' : 'var(--text-secondary)' }}
                >
                  {formatDate(entry.dueDate)}
                </td>
                <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(entry.amount)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={entry.status} type={entry.type} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

function formatDate(dateStr: string): string {
  try {
    const date = new Date(`${dateStr}T00:00:00`);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
