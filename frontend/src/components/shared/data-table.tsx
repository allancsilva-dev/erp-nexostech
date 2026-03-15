'use client';

import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  type ColumnDef,
  type PaginationState,
  useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function DataTable<TData>({
  columns,
  data,
  meta,
  onPageChange,
}: {
  columns: ColumnDef<TData>[];
  data: TData[];
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}) {
  const [pagination] = useState<PaginationState>({ pageIndex: meta.page - 1, pageSize: meta.pageSize });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: meta.totalPages,
    state: { pagination },
  });

  const showing = useMemo(() => {
    const start = (meta.page - 1) * meta.pageSize + 1;
    const end = Math.min(meta.page * meta.pageSize, meta.total);
    return `${start}-${end} de ${meta.total}`;
  }, [meta.page, meta.pageSize, meta.total]);

  return (
    <div className="rounded-xl border bg-white p-3 dark:bg-slate-800">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b bg-slate-50 text-left dark:bg-slate-900/60">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b hover:bg-blue-50/50 dark:hover:bg-blue-900/20">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-slate-500">Mostrando {showing}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onPageChange(Math.max(1, meta.page - 1))} disabled={meta.page <= 1}>
            Anterior
          </Button>
          <Button size="sm" variant="outline" onClick={() => onPageChange(Math.min(meta.totalPages, meta.page + 1))} disabled={meta.page >= meta.totalPages}>
            Proxima
          </Button>
        </div>
      </div>
    </div>
  );
}
