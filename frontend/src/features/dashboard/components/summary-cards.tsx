'use client';

import { memo, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { MoneyDisplay } from '@/components/shared/money-display';
import { ROUTES } from '@/lib/constants';
import type { DashboardSummary } from '@/features/dashboard/hooks/use-dashboard';

function SummaryCardsComponent({ data }: { data?: DashboardSummary }) {
  const cards = useMemo(
    () => [
      ['Saldo atual', data?.currentBalance ?? '0.00', ROUTES.dashboard],
      ['A receber 30d', data?.totalReceivable30d ?? '0.00', ROUTES.contasReceber],
      ['A pagar 30d', data?.totalPayable30d ?? '0.00', ROUTES.contasPagar],
      ['Resultado do mês', data?.monthResult ?? '0.00', ROUTES.fluxoCaixa],
    ] as const,
    [data?.currentBalance, data?.monthResult, data?.totalPayable30d, data?.totalReceivable30d],
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value, href]) => (
        <Link key={label} href={href}>
          <Card className="transition-transform duration-150 hover:-translate-y-0.5">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              {label}
            </CardTitle>
            <CardContent className="space-y-1">
              <MoneyDisplay value={value} colored className="text-[22px] font-bold leading-tight" />
              <p className="text-[12px] text-[var(--text-secondary)]">Atualizado em tempo real</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export const SummaryCards = memo(SummaryCardsComponent);
