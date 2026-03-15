import { PageHeader } from '@/components/layout/page-header';
import { BalanceSheetTable } from '@/features/reports/components/balance-sheet-table';

export default function BalancetePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Balancete" subtitle="Visao consolidada por categorias" />
      <BalanceSheetTable />
    </div>
  );
}
