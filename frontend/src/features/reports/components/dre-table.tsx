'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { useDreReport, useExportReport } from '@/features/reports/hooks/use-reports';
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

export function DreTable() {
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

  const dre = useDreReport(filters);
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
        report: 'dre',
        format,
        startDate,
        endDate,
      });
      saveExportFile(file);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao exportar DRE.';
      setExportError(message);
    }
  }

  const report = dre.data?.data;

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

      {dre.isLoading ? <TableSkeleton rows={4} cols={3} /> : null}
      {dre.isError ? <ErrorBanner message={dre.error.message} onRetry={() => void dre.refetch()} /> : null}
      {exportError ? <ErrorBanner message={exportError} /> : null}

      {!dre.isLoading && !dre.isError && !report ? (
        <EmptyState title="Sem dados de DRE" description="Nao ha movimentacao para o periodo selecionado." />
      ) : null}

      {!dre.isLoading && !dre.isError && report ? (
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Indicador</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Receita total</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(report.revenueTotal)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Despesa total</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(report.expenseTotal)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Resultado liquido</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(report.netResult)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
