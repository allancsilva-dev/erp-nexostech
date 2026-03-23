'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { useFeatureFlag } from '@/hooks/use-feature-flags';
import { RulesList } from '@/features/collection-rules/components/rules-list';
import { TemplateEditor } from '@/features/collection-rules/components/template-editor';
import { RuleForm } from '@/features/collection-rules/components/rule-form';

export default function ReguaCobrancaPage() {
  const enabled = useFeatureFlag('collection_rules_enabled');

  if (!enabled) {
    return (
      <div>
        <PageHeader title="Regua de cobranca" subtitle="Envio automatico de e-mails" />
        <div className="surface-card p-5">
          <EmptyState
            title="Recurso nao disponivel no seu plano"
            description="Regua de cobranca esta disponivel apenas nos planos Pro e Enterprise."
            action={<Link href="/configuracoes">Ver planos</Link>}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Regua de cobranca" subtitle="Envio automatico de e-mails" />
      <div className="mb-4 surface-card p-5">
        <RulesList />
      </div>
      <div className="mb-4 surface-card p-5">
        <RuleForm />
      </div>
      <div className="surface-card p-5">
        <TemplateEditor />
      </div>
    </div>
  );
}
