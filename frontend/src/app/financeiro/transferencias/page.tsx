import { PageHeader } from '@/components/layout/page-header';
import { TransferForm } from '@/features/transfers/components/transfer-form';

export default function TransferenciasPage() {
  return (
    <div>
      <PageHeader title="Transferencias" subtitle="Entre contas da mesma filial" />
      <div className="surface-card p-5">
        <TransferForm />
      </div>
    </div>
  );
}
