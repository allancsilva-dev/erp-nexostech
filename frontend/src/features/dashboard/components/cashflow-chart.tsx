'use client';

import { memo, useMemo } from 'react';
import Decimal from 'decimal.js';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import type { CashflowPoint } from '@/features/dashboard/hooks/use-dashboard';

function CashflowChartComponent({ data }: { data: CashflowPoint[] }) {
  const limited = useMemo(
    () =>
      data.slice(0, 24).map((item) => ({
        ...item,
        incomingValue: new Decimal(item.incoming).toNumber(),
        outgoingValue: new Decimal(item.outgoing).toNumber(),
      })),
    [data],
  );

  return (
    <Card className="p-0">
      <CardTitle>Fluxo de caixa</CardTitle>
      <CardContent className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={limited}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip
                formatter={(value) => {
                  const numericValue = new Decimal(String(value ?? '0')).toFixed(2);
                  return formatCurrency(numericValue);
                }}
              />
              <Line type="monotone" dataKey="incomingValue" stroke="var(--success)" strokeWidth={2} />
              <Line type="monotone" dataKey="outgoingValue" stroke="var(--danger)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export const CashflowChart = memo(CashflowChartComponent);
