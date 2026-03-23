import { PageHeader } from '@/components/layout/page-header';
import { AttachmentsList } from '@/features/entries/components/attachments-list';
import { EntryDetail } from '@/features/entries/components/entry-detail';

export default function ContaReceberDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <PageHeader title="Detalhe da conta a receber" subtitle="Visualize dados e status do lancamento" />
      <EntryDetail id={params.id} />
      <div className="surface-card p-5">
        <h3 className="mb-3 text-sm font-semibold">Anexos</h3>
        <AttachmentsList entryId={params.id} />
      </div>
    </div>
  );
}
