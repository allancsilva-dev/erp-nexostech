import { PageHeader } from '@/components/layout/page-header';
import { BranchManager } from '@/features/settings/components/branch-manager';

export default function AdminFiliaisPage() {
  return (
    <div>
      <PageHeader title="Filiais" subtitle="Unidades da empresa" />
      <div className="surface-card p-5">
        <BranchManager />
      </div>
    </div>
  );
}
