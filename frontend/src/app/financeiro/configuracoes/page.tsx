import { PageHeader } from '@/components/layout/page-header';

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Configuracoes" subtitle="Contas bancarias, regras e bloqueios" />
      <div className="rounded-xl border bg-white p-6 dark:bg-slate-800">Abas de configuracao financeira e permissoes.</div>
    </div>
  );
}
