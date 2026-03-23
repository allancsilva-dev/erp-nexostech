'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { useAgingReport, useExportReport } from '@/features/reports/hooks/use-reports';
import { formatCurrency } from '@/lib/utils/currency';
import type { ExportFormat, ReportExportResponse } from '@/features/reports/types/report.types';
import { usePermissions } from '@/hooks/use-permissions';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function saveExportFile(file: ReportExportResponse): void {
  if (file.format === 'pdf') {
    const binary = atob(file.content);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.filename;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  const blob = new Blob([file.content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AgingTable() {
  const [startDate, setStartDate] = useState(monthStartIso);
  const [endDate, setEndDate] = useState(todayIso);
  const [exportError, setExportError] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      startDate,
      endDate,
    }),
    [startDate, endDate],
  );

  const aging = useAgingReport(filters);
  const exporter = useExportReport();
  const { hasPermission } = usePermissions();
  const canExport = hasPermission('financial.reports.export');

  async function handleExport(format: ExportFormat): Promise<void> {
    if (!canExport) {
      return;
    }

    setExportError(null);
    try {
      const file = await exporter.mutateAsync({
        report: 'aging',
        format,
        startDate,
        endDate,
      });
      saveExportFile(file);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao exportar aging.';
      setExportError(message);
    }
  }

  const ranges = aging.data?.data.ranges ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 md:flex-row md:items-end md:justify-between">
        <div className="grid w-full gap-3 md:max-w-xl md:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
            Data inicial
            <Input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
            Data final
            <Input type="date" value={endDate} min={startDate} max={todayIso()} onChange={(event) => setEndDate(event.target.value)} />
          </label>
        </div>
        {canExport ? (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void handleExport('csv')} disabled={exporter.isPending}>
              Exportar CSV
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void handleExport('pdf')} disabled={exporter.isPending}>
              Exportar PDF
            </Button>
          </div>
        ) : null}
      </div>

      {aging.isLoading ? <TableSkeleton rows={6} cols={3} /> : null}
      {aging.isError ? <ErrorBanner message={aging.error.message} onRetry={() => void aging.refetch()} /> : null}
      {exportError ? <ErrorBanner message={exportError} /> : null}

      {!aging.isLoading && !aging.isError && ranges.length === 0 ? (
        <EmptyState title="Sem dados de aging" description="Nao ha titulos elegiveis para analise no periodo selecionado." />
      ) : null}

      {!aging.isLoading && !aging.isError && ranges.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Faixa</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranges.map((row) => (
                <TableRow key={row.range}>
                  <TableCell>{row.range} dias</TableCell>
                  <TableCell className="text-right">{row.count}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(row.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
