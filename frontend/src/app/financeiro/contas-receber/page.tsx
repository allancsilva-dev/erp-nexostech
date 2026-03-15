'use client';

import Link from 'next/link';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { PermissionGate } from '@/components/shared/permission-gate';
import { useQueryState } from 'nuqs';
import { PageHeader } from '@/components/layout/page-header';
import { EntryFilters } from '@/features/entries/components/entry-filters';
import { EntriesTable } from '@/features/entries/components/entries-table';
import { useEntries } from '@/features/entries/hooks/use-entries';

export default function ContasReceberPage() {
  const [page, setPage] = useQueryState('page', { defaultValue: '1' });
  const [sortBy, setSortBy] = useQueryState('sortBy', { defaultValue: 'dueDate' });
  const [sortOrder, setSortOrder] = useQueryState('sortOrder', { defaultValue: 'asc' });
  const entries = useEntries({
    page: Number(page),
    pageSize: 20,
    type: 'RECEIVABLE',
    sortBy,
    sortOrder: sortOrder === 'desc' ? 'desc' : 'asc',
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas a receber"
        subtitle="Gestao de receitas e recebimentos"
        actions={
          <PermissionGate permission="financial.entries.create">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              href="/financeiro/contas-receber/nova"
            >
              Nova conta a receber
            </Link>
          </PermissionGate>
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
            <PermissionGate permission="financial.entries.create">
              <Link
                className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                href="/financeiro/contas-receber/nova"
              >
                Criar lancamento
              </Link>
            </PermissionGate>
          }
        />
      ) : null}
      {entries.data?.data.length ? (
        <EntriesTable
          entries={entries.data.data}
          meta={entries.data.meta}
          onPageChange={(next) => {
            void setPage(String(next));
          }}
          onSortChange={(nextSortBy, nextSortOrder) => {
            void setSortBy(nextSortBy);
            void setSortOrder(nextSortOrder);
          }}
          onSelectionChange={() => undefined}
        />
      ) : null}
    </div>
  );
}
