import React from 'react';
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
    <div className="surface-card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
        <Icon size={15} style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
      </div>
      <span className="text-[22px] font-semibold tabular-nums" style={{ color }}>
        {formatCurrency(value)}
      </span>
      {variation != null ? (
        <span className="text-[11px]" style={{ color: variation >= 0 ? 'var(--success)' : 'var(--danger)' }}>
          {variation >= 0 ? '↑' : '↓'} {Math.abs(variation)}% vs mes anterior
        </span>
      ) : null}
    </div>
  );
});
