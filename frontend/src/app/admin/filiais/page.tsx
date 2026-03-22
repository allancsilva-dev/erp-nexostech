import { PageHeader } from '@/components/layout/page-header';

export default function AdminFiliaisPage() {
  return (
    <div>
      <PageHeader title="Filiais" subtitle="Unidades da empresa" />
      <div className="surface-card p-5" style={{ color: 'hsl(var(--text-secondary))' }}>
        Cadastro e manutencao de filiais.
      </div>
    </div>
  );
}
