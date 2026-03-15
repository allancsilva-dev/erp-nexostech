import { PageHeader } from '@/components/layout/page-header';

export default function AdminFiliaisPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Admin - Filiais" subtitle="Gestao de filiais do tenant" />
      <div className="rounded-xl border bg-white p-6 dark:bg-slate-800">Cadastro e manutencao de filiais.</div>
    </div>
  );
}
