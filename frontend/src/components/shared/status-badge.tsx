import React from 'react';

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  DRAFT: { label: 'Rascunho', bg: 'var(--bg-surface-raised)', text: 'var(--text-muted)' },
  PENDING_APPROVAL: { label: 'Aguard. Aprovação', bg: 'var(--warning-muted)', text: 'var(--warning)' },
  PENDING: { label: 'Pendente', bg: 'var(--info-muted)', text: 'var(--info)' },
  PARTIAL: { label: 'Parcial', bg: '239 50% 50% / 0.12', text: 'var(--accent-text)' },
  PAID: { label: 'Pago', bg: 'var(--success-muted)', text: 'var(--success)' },
  OVERDUE: { label: 'Vencido', bg: 'var(--danger-muted)', text: 'var(--danger)' },
  CANCELLED: { label: 'Cancelado', bg: 'var(--bg-surface-raised)', text: 'var(--text-muted)' },
};

interface StatusBadgeProps {
  status: string;
  type?: 'PAYABLE' | 'RECEIVABLE';
}

export const StatusBadge = React.memo(function StatusBadge({ status, type }: StatusBadgeProps) {
  const config = STATUS_MAP[status] ?? STATUS_MAP.DRAFT;
  const label = status === 'PAID' && type === 'RECEIVABLE' ? 'Recebido' : config.label;

  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{ background: `hsl(${config.bg})`, color: `hsl(${config.text})` }}
    >
      {label}
    </span>
  );
});
