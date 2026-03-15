'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { useQueryState } from 'nuqs';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { EntryFilters } from '@/features/entries/components/entry-filters';
import { EntriesTable } from '@/features/entries/components/entries-table';
import { BatchPayBar } from '@/features/entries/components/batch-pay-bar';
import { useEntries } from '@/features/entries/hooks/use-entries';

export default function ContasPagarPage() {
  const [page, setPage] = useQueryState('page', { defaultValue: '1' });
  const [sortBy, setSortBy] = useQueryState('sortBy', { defaultValue: 'dueDate' });
  const [sortOrder, setSortOrder] = useQueryState('sortOrder', { defaultValue: 'asc' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const entries = useEntries({
    page: Number(page),
    pageSize: 20,
    type: 'PAYABLE',
    sortBy,
    sortOrder: sortOrder === 'desc' ? 'desc' : 'asc',
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas a pagar"
        subtitle="Controle de despesas, pagamentos e vencimentos"
        actions={
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            href="/financeiro/contas-pagar/nova"
          >
            Nova conta a pagar
          </Link>
        }
      />

      <EntryFilters />

      {entries.isLoading ? <TableSkeleton rows={10} cols={7} /> : null}
      {entries.isError ? <ErrorBanner message={entries.error.message} onRetry={() => entries.refetch()} /> : null}
      {!entries.isLoading && !entries.isError && !entries.data?.data.length ? (
        <EmptyState
          title="Nenhum lancamento encontrado"
          description="Crie seu primeiro lancamento para comecar"
          action={
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              href="/financeiro/contas-pagar/nova"
            >
              Criar lancamento
            </Link>
          }
        />
      ) : null}
      {entries.data?.data.length ? (
        <EntriesTable
          entries={entries.data.data}
          meta={entries.data.meta}
          onPageChange={(nextPage) => setPage(String(nextPage))}
          onSortChange={(nextSortBy, nextSortOrder) => {
            void setSortBy(nextSortBy);
            void setSortOrder(nextSortOrder);
          }}
          onSelectionChange={setSelectedIds}
        />
      ) : null}

      <BatchPayBar
        selectedCount={selectedIds.length}
        onPay={() => {
          toast.success(`${selectedIds.length} pagamentos registrados`);
          setSelectedIds([]);
        }}
      />
    </div>
  );
}
