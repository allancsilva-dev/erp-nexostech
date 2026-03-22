'use client';

import Link from 'next/link';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { useFeatureFlag } from '@/hooks/use-feature-flags';
import { useApprovals } from '@/features/approvals/hooks/use-approvals';
import { Button } from '@/components/ui/button';

const ITEMS = [
  { label: 'Dashboard', href: ROUTES.dashboard, permission: 'financial.dashboard.view' },
  { label: 'Contas a pagar', href: ROUTES.contasPagar, permission: 'financial.entries.view' },
  { label: 'Contas a receber', href: ROUTES.contasReceber, permission: 'financial.entries.view' },
  { label: 'Fluxo de caixa', href: ROUTES.fluxoCaixa, permission: 'financial.reports.view' },
  { label: 'Categorias', href: ROUTES.categorias, permission: 'financial.categories.view' },
  { label: 'Conciliacao', href: ROUTES.conciliacao, permission: 'financial.reconciliation.execute' },
  { label: 'Relatorios', href: ROUTES.relatorios, permission: 'financial.reports.view' },
  { label: 'Transferencias', href: ROUTES.transferencias, permission: 'financial.entries.create' },
  {
    label: 'Boletos',
    href: ROUTES.boletos,
    permission: 'financial.entries.view',
    featureFlag: 'boletos_enabled',
  },
  {
    label: 'Aprovacoes',
    href: ROUTES.aprovacoes,
    permission: 'financial.entries.approve',
    featureFlag: 'approval_flow_enabled',
  },
  { label: 'Auditoria', href: ROUTES.auditoria, permission: 'financial.audit.view' },
  { label: 'Configuracoes', href: ROUTES.configuracoes, permission: 'financial.settings.manage' },
  {
    label: 'Regua de cobranca',
    href: ROUTES.reguaCobranca,
    permission: 'financial.settings.manage',
    featureFlag: 'collection_rules_enabled',
  },
  {
    label: 'Admin > Filiais',
    href: ROUTES.adminFiliais,
    permission: 'admin.branches.manage',
    featureFlag: 'branches_enabled',
  },
  {
    label: 'Configuracoes > Usuarios',
    href: ROUTES.configuracoesUsuarios,
    permission: 'admin.users.manage',
  },
  {
    label: 'Configuracoes > Roles',
    href: ROUTES.configuracoesRoles,
    permission: 'admin.users.manage',
  },
] as const;

export function Sidebar({ isVisible }: { isVisible: boolean }) {
  const { hasPermission } = usePermissions();
  const boletosEnabled = useFeatureFlag('boletos_enabled');
  const approvalsEnabled = useFeatureFlag('approval_flow_enabled');
  const branchesEnabled = useFeatureFlag('branches_enabled');
  const collectionRulesEnabled = useFeatureFlag('collection_rules_enabled');
  const { pending } = useApprovals({ enabled: approvalsEnabled });
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const persisted = localStorage.getItem('sidebar_collapsed');
    setIsCollapsed(persisted === '1');
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', isCollapsed ? '1' : '0');
  }, [isCollapsed]);

  const pendingCount = pending.data?.data?.length ?? 0;
  const filteredItems = useMemo(
    () => ITEMS
      .filter((item) => hasPermission(item.permission))
      .filter((item) => {
        if (!item.featureFlag) {
          return true;
        }

        if (item.featureFlag === 'boletos_enabled') {
          return boletosEnabled;
        }

        if (item.featureFlag === 'approval_flow_enabled') {
          return approvalsEnabled;
        }

        if (item.featureFlag === 'branches_enabled') {
          return branchesEnabled;
        }

        if (item.featureFlag === 'collection_rules_enabled') {
          return collectionRulesEnabled;
        }

        return false;
      }),
    [approvalsEnabled, boletosEnabled, branchesEnabled, collectionRulesEnabled, hasPermission],
  );

  return (
    <aside
      className={cn(
        'hidden shrink-0 border-r border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] transition-all duration-200 lg:flex lg:flex-col',
        !isVisible && 'lg:w-0 lg:overflow-hidden lg:border-r-0 lg:p-0',
        isVisible && (isCollapsed ? 'w-16 p-2' : 'w-64 p-4'),
      )}
      aria-label="Menu lateral principal"
    >
      <div className="mb-6 flex items-center justify-between rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 font-semibold text-[var(--text-primary)]">
        <span className="inline-flex items-center gap-2 overflow-hidden whitespace-nowrap">
          <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded bg-[var(--accent-bg)] text-[11px] leading-none text-[var(--accent-text)]">N</span>
          {!isCollapsed ? <span>Nexos Financeiro</span> : null}
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
          onClick={() => setIsCollapsed((previous) => !previous)}
          aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>
      <nav className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1" aria-label="Navegacao do ERP">
        {filteredItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'block rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2',
              'hover:bg-[var(--bg-surface-hover)]',
              pathname === item.href
                ? 'bg-[var(--accent-bg)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)]',
            )}
            title={isCollapsed ? item.label : undefined}
            aria-label={item.label}
          >
            <span className={cn('inline-flex items-center gap-2', isCollapsed ? 'justify-center w-full' : '')}>
              <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded bg-[var(--bg-surface-hover)] text-[10px] leading-none text-[var(--text-muted)]">
                {item.label.charAt(0)}
              </span>
              {!isCollapsed ? item.label : null}
              {item.href === ROUTES.aprovacoes && pendingCount > 0 ? (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--info)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--bg-surface)]">
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
