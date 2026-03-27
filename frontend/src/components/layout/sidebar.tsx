'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock4,
  FileText,
  
  GitCompare,
  LayoutDashboard,
  LogOut,
  Receipt,
  ScrollText,
  Settings,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import CollapsibleMenu from './collapsible-menu';
import { usePermissions } from '@/hooks/use-permissions';
import { useFeatureFlag } from '@/hooks/use-feature-flags';
import { useApprovals } from '@/features/approvals/hooks/use-approvals';
import { useAuthContext } from '@/providers/auth-provider';

type SidebarItem = {
  section: 'main' | 'financeiro' | 'relatorios' | 'controle' | 'configuracoes';
  label: string;
  href: string;
  permission: string;
  icon: LucideIcon;
  subtitle?: string;
  featureFlag?:
    | 'collection_rules_enabled';
  badge?: 'approvals';
};

const ITEMS: SidebarItem[] = [
  {
    section: 'main',
    label: 'Painel',
    href: ROUTES.dashboard,
    permission: 'financial.dashboard.view',
    icon: LayoutDashboard,
  },
  {
    section: 'financeiro',
    label: 'Contas a pagar',
    href: ROUTES.contasPagar,
    permission: 'financial.entries.view',
    icon: Receipt,
  },
  {
    section: 'financeiro',
    label: 'Contas a receber',
    href: ROUTES.contasReceber,
    permission: 'financial.entries.view',
    icon: ArrowDownLeft,
  },
  {
    section: 'financeiro',
    label: 'Fluxo de caixa',
    href: ROUTES.fluxoCaixa,
    permission: 'financial.reports.view',
    icon: TrendingUp,
  },
  
  {
    section: 'financeiro',
    label: 'Conciliação',
    href: ROUTES.conciliacao,
    permission: 'financial.reconciliation.execute',
    icon: GitCompare,
  },
  {
    section: 'financeiro',
    label: 'Transferências',
    href: ROUTES.transferencias,
    permission: 'financial.entries.create',
    icon: ArrowLeftRight,
  },
  {
    section: 'financeiro',
    label: 'Boletos',
    href: ROUTES.boletos,
    permission: 'financial.entries.view',
    icon: FileText,
  },
  {
    section: 'relatorios',
    label: 'DRE',
    href: '/financeiro/relatorios/dre',
    permission: 'financial.reports.view',
    icon: BarChart3,
  },
  {
    section: 'relatorios',
    label: 'Balancete',
    href: '/financeiro/relatorios/balancete',
    permission: 'financial.reports.view',
    icon: BookOpen,
  },
  {
    section: 'relatorios',
    label: 'Vencimentos',
    href: '/financeiro/relatorios/aging',
    permission: 'financial.reports.view',
    icon: Clock4,
  },
  {
    section: 'controle',
    label: 'Aprovações',
    href: ROUTES.aprovacoes,
    permission: 'financial.entries.approve',
    icon: CheckCircle2,
    badge: 'approvals',
  },
  {
    section: 'controle',
    label: 'Auditoria',
    href: ROUTES.auditoria,
    permission: 'financial.audit.view',
    icon: ScrollText,
  },
  {
    section: 'configuracoes',
    label: 'Configurações',
    href: ROUTES.configuracoes,
    permission: 'financial.settings.manage',
    icon: Settings,
    subtitle: 'Hub administrativo',
  },
  {
    section: 'configuracoes',
    label: 'Régua de cobrança',
    href: ROUTES.reguaCobranca,
    permission: 'financial.settings.manage',
    icon: Settings,
    featureFlag: 'collection_rules_enabled',
  },
];

const SECTION_LABELS: Record<Exclude<SidebarItem['section'], 'main'>, string> = {
  financeiro: 'Financeiro',
  relatorios: 'Relatórios',
  controle: 'Controle',
  configuracoes: 'Configurações',
};

const baseItem =
  'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-[7px] text-[13px] font-medium transition-all duration-150';
const normalItem = `${baseItem} text-[var(--sidebar-text-muted)] hover:bg-[hsl(var(--sidebar-hover))] hover:text-[var(--sidebar-text)]`;
const activeItem = `${baseItem} bg-[hsl(var(--sidebar-active-bg))] text-[hsl(var(--sidebar-active-text))]`;

function getIdentityLabel(user: { name?: string | null; email: string | null; roles?: Array<{ name: string }> } | null): string {
  return user?.name || user?.email || 'Utilizador';
}

function getIdentityInitials(identity: string): string {
  const safeValue = identity.trim();
  if (!safeValue) {
    return 'US';
  }

  if (safeValue.includes('@')) {
    const local = safeValue.split('@')[0] ?? '';
    const parts = local.split(/[._-]/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
    }

    return local.slice(0, 2).toUpperCase();
  }

  const chunks = safeValue.split(/\s+/).filter(Boolean);
  if (chunks.length >= 2) {
    return `${chunks[0][0] ?? ''}${chunks[1][0] ?? ''}`.toUpperCase();
  }

  return safeValue.slice(0, 2).toUpperCase();
}

