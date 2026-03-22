import { PageHeader } from '@/components/layout/page-header';
import { BankAccountsCrud } from '@/features/settings/components/bank-accounts-crud';

export default function ContasBancariasPage() {
  return (
    <div>
      <PageHeader title="Contas bancarias" subtitle="Gerenciar contas da filial" />
      <div className="surface-card p-5">
        <BankAccountsCrud />
      </div>
    </div>
  );
}
