'use client';

import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { BoletoActions } from '@/features/boletos/components/boleto-actions';
import { useBoletos, type BoletoFilters } from '@/features/boletos/hooks/use-boletos';

interface BoletoItem {
  id: string;
  entryId?: string;
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

export function BoletoList({ filters }: { filters?: BoletoFilters }) {
  const boletos = useBoletos(filters);

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
    <div className="surface-card overflow-x-auto p-3">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b text-left bg-[var(--bg-surface-raised)]">
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Número</th>
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Status</th>
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Valor</th>
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Vencimento</th>
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Ações</th>
          </tr>
        </thead>
        <tbody>
          {list.map((boleto) => (
            <tr key={boleto.id} className="border-b hover:bg-blue-50/50 dark:hover:bg-blue-900/20">
              <td className="px-3 py-2 font-mono">{boleto.number ?? boleto.id}</td>
              <td className="px-3 py-2">{boleto.status ?? '-'}</td>
              <td className="px-3 py-2">{boleto.amount ?? '-'}</td>
              <td className="px-3 py-2">{boleto.dueDate ?? '-'}</td>
              <td className="px-3 py-2">
                <BoletoActions entryId={boleto.entryId ?? boleto.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
