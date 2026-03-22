import React from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertCircle, BarChart3 } from 'lucide-react';
import type { NormalizedCashflowPoint } from '@/lib/utils/normalize';

interface CashflowChartProps {
  data: NormalizedCashflowPoint[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export const CashflowChart = React.memo(function CashflowChart({
  data,
  isLoading,
  isError,
  error,
  refetch,
}: CashflowChartProps) {
  if (isLoading) {
    return (
      <div className="surface-card p-5">
        <div className="skeleton mb-4 h-4 w-48" />
        <div className="skeleton h-[240px] w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="surface-card flex items-center justify-between p-4" style={{ background: 'var(--danger-muted)' }}>
        <div className="flex items-center gap-3">
          <AlertCircle size={18} style={{ color: 'var(--danger)' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>
              Falha ao carregar fluxo de caixa
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{error?.message}</p>
          </div>
        </div>
        <button
          onClick={refetch}
          className="rounded-md px-3 py-1.5 text-xs font-medium"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '0.5px solid var(--border-default)' }}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="surface-card flex flex-col items-center justify-center p-8 text-center">
        <BarChart3 size={32} style={{ color: 'var(--text-muted)' }} strokeWidth={1.2} />
        <p className="mt-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Sem dados de fluxo de caixa
        </p>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          Os dados aparecerao quando houver lancamentos registados
        </p>
      </div>
    );
  }

  return (
    <div className="surface-card p-5">
      <h3 className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        Fluxo de caixa - ultimos 12 meses
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border-subtle)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              fontSize: 12,
            }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }} />
          <Bar dataKey="income" name="Entradas" fill="var(--success)" opacity={0.85} radius={[3, 3, 0, 0]} barSize={12} />
          <Bar dataKey="expense" name="Saidas" fill="var(--danger)" opacity={0.85} radius={[3, 3, 0, 0]} barSize={12} />
          <Line dataKey="balance" name="Saldo" stroke="var(--accent-text)" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});
