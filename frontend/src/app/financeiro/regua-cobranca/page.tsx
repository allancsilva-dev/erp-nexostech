import { PageHeader } from '@/components/layout/page-header';
import { RulesList } from '@/features/collection-rules/components/rules-list';
import { TemplateEditor } from '@/features/collection-rules/components/template-editor';

export default function ReguaCobrancaPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Regua de cobranca" subtitle="Regras automaticas e templates" />
      <RulesList />
      <TemplateEditor />
    </div>
  );
}
