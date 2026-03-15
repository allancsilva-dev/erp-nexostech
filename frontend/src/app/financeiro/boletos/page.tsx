import { PageHeader } from '@/components/layout/page-header';

export default function BoletosPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Boletos" subtitle="Consulta e operacoes de boletos" />
      <div className="rounded-xl border bg-white p-6 dark:bg-slate-800">Listagem de boletos com filtros e acoes.</div>
    </div>
  );
}
