import { PageHeader } from '@/components/layout/page-header';
import { ApprovalList } from '@/features/approvals/components/approval-list';
import { ApprovalActions } from '@/features/approvals/components/approval-actions';

export default function AprovacoesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Aprovacoes" subtitle="Fila de lancamentos pendentes de aprovacao" />
      <ApprovalActions />
      <ApprovalList />
    </div>
  );
}
