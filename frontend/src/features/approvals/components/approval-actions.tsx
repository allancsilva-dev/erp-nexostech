'use client';

import { useApprovals } from '@/features/approvals/hooks/use-approvals';

export function ApprovalActions() {
  const { pending } = useApprovals();
  const count = pending.data?.data?.length ?? 0;

  return (
    <div className="surface-card p-4 text-sm">
      <p className="font-medium">Pendencias de aprovacao</p>
      <p className="mt-1 text-slate-500">
        {count === 0 ? 'Nao ha lancamentos aguardando aprovacao.' : `${count} lancamento(s) aguardando decisao.`}
      </p>
    </div>
  );
}
