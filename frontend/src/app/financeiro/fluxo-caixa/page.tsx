import { PageHeader } from '@/components/layout/page-header';
import { CashflowDetailed } from '@/features/reports/components/cashflow-detailed';

export default function FluxoCaixaPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Fluxo de caixa" subtitle="Entradas, saidas e saldo acumulado" />
      <CashflowDetailed />
    </div>
  );
}
