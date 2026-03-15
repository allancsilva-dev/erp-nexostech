import { PageHeader } from '@/components/layout/page-header';

export default function AgingPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Aging" subtitle="Titulos por faixa de atraso" />
      <div className="rounded-xl border bg-white p-6 dark:bg-slate-800">Tabela de aging por cliente/fornecedor.</div>
    </div>
  );
}
