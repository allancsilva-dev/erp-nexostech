import { PageHeader } from '@/components/layout/page-header';

export default function AuditoriaPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Auditoria" subtitle="Historico de alteracoes financeiras" />
      <div className="rounded-xl border bg-white p-6 dark:bg-slate-800">Tabela somente leitura de logs e field changes.</div>
    </div>
  );
}
