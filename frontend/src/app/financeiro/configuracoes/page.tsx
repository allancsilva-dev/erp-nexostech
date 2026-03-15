'use client';

import { useState } from 'react';
import { ErrorBanner } from '@/components/ui/error-banner';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';

export default function ConfiguracoesPage() {
  const { data, isLoading, isError, error, refetch } = useSettings();
  const updateMutation = useUpdateSettings();

  const [form, setForm] = useState({
    closingDay: 1,
    currency: 'BRL',
    alertDaysBefore: 3,
    emailAlerts: true,
    maxRefundDaysPayable: 90,
    maxRefundDaysReceivable: 180,
  });

  if (isLoading) return <TableSkeleton rows={6} />;
  if (isError) return <ErrorBanner message={(error as Error).message} onRetry={() => refetch()} />;

  const current = data?.data ?? form;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Configuracoes Financeiras</h2>

      <form
        className="grid gap-4 rounded-2xl border border-[#d4d8cb] bg-white p-4 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          updateMutation.mutate({
            ...current,
            ...form,
          });
        }}
      >
        <label className="space-y-1 text-sm">
          <span>Dia de fechamento</span>
          <input
            type="number"
            min={1}
            max={28}
            defaultValue={current.closingDay}
            onChange={(event) => setForm((prev) => ({ ...prev, closingDay: Number(event.target.value) }))}
            className="w-full rounded-xl border border-[#d3d8c5] px-3 py-2"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span>Moeda</span>
          <input
            defaultValue={current.currency}
            onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))}
            className="w-full rounded-xl border border-[#d3d8c5] px-3 py-2"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span>Dias de alerta antes do vencimento</span>
          <input
            type="number"
            defaultValue={current.alertDaysBefore}
            onChange={(event) => setForm((prev) => ({ ...prev, alertDaysBefore: Number(event.target.value) }))}
            className="w-full rounded-xl border border-[#d3d8c5] px-3 py-2"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span>Max estorno contas a pagar (dias)</span>
          <input
            type="number"
            defaultValue={current.maxRefundDaysPayable}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, maxRefundDaysPayable: Number(event.target.value) }))
            }
            className="w-full rounded-xl border border-[#d3d8c5] px-3 py-2"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span>Max estorno contas a receber (dias)</span>
          <input
            type="number"
            defaultValue={current.maxRefundDaysReceivable}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, maxRefundDaysReceivable: Number(event.target.value) }))
            }
            className="w-full rounded-xl border border-[#d3d8c5] px-3 py-2"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            defaultChecked={current.emailAlerts}
            onChange={(event) => setForm((prev) => ({ ...prev, emailAlerts: event.target.checked }))}
          />
          Alertas por e-mail ativos
        </label>

        <button
          type="submit"
          className="md:col-span-2 rounded-xl bg-[#30412f] px-4 py-2 text-sm font-semibold text-white"
        >
          {updateMutation.isPending ? 'Salvando...' : 'Salvar configuracoes'}
        </button>
      </form>
    </section>
  );
}
