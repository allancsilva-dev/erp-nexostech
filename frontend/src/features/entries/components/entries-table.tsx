'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { PaginatedMeta } from '@/lib/api-types';
import type { Entry } from '@/features/entries/types/entry.types';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { CategoryBadge } from '@/components/shared/category-badge';
import { MoneyDisplay } from '@/components/shared/money-display';
import { formatDate } from '@/lib/format';

const columns: ColumnDef<Entry, unknown>[] = [
  {
    accessorKey: 'documentNumber',
    header: 'Codigo',
    cell: ({ row }) => <span className="font-mono">{row.original.documentNumber}</span>,
  },
  {
    accessorKey: 'description',
    header: 'Descricao',
  },
  {
    accessorKey: 'contactName',
    header: 'Fornecedor/Cliente',
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
    cell: ({ row }) => formatDate(row.original.dueDate),
  },
  {
    accessorKey: 'amount',
    header: 'Valor',
    cell: ({ row }) => <MoneyDisplay value={row.original.amount} />,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function EntriesTable({
  entries,
  meta,
  onPageChange,
}: {
  entries: Entry[];
  meta: PaginatedMeta;
  onPageChange: (page: number) => void;
}) {
  return <DataTable columns={columns} data={entries} meta={meta} onPageChange={onPageChange} />;
}
