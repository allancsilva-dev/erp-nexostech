'use client';

import { memo, useMemo } from 'react';
import Decimal from 'decimal.js';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import type { ExpenseBreakdownItem } from '@/features/dashboard/hooks/use-dashboard';

function ExpenseDonutComponent({ data }: { data: ExpenseBreakdownItem[] }) {
  const limited = useMemo(
    () =>
      data.slice(0, 24).map((item) => ({
        ...item,
        numeric: new Decimal(item.value).toNumber(),
      })),
    [data],
  );

  return (
    <Card>
      <CardTitle>Despesas por categoria</CardTitle>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={limited} dataKey="numeric" nameKey="category" cx="50%" cy="50%" outerRadius={96}>
                {limited.map((entry) => (
                  <Cell key={entry.category} fill={entry.color || '#3B82F6'} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => {
                  const numericValue = new Decimal(String(value ?? '0')).toFixed(2);
                  return formatCurrency(numericValue);
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export const ExpenseDonut = memo(ExpenseDonutComponent);
