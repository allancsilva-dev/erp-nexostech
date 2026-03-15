import { PageHeader } from '@/components/layout/page-header';
import { DreTable } from '@/features/reports/components/dre-table';

export default function DrePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="DRE" subtitle="Receitas, despesas e resultado liquido" />
      <DreTable />
    </div>
  );
}
