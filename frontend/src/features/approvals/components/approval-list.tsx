'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { PermissionGate } from '@/components/shared/permission-gate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApprovalHistory } from '@/features/approvals/components/approval-history';
import { useApprovals } from '@/features/approvals/hooks/use-approvals';

type ApprovalTab = 'pending' | 'history';

export function ApprovalList() {
  const { pending, history, approve, reject, batchApprove } = useApprovals();
  const [tab, setTab] = useState<ApprovalTab>('pending');
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);

  if (pending.isLoading || history.isLoading) {
    return <TableSkeleton rows={8} cols={4} />;
  }

  if (pending.isError) {
    return <ErrorBanner message={pending.error.message} onRetry={() => pending.refetch()} />;
  }

  if (history.isError) {
    return <ErrorBanner message={history.error.message} onRetry={() => history.refetch()} />;
  }

  const items = pending.data?.data ?? [];
  const historyItems = history.data?.data ?? [];
  const selectedCount = selectedEntryIds.length;

  const allSelected = items.length > 0 && selectedEntryIds.length === items.length;

  function toggleSelection(entryId: string): void {
    setSelectedEntryIds((current) =>
      current.includes(entryId)
        ? current.filter((id) => id !== entryId)
        : [...current, entryId],
    );
  }

  function toggleAll(): void {
    if (allSelected) {
      setSelectedEntryIds([]);
      return;
    }

    setSelectedEntryIds(items.map((item) => item.entryId));
  }

  async function handleBatchApprove(): Promise<void> {
    if (selectedEntryIds.length === 0) {
      return;
    }

    await batchApprove.mutateAsync(selectedEntryIds);
    setSelectedEntryIds([]);
  }

  if (tab === 'pending' && items.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <Button type="button" size="sm" variant={tab === 'pending' ? 'primary' : 'outline'} onClick={() => setTab('pending')}>
            Pendentes
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setTab('history')}>
            Historico
          </Button>
        </div>
        <EmptyState
          title="Nenhuma aprovacao pendente"
          description="Assim que houver lancamentos aguardando aprovacao, eles aparecem aqui."
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button type="button" size="sm" variant={tab === 'pending' ? 'primary' : 'outline'} onClick={() => setTab('pending')}>
          Pendentes
        </Button>
        <Button type="button" size="sm" variant={tab === 'history' ? 'primary' : 'outline'} onClick={() => setTab('history')}>
          Historico
        </Button>
      </div>

      {tab === 'history' ? (
        <ApprovalHistory items={historyItems} />
      ) : (
        <div className="surface-card overflow-x-auto p-3">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left bg-[var(--bg-surface-raised)]">
                <th className="px-3 py-2">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                </th>
                <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Documento</th>
                <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Valor</th>
                <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Contato</th>
                <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Motivo rejeicao</th>
                <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.entryId} className="border-b hover:bg-blue-50/50 dark:hover:bg-blue-900/20">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedEntryIds.includes(item.entryId)}
                      onChange={() => toggleSelection(item.entryId)}
                    />
                  </td>
                  <td className="px-3 py-2 font-mono">{item.documentNumber}</td>
                  <td className="px-3 py-2">R$ {item.amount}</td>
                  <td className="px-3 py-2">{item.contactName ?? '-'}</td>
                  <td className="px-3 py-2">
                    <Input
                      value={reasonById[item.entryId] ?? ''}
                      onChange={(event) =>
                        setReasonById((previous) => ({ ...previous, [item.entryId]: event.target.value }))
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
                          disabled={approve.isPending || reject.isPending || batchApprove.isPending}
                          onClick={() => approve.mutate(item.entryId)}
                        >
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={(reasonById[item.entryId] ?? '').trim().length < 3 || approve.isPending || reject.isPending || batchApprove.isPending}
                          onClick={() => reject.mutate({ entryId: item.entryId, reason: reasonById[item.entryId] })}
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
      )}

      {tab === 'pending' && selectedCount > 0 ? (
        <PermissionGate permission="financial.entries.approve">
          <div className="surface-card sticky bottom-4 z-10 flex items-center justify-between p-3 shadow-md">
            <span className="text-sm font-medium">{selectedCount} selecionados</span>
            <Button type="button" onClick={() => void handleBatchApprove()} disabled={batchApprove.isPending}>
              {batchApprove.isPending ? 'Processando...' : 'Aprovar todos'}
            </Button>
          </div>
        </PermissionGate>
      ) : null}
    </div>
  );
}
