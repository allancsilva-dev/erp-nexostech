import Link from 'next/link';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';

const ITEMS = [
  ['Dashboard', ROUTES.dashboard],
  ['Contas a pagar', ROUTES.contasPagar],
  ['Contas a receber', ROUTES.contasReceber],
  ['Fluxo de caixa', ROUTES.fluxoCaixa],
  ['Categorias', ROUTES.categorias],
  ['Conciliacao', ROUTES.conciliacao],
  ['Relatorios', ROUTES.relatorios],
  ['Transferencias', ROUTES.transferencias],
  ['Boletos', ROUTES.boletos],
  ['Aprovacoes', ROUTES.aprovacoes],
  ['Auditoria', ROUTES.auditoria],
  ['Configuracoes', ROUTES.configuracoes],
  ['Regua de cobranca', ROUTES.reguaCobranca],
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-slate-900 p-4 text-slate-100 lg:block">
      <div className="mb-6 flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 font-semibold">
        <span className="rounded bg-white/20 px-2 py-0.5">N</span>
        <span>Nexos Financeiro</span>
      </div>
      <nav className="space-y-1">
        {ITEMS.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className={cn('block rounded-md px-3 py-2 text-sm transition-colors hover:bg-slate-800')}
          >
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
