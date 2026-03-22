'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { PaginatedMeta } from '@/lib/api-types';
import type { Entry } from '@/features/entries/types/entry.types';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { CategoryBadge } from '@/components/shared/category-badge';
import { MoneyDisplay } from '@/components/shared/money-display';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';

export function EntriesTable({
  entries,
  meta,
  onPageChange,
  onSortChange,
  onSelectionChange,
}: {
  entries: Entry[];
  meta: PaginatedMeta;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  onSelectionChange: (ids: string[]) => void;
}) {
  const columns = useMemo<ColumnDef<Entry, unknown>[]>(
    () => [
      {
        accessorKey: 'documentNumber',
        header: 'Codigo',
        enableSorting: true,
        cell: ({ row }) => {
          if (!row.original.documentNumber) {
            return (
              <Badge
                className="bg-slate-100 text-slate-600"
                title="O numero do documento sera gerado apos aprovacao"
              >
                Sem numero
              </Badge>
            );
          }

          return <span className="font-mono">{row.original.documentNumber}</span>;
        },
      },
      {
        accessorKey: 'description',
        header: 'Descricao',
        enableSorting: true,
      },
      {
        accessorKey: 'contactName',
        header: 'Fornecedor/Cliente',
        enableSorting: true,
        cell: ({ row }) => row.original.contactName ?? '-',
      },
      {
        id: 'category',
        header: 'Categoria',
        cell: ({ row }) => <CategoryBadge name={row.original.categoryName} color={row.original.categoryColor} />,
      },
      {
        accessorKey: 'dueDate',
        header: 'Vencimento',
        enableSorting: true,
        cell: ({ row }) => formatDate(row.original.dueDate),
      },
      {
        accessorKey: 'amount',
        header: 'Valor',
        enableSorting: true,
        cell: ({ row }) => <MoneyDisplay value={row.original.amount} />,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableSorting: true,
        cell: ({ row }) => <StatusBadge status={row.original.status} type={row.original.type} />,
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={entries}
      meta={meta}
      onPageChange={onPageChange}
      onSortChange={onSortChange}
      enableSelection
      onSelectionChange={onSelectionChange}
      getRowId={(row) => row.id}
      enableVirtualization={meta.total > 300}
    />
  );
}
