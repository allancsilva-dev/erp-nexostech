'use client';

import { useApprovals } from '@/features/approvals/hooks/use-approvals';

export function ApprovalActions() {
  const { pending } = useApprovals();
  const count = pending.data?.data?.length ?? 0;

  return (
    <div className="surface-card p-4 text-sm">
      <p className="font-medium">Pendências de aprovação</p>
      <p className="mt-1 text-slate-500">
        {count === 0 ? 'Não há lançamentos aguardando aprovação.' : `${count} lançamento(s) aguardando decisão.`}
      </p>
    </div>
  );
}
