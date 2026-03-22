'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQueryState } from 'nuqs';
import { Download, Plus, Search } from 'lucide-react';
import { EntriesTable } from '@/components/shared/entries-table';
import { PermissionGate } from '@/components/shared/permission-gate';
import { useEntries } from '@/features/entries/hooks/use-entries';
import type { EntryStatus } from '@/features/entries/types/entry.types';

export default function ContasPagarPage() {
  const [page, setPage] = useQueryState('page', { defaultValue: '1' });
  const [search, setSearch] = useQueryState('search', { defaultValue: '' });
  const [status, setStatus] = useQueryState('status', { defaultValue: '' });
  const [startDate, setStartDate] = useQueryState('startDate', { defaultValue: '' });
  const [sortBy] = useQueryState('sortBy', { defaultValue: 'dueDate' });
  const [sortOrder] = useQueryState('sortOrder', { defaultValue: 'asc' });

  const statusValue = useMemo(() => {
    if (!status) {
      return undefined;
    }

    return status as EntryStatus;
  }, [status]);

  const entries = useEntries({
    page: Number(page),
    pageSize: 20,
    type: 'PAYABLE',
    search,
    status: statusValue,
    startDate,
    sortBy,
    sortOrder: sortOrder === 'desc' ? 'desc' : 'asc',
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>
            Contas a pagar
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>
            Gerencie suas contas e pagamentos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors"
            style={{
              background: 'hsl(var(--bg-surface))',
              color: 'hsl(var(--text-secondary))',
              border: '0.5px solid hsl(var(--border-default))',
            }}
          >
            <Download size={15} />
            Exportar
          </button>
          <PermissionGate permission="financial.entries.create">
            <Link
              href="/financeiro/contas-pagar/nova"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-white transition-colors"
              style={{ background: 'hsl(var(--accent))' }}
            >
              <Plus size={15} />
              Nova conta
            </Link>
          </PermissionGate>
        </div>
      </div>

      <div className="surface-card mb-4 flex flex-wrap items-center gap-3 p-3">
        <div
          className="flex min-w-[200px] flex-1 items-center gap-2 rounded-md px-3 py-1.5"
          style={{ background: 'hsl(var(--bg-input))', border: '0.5px solid hsl(var(--border-default))' }}
        >
          <Search size={14} style={{ color: 'hsl(var(--text-muted))' }} />
          <input
            placeholder="Buscar por descricao, fornecedor ou codigo..."
            value={search}
            onChange={(event) => {
              void setSearch(event.target.value || null);
              void setPage('1');
            }}
            className="flex-1 bg-transparent text-[13px] outline-none"
            style={{ color: 'hsl(var(--text-primary))' }}
          />
        </div>
        <select
          className="rounded-md px-3 py-1.5 text-[13px]"
          value={status}
          onChange={(event) => {
            void setStatus(event.target.value || null);
            void setPage('1');
          }}
          style={{
            background: 'hsl(var(--bg-input))',
            color: 'hsl(var(--text-secondary))',
            border: '0.5px solid hsl(var(--border-default))',
          }}
        >
          <option value="">Todos os status</option>
          <option value="PENDING">Pendente</option>
          <option value="PAID">Pago</option>
          <option value="OVERDUE">Vencido</option>
          <option value="PARTIAL">Parcial</option>
          <option value="CANCELLED">Cancelado</option>
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(event) => {
            void setStartDate(event.target.value || null);
            void setPage('1');
          }}
          className="rounded-md px-3 py-1.5 text-[13px]"
          style={{
            background: 'hsl(var(--bg-input))',
            color: 'hsl(var(--text-secondary))',
            border: '0.5px solid hsl(var(--border-default))',
          }}
        />
      </div>

      <EntriesTable
        entries={entries.data?.data ?? []}
        isLoading={entries.isLoading}
        isError={entries.isError}
        error={entries.error}
        refetch={() => {
          void entries.refetch();
        }}
        type="PAYABLE"
        basePath="/financeiro/contas-pagar"
      />

      {entries.data?.meta?.totalPages && entries.data.meta.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              const current = Number(page);
              if (current > 1) {
                void setPage(String(current - 1));
              }
            }}
            className="rounded-md px-3 py-1.5 text-xs font-medium"
            style={{
              background: 'hsl(var(--bg-surface))',
              color: 'hsl(var(--text-secondary))',
              border: '0.5px solid hsl(var(--border-default))',
            }}
          >
            Anterior
          </button>
          <span className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
            Pagina {entries.data.meta.page} de {entries.data.meta.totalPages}
          </span>
          <button
            type="button"
            onClick={() => {
              const current = Number(page);
              if (current < entries.data.meta.totalPages) {
                void setPage(String(current + 1));
              }
            }}
            className="rounded-md px-3 py-1.5 text-xs font-medium"
            style={{
              background: 'hsl(var(--bg-surface))',
              color: 'hsl(var(--text-secondary))',
              border: '0.5px solid hsl(var(--border-default))',
            }}
          >
            Proxima
          </button>
        </div>
      ) : null}
    </div>
  );
}
