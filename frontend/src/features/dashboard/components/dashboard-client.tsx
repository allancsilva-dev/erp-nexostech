'use client';

import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { CardSkeleton } from '@/components/shared/loading-skeleton';
import {
  useDashboardCashflowChart,
  useDashboardExpenseBreakdown,
  useDashboardOverdue,
  useDashboardSummary,
} from '@/features/dashboard/hooks/use-dashboard';
import { SummaryCards } from '@/features/dashboard/components/summary-cards';
import { CashflowChart } from '@/features/dashboard/components/cashflow-chart';
import { ExpenseDonut } from '@/features/dashboard/components/expense-donut';
import { OverdueList } from '@/features/dashboard/components/overdue-list';

export function DashboardClient() {
  const summary = useDashboardSummary();
  const overdue = useDashboardOverdue();
  const cashflow = useDashboardCashflowChart();
  const expense = useDashboardExpenseBreakdown();

  if (summary.isLoading || overdue.isLoading || cashflow.isLoading || expense.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (summary.isError) {
    return <ErrorBanner message={summary.error.message} onRetry={() => summary.refetch()} />;
  }

  if (!summary.data?.data) {
    return <EmptyState title="Sem dados" description="Nao ha dados para o dashboard." />;
  }

  return (
    <div className="space-y-6">
      <SummaryCards data={summary.data.data} />
      <div className="grid gap-6 lg:grid-cols-2">
        <CashflowChart data={cashflow.data?.data ?? []} />
        <ExpenseDonut data={expense.data?.data ?? []} />
      </div>
      <OverdueList items={overdue.data?.data ?? []} />
    </div>
  );
}
