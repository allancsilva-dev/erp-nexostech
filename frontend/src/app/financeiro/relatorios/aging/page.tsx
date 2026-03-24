import { PageHeader } from '@/components/layout/page-header';
import { AgingTable } from '@/features/reports/components/aging-table';

export default function AgingPage() {
  return (
    <div>
      <PageHeader title="Vencimentos" subtitle="Análise de vencimentos" />
      <div className="surface-card p-5">
        <AgingTable />
      </div>
    </div>
  );
}
