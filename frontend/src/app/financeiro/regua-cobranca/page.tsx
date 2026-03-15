import { PageHeader } from '@/components/layout/page-header';

export default function ReguaCobrancaPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Regua de cobranca" subtitle="Regras e templates de cobranca" />
      <div className="rounded-xl border bg-white p-6 dark:bg-slate-800">CRUD de eventos e editor de templates.</div>
    </div>
  );
}
