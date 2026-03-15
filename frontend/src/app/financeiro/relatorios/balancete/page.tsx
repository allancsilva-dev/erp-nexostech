import { PageHeader } from '@/components/layout/page-header';

export default function BalancetePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Balancete" subtitle="Saldos por categoria e periodo" />
      <div className="rounded-xl border bg-white p-6 dark:bg-slate-800">Tabela de balancete com subtotais.</div>
    </div>
  );
}
