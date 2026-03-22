import { PageHeader } from '@/components/layout/page-header';
import { CashflowDetailed } from '@/features/reports/components/cashflow-detailed';

export default function FluxoCaixaPage() {
  return (
    <div>
      <PageHeader title="Fluxo de caixa" subtitle="Entradas, saidas e projecao" />
      <div className="surface-card p-5">
        <CashflowDetailed />
      </div>
    </div>
  );
}
