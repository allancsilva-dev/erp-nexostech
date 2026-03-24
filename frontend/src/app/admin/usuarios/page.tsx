import { PageHeader } from '@/components/layout/page-header';

export default function AdminUsuariosPage() {
  return (
    <div>
      <PageHeader title="Usuários" subtitle="Gestão de usuários e acessos" />
      <div className="surface-card p-5" style={{ color: 'hsl(var(--text-secondary))' }}>
        Vinculação de usuários e permissões.
      </div>
    </div>
  );
}
