import { PageHeader } from '@/components/layout/page-header';

export default function AdminUsuariosPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Admin - Usuarios" subtitle="Gestao de usuarios e acessos" />
      <div className="rounded-xl border bg-white p-6 dark:bg-slate-800">Vinculacao de usuarios e roles.</div>
    </div>
  );
}
