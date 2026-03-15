import { PageHeader } from '@/components/layout/page-header';
import { UploadStatement } from '@/features/reconciliation/components/upload-statement';
import { SplitView } from '@/features/reconciliation/components/split-view';
import { MatchActions } from '@/features/reconciliation/components/match-actions';

export default function ConciliacaoPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Conciliacao bancaria" subtitle="Upload de extrato e vinculacao de lancamentos" />
      <UploadStatement />
      <SplitView />
      <MatchActions />
    </div>
  );
}
