import { PageHeader } from '@/components/layout/page-header';
import { BankAccountsCrud } from '@/features/settings/components/bank-accounts-crud';
import { FinancialSettings } from '@/features/settings/components/financial-settings';
import { LockPeriodForm } from '@/features/settings/components/lock-period-form';
import { RolesManager } from '@/features/settings/components/roles-manager';

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Configuracoes" subtitle="Contas, regras e bloqueios" />
      <BankAccountsCrud />
      <FinancialSettings />
      <LockPeriodForm />
      <RolesManager />
    </div>
  );
}
