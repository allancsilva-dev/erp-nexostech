'use client';

import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { MoneyDisplay } from '@/components/shared/money-display';
import { useEntryPayments } from '@/features/entries/hooks/use-entries';
import { formatDateTime } from '@/lib/format';

export function EntryPaymentsHistory({ entryId }: { entryId: string }) {
  const payments = useEntryPayments(entryId);

  if (payments.isLoading) {
    return <TableSkeleton rows={6} cols={5} />;
  }

  if (payments.isError) {
    return <ErrorBanner message={payments.error.message} onRetry={() => payments.refetch()} />;
  }

  const list = payments.data?.data ?? [];

  if (list.length === 0) {
    return (
      <EmptyState
        title="Nenhum pagamento registrado"
        description="Este lancamento ainda nao possui pagamentos vinculados."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-white p-3 dark:bg-slate-800">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left dark:bg-slate-900/60">
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Data</th>
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Valor</th>
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Forma</th>
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Conta</th>
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Observacoes</th>
          </tr>
        </thead>
        <tbody>
          {list.map((payment) => (
            <tr key={payment.id} className="border-b hover:bg-blue-50/50 dark:hover:bg-blue-900/20">
              <td className="px-3 py-2">{formatDateTime(payment.createdAt)}</td>
              <td className="px-3 py-2">
                <MoneyDisplay value={payment.amount} />
              </td>
              <td className="px-3 py-2">{payment.paymentMethod ?? '-'}</td>
              <td className="px-3 py-2">{payment.bankAccountId ?? '-'}</td>
              <td className="px-3 py-2">{payment.notes ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
