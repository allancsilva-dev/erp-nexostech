'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { useFeatureFlag } from '@/hooks/use-feature-flags';
import { BoletoList } from '@/features/boletos/components/boleto-list';

export default function BoletosPage() {
  const enabled = useFeatureFlag('boletos_enabled');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'PENDENTE' | 'PAGO' | 'CANCELADO' | 'VENCIDO' | ''>('');
  const [contactId, setContactId] = useState('');

  const filters = useMemo(
    () => ({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      status: status || undefined,
      contactId: contactId || undefined,
    }),
    [contactId, endDate, startDate, status],
  );

  if (!enabled) {
    return (
      <div>
        <PageHeader title="Boletos" subtitle="Emissao e acompanhamento" />
        <div className="surface-card p-5">
          <EmptyState
            title="Recurso nao disponivel no seu plano"
            description="Boletos estao disponiveis apenas nos planos Pro e Enterprise."
            action={<Link href="/configuracoes">Ver planos</Link>}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Boletos" subtitle="Emissao e acompanhamento" />
      <div className="mb-4 surface-card p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-xs font-semibold uppercase tracking-wide">
            Data inicial
            <input type="date" className="mt-1 h-10 w-full rounded-md border px-3 text-sm" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide">
            Data final
            <input type="date" className="mt-1 h-10 w-full rounded-md border px-3 text-sm" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide">
            Status
            <select className="mt-1 h-10 w-full rounded-md border px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value as 'PENDENTE' | 'PAGO' | 'CANCELADO' | 'VENCIDO' | '')}>
              <option value="">Todos</option>
              <option value="PENDENTE">Pendente</option>
              <option value="PAGO">Pago</option>
              <option value="CANCELADO">Cancelado</option>
              <option value="VENCIDO">Vencido</option>
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide">
            Contact ID
            <input type="text" className="mt-1 h-10 w-full rounded-md border px-3 text-sm" placeholder="UUID do contato" value={contactId} onChange={(event) => setContactId(event.target.value)} />
          </label>
        </div>
      </div>
      <div className="surface-card p-5">
        <BoletoList filters={filters} />
      </div>
    </div>
  );
}
