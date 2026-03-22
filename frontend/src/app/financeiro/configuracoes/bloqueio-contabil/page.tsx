import { PageHeader } from '@/components/layout/page-header';
import { LockPeriodForm } from '@/features/settings/components/lock-period-form';

export default function BloqueioContabilPage() {
  return (
    <div>
      <PageHeader title="Bloqueio contabil" subtitle="Periodos fechados para alteracao" />
      <div className="surface-card p-5">
        <LockPeriodForm />
      </div>
    </div>
  );
}
