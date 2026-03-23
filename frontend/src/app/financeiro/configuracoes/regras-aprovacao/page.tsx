import { PageHeader } from '@/components/layout/page-header';
import { ApprovalRulesManager } from '@/features/settings/components/approval-rules-manager';

export default function RegrasAprovacaoPage() {
  return (
    <div>
      <PageHeader title="Regras de aprovacao" subtitle="Configurar fluxo de aprovacao" />
      <div className="surface-card p-5">
        <ApprovalRulesManager />
      </div>
    </div>
  );
}
