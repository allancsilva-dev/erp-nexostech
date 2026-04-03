'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { getErrorMessage } from '@/components/ui/error-toast';
import { useBalanceSheetReport, useExportReport } from '@/features/reports/hooks/use-reports';
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

export function BalanceSheetTable() {
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

  const balanceSheet = useBalanceSheetReport(filters);
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
        report: 'balance-sheet',
        format,
        startDate,
        endDate,
      });
      saveExportFile(file);
    } catch (error) {
      setExportError(getErrorMessage(error, 'Falha ao exportar balancete.'));
    }
  }

  const report = balanceSheet.data?.data;
  const rows = report?.byCategory ?? [];

  return (
    <div className="space-y-4">
      <div className="surface-card flex flex-col gap-3 p-4 md:flex-row md:items-end md:justify-between">
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

      {balanceSheet.isLoading ? <TableSkeleton rows={8} cols={4} /> : null}
      {balanceSheet.isError ? <ErrorBanner message={getErrorMessage(balanceSheet.error, 'Erro inesperado. Tente novamente.')} onRetry={() => void balanceSheet.refetch()} /> : null}
      {exportError ? <ErrorBanner message={exportError} /> : null}

      {!balanceSheet.isLoading && !balanceSheet.isError && rows.length === 0 ? (
        <EmptyState title="Sem dados de balancete" description="Não há categorias movimentadas para o período selecionado." />
      ) : null}

      {!balanceSheet.isLoading && !balanceSheet.isError && rows.length > 0 ? (
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Entradas</TableHead>
                <TableHead className="text-right">Saídas</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.categoryName}>
                  <TableCell>{row.categoryName}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.inflow)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.outflow)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(row.net)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-[var(--bg-surface-raised)]">
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(report?.totals.inflow ?? '0')}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(report?.totals.outflow ?? '0')}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(report?.totals.net ?? '0')}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
