import { PageHeader } from '@/components/layout/page-header';
import { EntryDetail } from '@/features/entries/components/entry-detail';

export default function ContaPagarDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <PageHeader title="Detalhe da conta a pagar" subtitle="Visualize dados e status do lancamento" />
      <EntryDetail id={params.id} />
    </div>
  );
}
