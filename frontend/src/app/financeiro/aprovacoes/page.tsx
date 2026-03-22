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
      <EmptyState
        title="Recurso nao disponivel no seu plano"
        description="Aprovacoes estao disponiveis apenas nos planos Pro e Enterprise."
        action={<Link href="/configuracoes">Ver planos</Link>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Aprovacoes" subtitle="Fila de lancamentos pendentes de aprovacao" />
      <ApprovalActions />
      <ApprovalList />
    </div>
  );
}
