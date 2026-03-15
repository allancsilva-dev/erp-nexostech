import { PageHeader } from '@/components/layout/page-header';
import { BoletoList } from '@/features/boletos/components/boleto-list';

export default function BoletosPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Boletos" subtitle="Gestao de boletos emitidos e recebidos" />
      <BoletoList />
    </div>
  );
}
