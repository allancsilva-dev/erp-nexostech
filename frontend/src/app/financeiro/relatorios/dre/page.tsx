import { PageHeader } from '@/components/layout/page-header';

export default function DrePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="DRE" subtitle="Receitas, despesas e resultado liquido" />
      <div className="rounded-xl border bg-white p-6 dark:bg-slate-800">Tabela de DRE com comparativo de periodo.</div>
    </div>
  );
}
