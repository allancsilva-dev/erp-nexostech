import { PageHeader } from '@/components/layout/page-header';
import { BalanceSheetTable } from '@/features/reports/components/balance-sheet-table';

export default function BalancetePage() {
  return (
    <div>
      <PageHeader title="Balancete" subtitle="Movimentacao por categoria" />
      <div className="surface-card p-5">
        <BalanceSheetTable />
      </div>
    </div>
  );
}
