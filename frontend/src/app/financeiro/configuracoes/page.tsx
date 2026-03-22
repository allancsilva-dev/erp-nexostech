import { PageHeader } from '@/components/layout/page-header';
import { BankAccountsCrud } from '@/features/settings/components/bank-accounts-crud';
import { FinancialSettings } from '@/features/settings/components/financial-settings';
import { LockPeriodForm } from '@/features/settings/components/lock-period-form';
import { RolesManager } from '@/features/settings/components/roles-manager';

export default function ConfiguracoesPage() {
  return (
    <div>
      <PageHeader title="Configuracoes" subtitle="Configuracoes do modulo financeiro" />
      <div className="mb-4 surface-card p-5">
        <FinancialSettings />
      </div>
      <div className="mb-4 surface-card p-5">
        <BankAccountsCrud />
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
