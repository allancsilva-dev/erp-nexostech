import { PageHeader } from '@/components/layout/page-header';
import { AgingTable } from '@/features/reports/components/aging-table';

export default function AgingPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Aging" subtitle="Titulos por faixa de vencimento" />
      <AgingTable />
    </div>
  );
}
