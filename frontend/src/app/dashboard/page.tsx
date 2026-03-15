import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { cookies } from 'next/headers';
import { PageHeader } from '@/components/layout/page-header';
import { DashboardClient } from '@/features/dashboard/components/dashboard-client';
import { serverFetch } from '@/lib/api-server';
import { queryKeys } from '@/lib/query-keys';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const queryClient = new QueryClient();
  const branchId = cookies().get('branch_id')?.value ?? 'default';

  await queryClient.prefetchQuery({
    queryKey: queryKeys.dashboard.summary(branchId),
    queryFn: () => serverFetch('/dashboard/summary'),
  });

  await queryClient.prefetchQuery({
    queryKey: queryKeys.dashboard.overdue(branchId),
    queryFn: () => serverFetch('/dashboard/overdue'),
  });

  await queryClient.prefetchQuery({
    queryKey: [...queryKeys.dashboard.all(branchId), 'cashflow'],
    queryFn: () => serverFetch('/dashboard/cashflow-chart'),
  });

  await queryClient.prefetchQuery({
    queryKey: [...queryKeys.dashboard.all(branchId), 'expense-breakdown'],
    queryFn: () => serverFetch('/dashboard/expense-breakdown'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard financeiro" subtitle="Visao consolidada de saldos, vencimentos e fluxo" />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <DashboardClient />
      </HydrationBoundary>
    </div>
  );
}
