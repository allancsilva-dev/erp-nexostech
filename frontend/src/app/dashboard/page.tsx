'use client';

import Decimal from 'decimal.js';
import { ErrorBanner } from '@/components/ui/error-banner';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { useDashboardSummary } from '@/hooks/use-dashboard-summary';

function formatCurrency(value: string) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(new Decimal(value).toFixed(2)),
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDashboardSummary();

  if (isLoading) return <TableSkeleton rows={4} />;
  if (isError) return <ErrorBanner message={(error as Error).message} onRetry={() => refetch()} />;

  const summary = data?.data;
  if (!summary) return <ErrorBanner message="Resumo indisponivel" onRetry={() => refetch()} />;

  const cards = [
    { title: 'Saldo Atual', value: summary.currentBalance },
    { title: 'A Receber (30d)', value: summary.totalReceivable30d },
    { title: 'A Pagar (30d)', value: summary.totalPayable30d },
    { title: 'Resultado do Mes', value: summary.monthResult },
  ];

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Dashboard Financeiro</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.title} className="rounded-2xl border border-[#d4d8cb] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#67705b]">{card.title}</p>
            <p className="mt-2 text-2xl font-semibold text-[#253226]">{formatCurrency(card.value)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
