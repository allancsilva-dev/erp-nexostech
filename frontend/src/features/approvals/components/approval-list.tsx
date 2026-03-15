'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { PermissionGate } from '@/components/shared/permission-gate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApprovals } from '@/features/approvals/hooks/use-approvals';

export function ApprovalList() {
  const { pending, approve, reject } = useApprovals();
  const [reasonById, setReasonById] = useState<Record<string, string>>({});

  if (pending.isLoading) {
    return <TableSkeleton rows={8} cols={4} />;
  }

  if (pending.isError) {
    return <ErrorBanner message={pending.error.message} onRetry={() => pending.refetch()} />;
  }

  const items = pending.data?.data ?? [];

  if (items.length === 0) {
    return (
      <EmptyState
        title="Nenhuma aprovacao pendente"
        description="Assim que houver lancamentos aguardando aprovacao, eles aparecem aqui."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-white p-3 dark:bg-slate-800">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left dark:bg-slate-900/60">
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Documento</th>
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Motivo rejeicao</th>
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Acoes</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b hover:bg-blue-50/50 dark:hover:bg-blue-900/20">
              <td className="px-3 py-2 font-mono">{item.documentNumber}</td>
              <td className="px-3 py-2">
                <Input
                  value={reasonById[item.id] ?? ''}
                  onChange={(event) =>
                    setReasonById((previous) => ({ ...previous, [item.id]: event.target.value }))
                  }
                  placeholder="Obrigatorio para rejeitar"
                />
              </td>
              <td className="px-3 py-2">
                <PermissionGate
                  permission="financial.entries.approve"
                  fallback={<span className="text-xs text-slate-500">Sem permissao para aprovar</span>}
                >
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      disabled={approve.isPending || reject.isPending}
                      onClick={() => approve.mutate(item.id)}
                    >
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={(reasonById[item.id] ?? '').trim().length < 3 || approve.isPending || reject.isPending}
                      onClick={() => reject.mutate({ entryId: item.id, reason: reasonById[item.id] })}
                    >
                      Rejeitar
                    </Button>
                  </div>
                </PermissionGate>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
