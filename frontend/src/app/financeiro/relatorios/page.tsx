'use client';

import { useMemo, useState } from 'react';
import Decimal from 'decimal.js';
import { ErrorBanner } from '@/components/ui/error-banner';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { useDre } from '@/hooks/use-reports';

function toCurrency(value: string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(new Decimal(value).toFixed(2)),
  );
}

export default function RelatoriosPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today.slice(0, 8) + '01');
  const [endDate, setEndDate] = useState(today);

  const { data, isLoading, isError, error, refetch } = useDre(startDate, endDate);

  const cards = useMemo(() => {
    const dre = data?.data;
    if (!dre) return null;
    return [
      { label: 'Receita Bruta', value: dre.revenueTotal },
      { label: 'Despesas', value: dre.expenseTotal },
      { label: 'Resultado', value: dre.netResult },
    ];
  }, [data]);

  if (isLoading) return <TableSkeleton rows={3} />;
  if (isError) return <ErrorBanner message={(error as Error).message} onRetry={() => refetch()} />;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Relatorios Financeiros</h2>

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#d4d8cb] bg-white p-4 md:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span>Inicio</span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="w-full rounded-xl border border-[#d3d8c5] px-3 py-2"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>Fim</span>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="w-full rounded-xl border border-[#d3d8c5] px-3 py-2"
          />
        </label>
        <button
          className="self-end rounded-xl bg-[#30412f] px-4 py-2 text-sm font-semibold text-white"
          onClick={() => refetch()}
        >
          Atualizar DRE
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards?.map((card) => (
          <article key={card.label} className="rounded-2xl border border-[#d4d8cb] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#647056]">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-[#243125]">{toCurrency(card.value)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
