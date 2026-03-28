import { PageHeader } from '@/components/layout/page-header';
import { EntryForm } from '@/features/entries/components/entry-form';

export default function NovaContaPagarPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Nova conta a pagar" subtitle="Cadastre um lançamento de despesa" />
      <EntryForm type="PAYABLE" />
    </div>
  );
}
