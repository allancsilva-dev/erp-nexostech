'use client';

import Link from 'next/link';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { MoneyDisplay } from '@/components/shared/money-display';
import { ROUTES } from '@/lib/constants';
import type { DashboardSummary } from '@/features/dashboard/hooks/use-dashboard';

export function SummaryCards({ data }: { data?: DashboardSummary }) {
  const cards = [
    ['Saldo atual', data?.currentBalance ?? '0.00', ROUTES.dashboard],
    ['A receber 30d', data?.totalReceivable30d ?? '0.00', ROUTES.contasReceber],
    ['A pagar 30d', data?.totalPayable30d ?? '0.00', ROUTES.contasPagar],
    ['Resultado do mes', data?.monthResult ?? '0.00', ROUTES.fluxoCaixa],
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value, href]) => (
        <Link key={label} href={href}>
          <Card className="hover:border-blue-300">
            <CardTitle>{label}</CardTitle>
            <CardContent>
              <MoneyDisplay value={value} colored className="text-xl font-semibold" />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
