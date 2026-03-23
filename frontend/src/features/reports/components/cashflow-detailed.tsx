'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { useCashflowReport, useExportReport } from '@/features/reports/hooks/use-reports';
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

export function CashflowDetailed() {
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

  const cashflow = useCashflowReport(filters);
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
        report: 'cashflow',
        format,
        startDate,
        endDate,
      });
      saveExportFile(file);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao exportar fluxo de caixa.';
      setExportError(message);
    }
  }

  const report = cashflow.data?.data;
  const rows = report?.rows ?? [];

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

      {cashflow.isLoading ? <TableSkeleton rows={8} cols={4} /> : null}
      {cashflow.isError ? <ErrorBanner message={cashflow.error.message} onRetry={() => void cashflow.refetch()} /> : null}
      {exportError ? <ErrorBanner message={exportError} /> : null}

      {!cashflow.isLoading && !cashflow.isError && report ? (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Saldo inicial</p>
            <p className="mt-2 text-xl font-semibold">{formatCurrency(report.startBalance)}</p>
          </div>
        </div>
      ) : null}

      {!cashflow.isLoading && !cashflow.isError && rows.length === 0 ? (
        <EmptyState title="Sem fluxo no periodo" description="Nao ha entradas ou saidas para o intervalo selecionado." />
      ) : null}

      {!cashflow.isLoading && !cashflow.isError && rows.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Entradas</TableHead>
                <TableHead className="text-right">Saidas</TableHead>
                <TableHead className="text-right">Acumulado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={`${row.date}-${index}`}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.inflow)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.outflow)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(report?.accumulated[index] ?? '0')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
