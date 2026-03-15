'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  type ColumnDef,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
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
  onSortChange,
  enableSelection = false,
  onSelectionChange,
  getRowId,
  enableVirtualization = false,
}: {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  enableSelection?: boolean;
  onSelectionChange?: (ids: string[]) => void;
  getRowId?: (originalRow: TData, index: number) => string;
  enableVirtualization?: boolean;
}) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination] = useState<PaginationState>({ pageIndex: meta.page - 1, pageSize: meta.pageSize });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    manualPagination: true,
    manualSorting: true,
    enableRowSelection: enableSelection,
    pageCount: meta.totalPages,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    state: { pagination, rowSelection, sorting },
  });

  useEffect(() => {
    if (!onSelectionChange || !enableSelection) {
      return;
    }

    const ids = table.getSelectedRowModel().rows.map((row) => row.id);
    onSelectionChange(ids);
  }, [enableSelection, onSelectionChange, rowSelection, table]);

  useEffect(() => {
    if (!onSortChange || sorting.length === 0) {
      return;
    }

    const current = sorting[0];
    onSortChange(current.id, current.desc ? 'desc' : 'asc');
  }, [onSortChange, sorting]);

  const showing = useMemo(() => {
    const start = (meta.page - 1) * meta.pageSize + 1;
    const end = Math.min(meta.page * meta.pageSize, meta.total);
    return `${start}-${end} de ${meta.total}`;
  }, [meta.page, meta.pageSize, meta.total]);

  const shouldVirtualize = enableVirtualization && meta.total > 300;
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rows = table.getRowModel().rows;

  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualize ? rows.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 8,
  });

  const virtualItems = shouldVirtualize ? rowVirtualizer.getVirtualItems() : [];

  return (
    <div className="rounded-xl border bg-white p-3 dark:bg-slate-800">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b bg-slate-50 text-left dark:bg-slate-900/60">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        className={header.column.getCanSort() ? 'inline-flex items-center gap-1 hover:text-blue-600' : ''}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc' ? '' : header.column.getIsSorted() === 'desc' ? '' : ''}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
        </table>

        {shouldVirtualize ? (
          <div ref={parentRef} className="max-h-[520px] overflow-auto">
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
              {virtualItems.map((virtualRow) => {
                const row = rows[virtualRow.index];
                return (
                  <div
                    key={row.id}
                    className="absolute left-0 right-0 border-b hover:bg-blue-50/50 dark:hover:bg-blue-900/20"
                    style={{ transform: `translateY(${virtualRow.start}px)` }}
                  >
                    <table className="w-full min-w-[900px] border-collapse text-sm">
                      <tbody>
                        <tr>
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="px-3 py-2">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <tbody>
              {rows.map((row) => (
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
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-slate-500">Mostrando {showing}</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPageChange(Math.max(1, meta.page - 1))}
            disabled={meta.page <= 1}
          >
            Anterior
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPageChange(Math.min(meta.totalPages, meta.page + 1))}
            disabled={meta.page >= meta.totalPages}
          >
            Proxima
          </Button>
        </div>
      </div>
    </div>
  );
}
