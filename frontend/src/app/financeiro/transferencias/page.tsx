import { PageHeader } from '@/components/layout/page-header';

export default function TransferenciasPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Transferencias" subtitle="Transferencias entre contas bancarias" />
      <div className="rounded-xl border bg-white p-6 dark:bg-slate-800">Formulario de transferencia e historico.</div>
    </div>
  );
}
