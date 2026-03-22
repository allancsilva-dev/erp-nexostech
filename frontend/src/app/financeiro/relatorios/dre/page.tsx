import { PageHeader } from '@/components/layout/page-header';
import { DreTable } from '@/features/reports/components/dre-table';

export default function DrePage() {
  return (
    <div>
      <PageHeader title="DRE" subtitle="Demonstrativo de resultado" />
      <div className="surface-card p-5">
        <DreTable />
      </div>
    </div>
  );
}
