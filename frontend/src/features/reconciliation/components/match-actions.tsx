'use client';

import { Button } from '@/components/ui/button';
import { useReconciliation } from '@/features/reconciliation/hooks/use-reconciliation';

export function MatchActions() {
  const reconciliation = useReconciliation();

  const selectedStatementId = reconciliation.state.selectedStatementId;
  const selectedEntryId = reconciliation.state.selectedEntryId;

  async function handleConfirm(): Promise<void> {
    if (!selectedStatementId || !selectedEntryId) {
      return;
    }

    await reconciliation.confirmMatch(selectedStatementId, selectedEntryId);
  }

  async function handleReject(): Promise<void> {
    if (!selectedStatementId) {
      return;
    }

    await reconciliation.rejectMatch(selectedStatementId);
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        onClick={() => void handleConfirm()}
        disabled={!selectedStatementId || !selectedEntryId || reconciliation.isMutating}
      >
        Confirmar match
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => void handleReject()}
        disabled={!selectedStatementId || reconciliation.isMutating}
      >
        Rejeitar
      </Button>
      <Button variant="secondary" size="sm" disabled>
        Criar lancamento
      </Button>
    </div>
  );
}
