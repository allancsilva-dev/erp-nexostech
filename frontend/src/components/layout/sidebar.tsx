'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { useApprovals } from '@/features/approvals/hooks/use-approvals';

const ITEMS = [
  { label: 'Dashboard', href: ROUTES.dashboard, permission: 'financial.dashboard.view' },
  { label: 'Contas a pagar', href: ROUTES.contasPagar, permission: 'financial.entries.view' },
  { label: 'Contas a receber', href: ROUTES.contasReceber, permission: 'financial.entries.view' },
  { label: 'Fluxo de caixa', href: ROUTES.fluxoCaixa, permission: 'financial.reports.view' },
  { label: 'Categorias', href: ROUTES.categorias, permission: 'financial.categories.view' },
  { label: 'Conciliacao', href: ROUTES.conciliacao, permission: 'financial.reconciliation.execute' },
  { label: 'Relatorios', href: ROUTES.relatorios, permission: 'financial.reports.view' },
  { label: 'Transferencias', href: ROUTES.transferencias, permission: 'financial.entries.create' },
  { label: 'Boletos', href: ROUTES.boletos, permission: 'financial.entries.view' },
  { label: 'Aprovacoes', href: ROUTES.aprovacoes, permission: 'financial.entries.approve' },
  { label: 'Auditoria', href: ROUTES.auditoria, permission: 'financial.audit.view' },
  { label: 'Configuracoes', href: ROUTES.configuracoes, permission: 'financial.settings.manage' },
  { label: 'Regua de cobranca', href: ROUTES.reguaCobranca, permission: 'financial.settings.manage' },
  { label: 'Admin > Filiais', href: ROUTES.adminFiliais, permission: 'admin.branches.manage' },
  { label: 'Admin > Usuarios', href: ROUTES.adminUsuarios, permission: 'admin.users.manage' },
] as const;

export function Sidebar() {
  const { hasPermission } = usePermissions();
  const { pending } = useApprovals();

  const pendingCount = pending.data?.data?.length ?? 0;
  const filteredItems = useMemo(
    () => ITEMS.filter((item) => hasPermission(item.permission)),
    [hasPermission],
  );

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-slate-900 p-4 text-slate-100 lg:block">
      <div className="mb-6 flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 font-semibold">
        <span className="rounded bg-white/20 px-2 py-0.5">N</span>
        <span>Nexos Financeiro</span>
      </div>
      <nav className="space-y-1">
        {filteredItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn('block rounded-md px-3 py-2 text-sm transition-colors hover:bg-slate-800')}
          >
            <span className="inline-flex items-center gap-2">
              {item.label}
              {item.href === ROUTES.aprovacoes && pendingCount > 0 ? (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-slate-900">
                  {pendingCount}
                </span>
              ) : null}
            </span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
