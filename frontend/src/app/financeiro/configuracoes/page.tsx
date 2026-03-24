import { PageHeader } from '@/components/layout/page-header';
import { BankAccountsCrud } from '@/features/settings/components/bank-accounts-crud';
import { FinancialSettings } from '@/features/settings/components/financial-settings';
import { LockPeriodForm } from '@/features/settings/components/lock-period-form';
import { ApprovalRulesManager } from '@/features/settings/components/approval-rules-manager';
import { RolesManager } from '@/features/settings/components/roles-manager';

export default function ConfiguracoesPage() {
  return (
    <div>
      <PageHeader title="Configurações" subtitle="Configurações do módulo financeiro" />
      <div className="mb-4 surface-card p-5">
        <FinancialSettings />
      </div>
      <div className="mb-4 surface-card p-5">
        <BankAccountsCrud />
      </div>
      <div className="mb-4 surface-card p-5">
        <ApprovalRulesManager />
      </div>
      <div className="mb-4 surface-card p-5">
        <RolesManager />
      </div>
      <div className="surface-card p-5">
        <LockPeriodForm />
      </div>
    </div>
  );
}
