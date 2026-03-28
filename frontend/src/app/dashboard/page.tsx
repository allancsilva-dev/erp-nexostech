'use client';

import { useMemo } from 'react';
import { Target, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useCashflowData, useDashboardSummary, useOverdueEntries } from '@/hooks/use-dashboard';
import { CashflowChart } from '@/app/dashboard/components/cashflow-chart';
import { MetricCard } from '@/app/dashboard/components/metric-card';
import { OverdueTable } from '@/app/dashboard/components/overdue-table';

export default function DashboardPage() {
  const summary = useDashboardSummary();
  const cashflow = useCashflowData();
  const overdue = useOverdueEntries();

  const chartData = useMemo(() => cashflow.data ?? [], [cashflow.data]);

  const receivables = useMemo(
    () => (overdue.data ?? []).filter((entry) => entry.type === 'RECEIVABLE').slice(0, 5),
    [overdue.data],
  );

  const payables = useMemo(
    () => (overdue.data ?? []).filter((entry) => entry.type === 'PAYABLE').slice(0, 5),
    [overdue.data],
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Painel financeiro
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Visão consolidada de saldos, vencimentos e fluxo
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Saldo atual"
          value={summary.data?.totalBalance}
          icon={Wallet}
          color="var(--text-primary)"
          isLoading={summary.isLoading}
        />
        <MetricCard
          label="A receber (30d)"
          value={summary.data?.receivable30d}
          icon={TrendingUp}
          color="var(--success)"
          variation={summary.data?.variations?.receivable ?? null}
          isLoading={summary.isLoading}
        />
        <MetricCard
          label="A pagar (30d)"
          value={summary.data?.payable30d}
          icon={TrendingDown}
          color="var(--danger)"
          variation={summary.data?.variations?.payable ?? null}
          isLoading={summary.isLoading}
        />
        <MetricCard
          label="Resultado do mês"
          value={summary.data?.monthResult}
          icon={Target}
          color="var(--accent-text)"
          variation={summary.data?.variations?.result ?? null}
          isLoading={summary.isLoading}
        />
      </div>

      <div className="mb-6">
        <CashflowChart
          data={chartData}
          isLoading={cashflow.isLoading}
          isError={cashflow.isError}
          error={cashflow.error}
          refetch={() => {
            void cashflow.refetch();
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <OverdueTable
          title="Contas a receber vencidas"
          entries={receivables}
          isLoading={overdue.isLoading}
          isError={overdue.isError}
          refetch={() => {
            void overdue.refetch();
          }}
        />
        <OverdueTable
          title="Contas a pagar vencidas"
          entries={payables}
          isLoading={overdue.isLoading}
          isError={overdue.isError}
          refetch={() => {
            void overdue.refetch();
          }}
        />
      </div>
    </div>
  );
}
