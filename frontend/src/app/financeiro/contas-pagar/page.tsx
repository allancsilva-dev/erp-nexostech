'use client';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { useEntries } from '@/hooks/use-entries';

export default function ContasPagarPage() {
  const { data, isLoading, isError, error, refetch } = useEntries({ page: 1, pageSize: 20 });

  if (isLoading) return <TableSkeleton rows={10} />;
  if (isError) return <ErrorBanner message={(error as Error).message} onRetry={() => refetch()} />;
  if (!data?.data.length) return <EmptyState message="Nenhum lancamento encontrado" />;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Contas a Pagar</h2>
      <div className="overflow-hidden rounded-2xl border border-[#d4d8cb] bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#f3f5ec] text-left text-xs uppercase tracking-[0.12em] text-[#5d6651]">
            <tr>
              <th className="px-4 py-3">Codigo</th>
              <th className="px-4 py-3">Descricao</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Vencimento</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((entry) => (
              <tr key={entry.id} className="border-t border-[#ecefe2]">
                <td className="px-4 py-3 font-mono text-xs">{entry.documentNumber}</td>
                <td className="px-4 py-3">{entry.description}</td>
                <td className="px-4 py-3">{entry.categoryName}</td>
                <td className="px-4 py-3">{entry.dueDate}</td>
                <td className="px-4 py-3">R$ {entry.amount}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-[#e8ecdd] px-2 py-1 text-xs font-semibold text-[#3f4a35]">
                    {entry.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
