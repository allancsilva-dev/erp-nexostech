import { PageHeader } from '@/components/layout/page-header';
import { EntryForm } from '@/features/entries/components/entry-form';

export default function NovaContaReceberPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Nova conta a receber" subtitle="Cadastre um lançamento de receita" />
      <EntryForm type="RECEIVABLE" />
    </div>
  );
}
