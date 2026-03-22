import { PageHeader } from '@/components/layout/page-header';

export default function AdminUsuariosPage() {
  return (
    <div>
      <PageHeader title="Usuarios" subtitle="Gestao de utilizadores e acessos" />
      <div className="surface-card p-5" style={{ color: 'hsl(var(--text-secondary))' }}>
        Vinculacao de usuarios e roles.
      </div>
    </div>
  );
}
