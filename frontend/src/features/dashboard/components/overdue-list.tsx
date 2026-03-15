'use client';

import Link from 'next/link';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { MoneyDisplay } from '@/components/shared/money-display';
import { formatDate } from '@/lib/format';
import { ROUTES } from '@/lib/constants';
import type { OverdueItem } from '@/features/dashboard/hooks/use-dashboard';

export function OverdueList({ items }: { items: OverdueItem[] }) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <CardTitle>Vencidas</CardTitle>
        <Link className="text-sm text-blue-600" href={ROUTES.contasPagar}>Ver todas</Link>
      </div>
      <CardContent className="space-y-2">
        {items.slice(0, 10).map((item) => (
          <div key={item.id} className="grid grid-cols-5 gap-2 rounded border p-2 text-sm">
            <span className="font-mono">{item.documentNumber}</span>
            <span className="truncate">{item.description}</span>
            <span className="truncate">{item.contactName || '-'}</span>
            <span>{formatDate(item.dueDate)}</span>
            <MoneyDisplay value={item.amount} className="text-right" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
