import { PageHeader } from '@/components/layout/page-header';
import { DashboardClient } from '@/features/dashboard/components/dashboard-client';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard financeiro" subtitle="Visao consolidada de saldos, vencimentos e fluxo" />
      <DashboardClient />
    </div>
  );
}
