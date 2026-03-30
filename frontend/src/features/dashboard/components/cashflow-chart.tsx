'use client';

import { memo, useMemo } from 'react';
import Decimal from 'decimal.js';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import type { NormalizedCashflowPoint } from '@/lib/utils/normalize';

function CashflowChartComponent({ data }: { data: NormalizedCashflowPoint[] }) {
  const limited = useMemo(
    () =>
      data.slice(0, 24).map((item) => ({
        ...item,
        actualInflowValue: new Decimal(item.actualInflow ?? '0').toNumber(),
        actualOutflowValue: new Decimal(item.actualOutflow ?? '0').toNumber(),
        forecastInflowValue: new Decimal(item.forecastInflow ?? '0').toNumber(),
        forecastOutflowValue: new Decimal(item.forecastOutflow ?? '0').toNumber(),
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
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value) => {
                  const numericValue = new Decimal(String(value ?? '0')).toFixed(2);
                  return formatCurrency(numericValue);
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="actualInflowValue" stroke="var(--success)" strokeWidth={2} name="Recebido" />
              <Line type="monotone" dataKey="actualOutflowValue" stroke="var(--danger)" strokeWidth={2} name="Pago" />
              <Line type="monotone" dataKey="forecastInflowValue" stroke="var(--success)" strokeWidth={2} strokeDasharray="5 5" name="Previsto Entrada" />
              <Line type="monotone" dataKey="forecastOutflowValue" stroke="var(--danger)" strokeWidth={2} strokeDasharray="5 5" name="Previsto Saída" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export const CashflowChart = memo(CashflowChartComponent);
