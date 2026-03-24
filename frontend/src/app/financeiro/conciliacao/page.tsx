import { PageHeader } from '@/components/layout/page-header';
import { UploadStatement } from '@/features/reconciliation/components/upload-statement';
import { SplitView } from '@/features/reconciliation/components/split-view';
import { MatchActions } from '@/features/reconciliation/components/match-actions';

export default function ConciliacaoPage() {
  return (
    <div>
      <PageHeader title="Conciliação bancária" subtitle="Importar extrato e conciliar" />
      <div className="mb-4 surface-card p-5">
        <UploadStatement />
      </div>
      <div className="mb-4 surface-card p-5">
        <SplitView />
      </div>
      <div className="surface-card p-5">
        <MatchActions />
      </div>
    </div>
  );
}
