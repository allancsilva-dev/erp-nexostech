import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';

interface MetricCardProps {
  label: string;
  value: string | number | null | undefined;
  icon: LucideIcon;
  color: string;
  variation?: number | null;
  isLoading: boolean;
}

export const MetricCard = React.memo(function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  variation,
  isLoading,
}: MetricCardProps) {
  if (isLoading) {
    return (
      <div className="surface-card p-4">
        <div className="skeleton mb-3 h-3 w-20" />
        <div className="skeleton mb-2 h-7 w-32" />
        <div className="skeleton h-3 w-24" />
      </div>
    );
  }

  return (
    <div className="surface-card-interactive cursor-default p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
        <Icon size={15} style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
      </div>
      <span className="text-[22px] font-semibold tabular-nums" style={{ color }}>
        {formatCurrency(value)}
      </span>
      {variation != null && variation !== 0 ? (
        <div className="mt-1 flex items-center gap-1">
          {variation > 0 ? (
            <TrendingUp size={12} style={{ color: 'hsl(var(--success))' }} />
          ) : (
            <TrendingDown size={12} style={{ color: 'hsl(var(--danger))' }} />
          )}
          <span
            className="text-[11px] font-medium"
            style={{ color: variation > 0 ? 'hsl(var(--success))' : 'hsl(var(--danger))' }}
          >
            {variation > 0 ? '+' : ''}
            {variation.toFixed(1)}% vs mes anterior
          </span>
        </div>
      ) : null}
    </div>
  );
});
