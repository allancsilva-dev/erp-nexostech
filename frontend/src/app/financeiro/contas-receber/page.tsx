'use client';

import Link from 'next/link';
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
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            href="/financeiro/contas-receber/nova"
          >
            Nova conta a receber
          </Link>
        }
      />
      <EntryFilters />
      {entries.data?.data ? (
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
