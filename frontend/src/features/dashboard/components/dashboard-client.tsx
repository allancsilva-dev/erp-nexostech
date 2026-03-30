'use client';

import { PageHeader } from '@/components/ui/page-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDashboardCashflowChart,
  useDashboardOverdue,
  useDashboardSummary,
} from '@/features/dashboard/hooks/use-dashboard';
import { SummaryCards } from '@/features/dashboard/components/summary-cards';
import { CashflowChart } from '@/features/dashboard/components/cashflow-chart';
import { OverdueList } from '@/features/dashboard/components/overdue-list';

export function DashboardClient() {
  const summary = useDashboardSummary();
  const overdue = useDashboardOverdue();
  const cashflow = useDashboardCashflowChart();

  if (summary.isLoading || overdue.isLoading || cashflow.isLoading) {
    return (
      <div className="space-y-6">
        <LoadingState type="cards" />
        <Skeleton className="h-80" />
        <LoadingState type="table" rows={6} />
      </div>
    );
  }

  if (summary.isError || overdue.isError || cashflow.isError) {
    const message =
      summary.error?.message ??
      overdue.error?.message ??
      cashflow.error?.message ??
      'Erro inesperado ao carregar dashboard.';
    return <ErrorState message={message} onRetry={() => summary.refetch()} />;
  }

  if (!summary.data?.data) {
    return <EmptyState title="Sem dados" description="Não há dados para o painel." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel financeiro"
        subtitle="Visão consolidada de saldos, vencimentos e fluxo"
      />
      <SummaryCards data={summary.data.data} />
      <CashflowChart data={cashflow.data ?? []} />
      <OverdueList items={overdue.data?.data ?? []} />
    </div>
  );
}
