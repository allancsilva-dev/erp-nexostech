import { PageHeader } from '@/components/layout/page-header';

export default function FluxoCaixaPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Fluxo de caixa" subtitle="Entradas, saidas e saldo acumulado" />
      <div className="rounded-xl border bg-white p-6 dark:bg-slate-800">Grafico e tabela detalhada de fluxo de caixa.</div>
    </div>
  );
}
