'use client';

import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { useBoletos } from '@/features/boletos/hooks/use-boletos';

interface BoletoItem {
  id: string;
  number?: string;
  status?: string;
  amount?: string;
  dueDate?: string;
}

function toBoletoList(value: unknown): BoletoItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is BoletoItem => {
    if (typeof item !== 'object' || !item || !('id' in item)) {
      return false;
    }
    return typeof (item as { id: unknown }).id === 'string';
  });
}

export function BoletoList() {
  const boletos = useBoletos();

  if (boletos.isLoading) {
    return <TableSkeleton rows={8} cols={5} />;
  }

  if (boletos.isError) {
    return <ErrorBanner message={boletos.error.message} onRetry={() => boletos.refetch()} />;
  }

  const list = toBoletoList(boletos.data?.data);

  if (list.length === 0) {
    return <EmptyState title="Nenhum boleto encontrado" description="Sem boletos para a filial ativa." />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-white p-3 dark:bg-slate-800">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left dark:bg-slate-900/60">
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Numero</th>
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Status</th>
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Valor</th>
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Vencimento</th>
          </tr>
        </thead>
        <tbody>
          {list.map((boleto) => (
            <tr key={boleto.id} className="border-b hover:bg-blue-50/50 dark:hover:bg-blue-900/20">
              <td className="px-3 py-2 font-mono">{boleto.number ?? boleto.id}</td>
              <td className="px-3 py-2">{boleto.status ?? '-'}</td>
              <td className="px-3 py-2">{boleto.amount ?? '-'}</td>
              <td className="px-3 py-2">{boleto.dueDate ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
