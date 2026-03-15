'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { useApproveEntry, usePendingApprovals, useRejectEntry } from '@/hooks/use-approvals';

export default function AprovacoesPage() {
  const { data, isLoading, isError, error, refetch } = usePendingApprovals();
  const approveMutation = useApproveEntry();
  const rejectMutation = useRejectEntry();
  const [reason, setReason] = useState('Rejeitado pela analise financeira');

  if (isLoading) return <TableSkeleton rows={8} />;
  if (isError) return <ErrorBanner message={(error as Error).message} onRetry={() => refetch()} />;
  if (!data?.data.length) return <EmptyState message="Nenhuma aprovacao pendente" />;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Aprovacoes Pendentes</h2>
      <div className="overflow-hidden rounded-2xl border border-[#d4d8cb] bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#f3f5ec] text-left text-xs uppercase tracking-[0.12em] text-[#5d6651]">
            <tr>
              <th className="px-4 py-3">Entry</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((item) => (
              <tr key={item.id} className="border-t border-[#ecefe2]">
                <td className="px-4 py-3 font-mono text-xs">{item.entryId}</td>
                <td className="px-4 py-3">R$ {item.amount}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-lg bg-[#2f5b35] px-3 py-1.5 text-xs font-semibold text-white"
                      onClick={() => approveMutation.mutate(item.entryId)}
                    >
                      Aprovar
                    </button>
                    <button
                      className="rounded-lg bg-[#8d2a1f] px-3 py-1.5 text-xs font-semibold text-white"
                      onClick={() => rejectMutation.mutate({ entryId: item.entryId, reason })}
                    >
                      Rejeitar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <label className="block space-y-1 text-sm">
        <span>Motivo padrao de rejeicao</span>
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="w-full rounded-xl border border-[#d3d8c5] bg-white px-3 py-2"
        />
      </label>
    </section>
  );
}
