'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { useFeatureFlag } from '@/hooks/use-feature-flags';
import { BoletoList } from '@/features/boletos/components/boleto-list';

export default function BoletosPage() {
  const enabled = useFeatureFlag('boletos_enabled');

  if (!enabled) {
    return (
      <div>
        <PageHeader title="Boletos" subtitle="Emissao e acompanhamento" />
        <div className="surface-card p-5">
          <EmptyState
            title="Recurso nao disponivel no seu plano"
            description="Boletos estao disponiveis apenas nos planos Pro e Enterprise."
            action={<Link href="/configuracoes">Ver planos</Link>}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Boletos" subtitle="Emissao e acompanhamento" />
      <div className="surface-card p-5">
        <BoletoList />
      </div>
    </div>
  );
}
