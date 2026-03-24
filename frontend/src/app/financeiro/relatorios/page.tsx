import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';

export default function RelatoriosPage() {
  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Relatórios financeiros" />
      <div className="surface-card p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/financeiro/relatorios/dre"
            className="rounded-lg p-4 transition-colors"
            style={{ border: '0.5px solid var(--border-default)', background: 'var(--bg-surface)' }}
          >
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              DRE
            </h3>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              Demonstrativo de resultado
            </p>
          </Link>
          <Link
            href="/financeiro/relatorios/balancete"
            className="rounded-lg p-4 transition-colors"
            style={{ border: '0.5px solid var(--border-default)', background: 'var(--bg-surface)' }}
          >
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Balancete
            </h3>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              Movimentação por categoria
            </p>
          </Link>
          <Link
            href="/financeiro/relatorios/aging"
            className="rounded-lg p-4 transition-colors"
            style={{ border: '0.5px solid var(--border-default)', background: 'var(--bg-surface)' }}
          >
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Vencimentos
            </h3>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              Análise de vencimentos
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
