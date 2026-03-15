'use client';

import { useEntry } from '@/features/entries/hooks/use-entries';
import { MoneyDisplay } from '@/components/shared/money-display';
import { StatusBadge } from '@/components/shared/status-badge';

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
        <h2 className="text-xl font-semibold">{entry.documentNumber}</h2>
        <StatusBadge status={entry.status} />
      </div>
      <p>{entry.description}</p>
      <MoneyDisplay value={entry.amount} className="text-lg" />
      <p className="text-sm text-slate-500">Categoria: {entry.categoryName}</p>
      <p className="text-sm text-slate-500">Contato: {entry.contactName ?? '-'}</p>
      <p className="text-sm text-slate-500">Observacoes: {entry.notes ?? '-'}</p>
    </div>
  );
}
