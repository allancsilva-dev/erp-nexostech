'use client';

import { useEntry } from '@/features/entries/hooks/use-entries';
import { MoneyDisplay } from '@/components/shared/money-display';
import { StatusBadge } from '@/components/shared/status-badge';
import { PermissionGate } from '@/components/shared/permission-gate';
import { LockPeriodGuard } from '@/components/shared/lock-period-guard';
import { PaymentModal } from '@/features/entries/components/payment-modal';
import { CancelModal } from '@/features/entries/components/cancel-modal';
import { RefundModal } from '@/features/entries/components/refund-modal';
import { Button } from '@/components/ui/button';

export function EntryDetail({ id }: { id: string }) {
  const { data, isLoading } = useEntry(id);

  if (isLoading) {
    return <p>Carregando...</p>;
  }

  const entry = data?.data;
  if (!entry) {
    return <p>Lancamento nao encontrado.</p>;
  }

  return (
    <div className="space-y-4 rounded-xl border bg-white p-6 dark:bg-slate-800">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{entry.documentNumber ?? 'Sem numero'}</h2>
        <StatusBadge status={entry.status} type={entry.type} />
      </div>
      <div className="flex flex-wrap gap-2">
        {entry.status === 'PENDING' ? (
          <PermissionGate permission="financial.entries.edit">
            <LockPeriodGuard date={entry.issueDate}>
              <Button type="button" variant="outline" disabled>
                Editar
              </Button>
            </LockPeriodGuard>
          </PermissionGate>
        ) : null}
        <PermissionGate permission="financial.entries.pay">
          <LockPeriodGuard date={new Date().toISOString().slice(0, 10)}>
            <PaymentModal entryId={entry.id} />
          </LockPeriodGuard>
        </PermissionGate>
        {entry.status !== 'PAID' && entry.status !== 'CANCELLED' ? (
          <PermissionGate permission="financial.entries.cancel">
            <LockPeriodGuard date={entry.issueDate}>
              <CancelModal entryId={entry.id} />
            </LockPeriodGuard>
          </PermissionGate>
        ) : null}
        {entry.paidDate ? (
          <PermissionGate permission="financial.entries.cancel">
            <LockPeriodGuard date={entry.paidDate}>
              <RefundModal entryId={entry.id} />
            </LockPeriodGuard>
          </PermissionGate>
        ) : null}
      </div>
      <p>{entry.description}</p>
      <MoneyDisplay value={entry.amount} className="text-lg" />
      <p className="text-sm text-slate-500">Categoria: {entry.categoryName}</p>
      <p className="text-sm text-slate-500">Contato: {entry.contactName ?? '-'}</p>
      <p className="text-sm text-slate-500">Observacoes: {entry.notes ?? '-'}</p>
    </div>
  );
}
