import { PageHeader } from '@/components/layout/page-header';
import { TransferForm } from '@/features/transfers/components/transfer-form';

export default function TransferenciasPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Transferencias" subtitle="Movimentacao entre contas bancarias" />
      <TransferForm />
    </div>
  );
}
