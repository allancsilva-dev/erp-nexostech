import { PageHeader } from '@/components/layout/page-header';

export default function AprovacoesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Aprovacoes" subtitle="Fila de lancamentos aguardando aprovacao" />
      <div className="rounded-xl border bg-white p-6 dark:bg-slate-800">Lista de pendencias com aprovacao/rejeicao.</div>
    </div>
  );
}
