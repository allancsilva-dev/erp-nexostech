'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { useFeatureFlag } from '@/hooks/use-feature-flags';
import { ApprovalList } from '@/features/approvals/components/approval-list';
import { ApprovalActions } from '@/features/approvals/components/approval-actions';

export default function AprovacoesPage() {
  const enabled = useFeatureFlag('approval_flow_enabled');

  if (!enabled) {
    return (
      <div>
        <PageHeader title="Aprovações" subtitle="Lançamentos aguardando aprovação" />
        <div className="surface-card p-5">
          <EmptyState
            title="Recurso não disponível no seu plano"
            description="Aprovações estão disponíveis apenas nos planos Pro e Enterprise."
            action={<Link href="/configuracoes">Ver planos</Link>}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Aprovações" subtitle="Lançamentos aguardando aprovação" />
      <div className="mb-4 surface-card p-5">
        <ApprovalActions />
      </div>
      <div className="surface-card p-5">
        <ApprovalList />
      </div>
    </div>
  );
}
