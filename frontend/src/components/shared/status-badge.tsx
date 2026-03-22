import type { EntryStatus } from '@/features/entries/types/entry.types';
import { Badge } from '@/components/ui/badge';

const STATUS_COLORS: Record<EntryStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700',
  PENDING: 'bg-blue-50 text-blue-700',
  PARTIAL: 'bg-purple-50 text-purple-700',
  PAID: 'bg-emerald-50 text-emerald-700',
  OVERDUE: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-500 line-through',
};

const STATUS_LABELS: Record<EntryStatus, string> = {
  DRAFT: 'Rascunho',
  PENDING_APPROVAL: 'Aguard. Aprovacao',
  PENDING: 'Pendente',
  PARTIAL: 'Parcial',
  PAID: 'Pago',
  OVERDUE: 'Vencido',
  CANCELLED: 'Cancelado',
};

export function StatusBadge({
  status,
  type,
}: {
  status: EntryStatus;
  type?: 'PAYABLE' | 'RECEIVABLE';
}) {
  const label = status === 'PAID' && type === 'RECEIVABLE' ? 'Recebido' : STATUS_LABELS[status];
  return <Badge className={STATUS_COLORS[status]}>{label}</Badge>;
}
