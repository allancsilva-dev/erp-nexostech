import { PageHeader } from '@/components/layout/page-header';
import { RolesManager } from '@/features/settings/components/roles-manager';

export default function RegrasAprovacaoPage() {
  return (
    <div>
      <PageHeader title="Regras de aprovacao" subtitle="Configurar fluxo de aprovacao" />
      <div className="surface-card p-5">
        <RolesManager />
      </div>
    </div>
  );
}