export function Sidebar({ isVisible }: { isVisible: boolean }) {
  const { hasPermission } = usePermissions();
  const { user, logout } = useAuthContext();
  const collectionRulesEnabled = useFeatureFlag('collection_rules_enabled');
  const { pending } = useApprovals();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const persisted = localStorage.getItem('sidebar_collapsed');
    setIsCollapsed(persisted === '1');
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', isCollapsed ? '1' : '0');
  }, [isCollapsed]);

  const pendingList = pending.data?.data;
  const pendingCount = Array.isArray(pendingList) ? pendingList.length : 0;
  const identity = getIdentityLabel(user);
  const roleLabel = user?.roles?.[0]?.name ?? 'Admin';

  const filteredItems = useMemo(
    () =>
      ITEMS.filter((item) => hasPermission(item.permission)).filter((item) => {
        if (!item.featureFlag) {
          return true;
        }

        if (item.featureFlag === 'collection_rules_enabled') {
          return collectionRulesEnabled;
        }

        return false;
      }),
    [collectionRulesEnabled, hasPermission],
  );

  const sections = useMemo(() => {
    return {
      main: filteredItems.filter((item) => item.section === 'main'),
      financeiro: filteredItems.filter((item) => item.section === 'financeiro'),
      relatorios: filteredItems.filter((item) => item.section === 'relatorios'),
      controle: filteredItems.filter((item) => item.section === 'controle'),
      configuracoes: filteredItems.filter((item) => item.section === 'configuracoes'),
    };
  }, [filteredItems]);

  function renderItem(item: SidebarItem) {
    const isActive = pathname === item.href || pathname.startsWith(item.href);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(isActive ? activeItem : normalItem, isCollapsed ? 'justify-center px-2.5' : '')}
        title={isCollapsed ? item.label : undefined}
        aria-label={item.label}
      >
            <Icon size={18} strokeWidth={1.8} className="shrink-0 text-current" />
            {!isCollapsed ? (
              <div className="min-w-0">
                <span className="truncate">{item.label}</span>
                {item.subtitle ? (
                  <div className="text-[11px] text-[var(--sidebar-text-muted)] truncate">{item.subtitle}</div>
                ) : null}
              </div>
            ) : null}
        {!isCollapsed && item.badge === 'approvals' && pendingCount > 0 ? (
          <span className="ml-auto min-w-[18px] rounded-full bg-[var(--danger)] px-1.5 py-0.5 text-center text-[10px] font-bold text-[var(--destructive-foreground)]">
            {pendingCount}
          </span>
        ) : null}
      </Link>
    );
  }

  function renderSection(section: Exclude<SidebarItem['section'], 'main'>) {
    const sectionItems = sections[section];
    if (!sectionItems.length) {
      return null;
    }

    return (
      <div key={section}>
        {!isCollapsed ? (
          <p className="px-3 pb-1.5 pt-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--sidebar-section-label)]">
            {SECTION_LABELS[section]}
          </p>
        ) : null}
        <div className="space-y-1">{sectionItems.map(renderItem)}</div>
      </div>
    );
  }

  return (
    <aside
      className={cn(
        'hidden shrink-0 border-r transition-all duration-200 lg:flex lg:flex-col bg-[hsl(var(--sidebar-bg))] border-[hsl(var(--sidebar-border))]',
        !isVisible && 'lg:w-0 lg:overflow-hidden lg:border-r-0 lg:p-0',
        isVisible && (isCollapsed ? 'w-16 p-2' : 'w-[var(--sidebar-width)] p-3'),
      )}
      aria-label="Menu lateral principal"
    >
        <button
          type="button"
          className="mb-3 inline-flex items-center gap-2 overflow-hidden rounded-lg px-2 py-2 text-left"
          onClick={() => setIsCollapsed((previous) => !previous)}
          aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-[var(--accent-foreground)]">■</span>
        {!isCollapsed ? <span className="text-[14px] font-semibold text-[var(--sidebar-text)]">Nexos Financeiro</span> : null}
      </button>

      <nav className="scrollbar-thin min-h-0 flex-1 overflow-y-auto pr-1" aria-label="Navegacao do ERP">
        <div className="space-y-1">{sections.main.map(renderItem)}</div>
        {renderSection('financeiro')}
        {renderSection('controle')}
        {sections.relatorios.length ? (
          <CollapsibleMenu id="relatorios" title={SECTION_LABELS.relatorios} isCollapsed={isCollapsed}>
            <div className="space-y-1">{sections.relatorios.map(renderItem)}</div>
          </CollapsibleMenu>
        ) : null}
        {renderSection('configuracoes')}
      </nav>

      <div className="mt-3 border-t pt-3 border-[hsl(var(--sidebar-border))]">
        <div className={cn('flex items-center gap-2', isCollapsed ? 'justify-center' : '')}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-[var(--accent-foreground)]">
            {getIdentityInitials(identity)}
          </div>
          {!isCollapsed ? (
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-[var(--sidebar-text)]">{identity}</p>
              <p className="truncate text-[11px] text-[var(--sidebar-text-muted)]">{roleLabel}</p>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            void logout();
          }}
          className={cn(normalItem, 'mt-2', isCollapsed ? 'justify-center px-2.5' : '')}
          aria-label="Sair"
        >
          <LogOut size={18} strokeWidth={1.8} className="shrink-0 text-current" />
          {!isCollapsed ? <span>Sair</span> : null}
        </button>
      </div>
    </aside>
  );
}
