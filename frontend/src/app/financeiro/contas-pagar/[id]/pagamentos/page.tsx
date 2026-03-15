import { PageHeader } from '@/components/layout/page-header';
import { EntryPaymentsHistory } from '@/features/entries/components/entry-payments-history';

export default function ContaPagarPagamentosPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <PageHeader title="Historico de pagamentos" subtitle="Registros de pagamento deste lancamento" />
      <EntryPaymentsHistory entryId={params.id} />
    </div>
  );
}
