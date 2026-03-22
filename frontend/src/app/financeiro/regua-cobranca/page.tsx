'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { useFeatureFlag } from '@/hooks/use-feature-flags';
import { RulesList } from '@/features/collection-rules/components/rules-list';
import { TemplateEditor } from '@/features/collection-rules/components/template-editor';

export default function ReguaCobrancaPage() {
  const enabled = useFeatureFlag('collection_rules_enabled');

  if (!enabled) {
    return (
      <EmptyState
        title="Recurso nao disponivel no seu plano"
        description="Regua de cobranca esta disponivel apenas nos planos Pro e Enterprise."
        action={<Link href="/configuracoes">Ver planos</Link>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Regua de cobranca" subtitle="Regras automaticas e templates" />
      <RulesList />
      <TemplateEditor />
    </div>
  );
}
