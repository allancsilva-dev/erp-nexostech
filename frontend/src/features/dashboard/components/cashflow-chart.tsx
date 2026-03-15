'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import type { CashflowPoint } from '@/features/dashboard/hooks/use-dashboard';

export function CashflowChart({ data }: { data: CashflowPoint[] }) {
  const limited = data.slice(0, 24).map((item) => ({
    ...item,
    incomingValue: Number(item.incoming),
    outgoingValue: Number(item.outgoing),
  }));

  return (
    <Card>
      <CardTitle>Fluxo de caixa</CardTitle>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={limited}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip
                formatter={(value) => {
                  const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
                  return formatCurrency(numericValue.toFixed(2));
                }}
              />
              <Line type="monotone" dataKey="incomingValue" stroke="#10B981" strokeWidth={2} />
              <Line type="monotone" dataKey="outgoingValue" stroke="#EF4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
