'use client';

import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { useReconciliation } from '@/features/reconciliation/hooks/use-reconciliation';
import { StatusBadge } from '@/components/shared/status-badge';


export function SplitView() {
  const reconciliation = useReconciliation();

  if (reconciliation.isLoading) {
    return <TableSkeleton rows={8} cols={6} />;
  }

  if (reconciliation.error) {
    return <ErrorBanner message={reconciliation.error} />;
  }

  const statementItems = reconciliation.items;
  const entries = reconciliation.entries;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="surface-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Extrato bancário</h3>
        {statementItems.length === 0 ? (
          <EmptyState title="Sem itens para conciliar" description="Importe um lote ou aguarde itens pendentes de conciliação." />
        ) : (
          <div className="max-h-96 overflow-auto rounded-lg border">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left" style={{ background: 'var(--bg-surface-raised)' }}>
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 font-medium">Valor</th>
                  <th className="px-3 py-2 font-medium">Entry vinculada</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {statementItems.map((item) => {
                  const isSelected = reconciliation.state.selectedStatementId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="cursor-pointer border-b transition-colors"
                      style={{
                        background: isSelected
                          ? 'var(--accent-muted)'
                          : 'transparent',
                      }}
                      onClick={() => reconciliation.selectStatement(item.id)}
                    >
                      <td className="px-3 py-2">{item.paymentDate}</td>
                      <td className="px-3 py-2 font-semibold">{item.amount}</td>
                      <td className="px-3 py-2">{item.entryId || '-'}</td>
                      <td className="px-3 py-2 font-semibold"><StatusBadge status={item.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="surface-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Lançamentos ERP</h3>
        {entries.length === 0 ? (
          <EmptyState title="Sem lançamentos" description="Não há lançamentos disponíveis para vínculo no momento." />
        ) : (
          <div className="max-h-96 overflow-auto rounded-lg border">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left" style={{ background: 'var(--bg-surface-raised)' }}>
                  <th className="px-3 py-2 font-medium">Descrição</th>
                  <th className="px-3 py-2 font-medium">Valor</th>
                  <th className="px-3 py-2 font-medium">Vencimento</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const isSelected = reconciliation.state.selectedEntryId === entry.id;

                  return (
                    <tr
                      key={entry.id}
                      className="cursor-pointer border-b transition-colors"
                      style={{
                        background: isSelected
                          ? 'var(--accent-muted)'
                          : 'transparent',
                      }}
                      onClick={() => reconciliation.selectEntry(entry.id)}
                    >
                      <td className="px-3 py-2">{entry.description}</td>
                      <td className="px-3 py-2 font-semibold">{entry.amount}</td>
                      <td className="px-3 py-2">{entry.dueDate}</td>
                      <td className="px-3 py-2"><StatusBadge status={entry.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
