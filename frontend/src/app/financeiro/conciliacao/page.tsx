import { PageHeader } from '@/components/layout/page-header';

export default function ConciliacaoPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Conciliacao bancaria" subtitle="Upload de extrato e matching de lancamentos" />
      <div className="rounded-xl border bg-white p-6 dark:bg-slate-800">Split view de extrato x lancamentos para conciliacao.</div>
    </div>
  );
}
