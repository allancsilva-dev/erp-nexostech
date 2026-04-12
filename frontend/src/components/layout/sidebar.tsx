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
  Send,
  Settings,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import CollapsibleMenu from './collapsible-menu';
import { usePermissions } from '@/hooks/use-permissions';
import { useFeatureFlags } from '@/hooks/use-feature-flags';
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
    | 'collection_rules_enabled'
    | 'boletos_enabled'
    | 'approval_flow_enabled'
    | 'branches_enabled';
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
    permission: 'financial.transfers.manage',
    icon: ArrowLeftRight,
  },
  {
    section: 'financeiro',
    label: 'Boletos',
    href: ROUTES.boletos,
    permission: 'financial.entries.view',
    icon: FileText,
    featureFlag: 'boletos_enabled',
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
    featureFlag: 'approval_flow_enabled',
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
    
  },
  {
    section: 'controle',
    label: 'Régua de cobrança',
    href: ROUTES.reguaCobranca,
    permission: 'financial.settings.manage',
    icon: Send,
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
  'group/sidebar-item relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-[background-color,color,transform] duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--sidebar-active-bg))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--sidebar-bg))]';
const normalItem = `${baseItem} text-[hsl(var(--sidebar-text-muted))] hover:translate-x-0.5 hover:bg-[hsl(var(--background)/0.97)] hover:text-[hsl(var(--sidebar-text))]`;
const activeItem = `${baseItem} rounded-l-xl rounded-r-none bg-[hsl(var(--background))] text-[var(--text-primary)] shadow-sm after:pointer-events-none after:absolute after:-right-3 after:top-0 after:h-full after:w-3 after:bg-[hsl(var(--background))] after:content-['']`;

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
  const featureFlags = useFeatureFlags();
  const canApprove = hasPermission('financial.entries.approve');
  const { pending } = useApprovals({ enabled: { pending: canApprove, history: false } });
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('sidebar_collapsed') === '1'
      : false,
  );

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', isCollapsed ? '1' : '0');
  }, [isCollapsed]);

  const pendingCount = pending.isLoading
    ? null
    : Array.isArray(pending.data?.data)
      ? pending.data.data.length
      : 0;
  const identity = getIdentityLabel(user);
  const roleLabel = user?.roles?.[0]?.name ?? 'Admin';

  const filteredItems = useMemo(
    () =>
      ITEMS.filter((item) => hasPermission(item.permission)).filter(
        (item) => !item.featureFlag || featureFlags[item.featureFlag],
      ),
    [featureFlags, hasPermission],
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
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
    const Icon = item.icon;
    const itemClassName = cn(
      isActive ? activeItem : normalItem,
      isCollapsed ? 'justify-center px-2.5' : '',
      isActive && !isCollapsed ? '-mr-3 pr-6' : '',
      isActive && isCollapsed ? 'rounded-2xl after:hidden' : '',
    );
    const labelClassName = cn(
      'truncate transition-transform duration-300 ease-out',
      !isActive && 'group-hover/sidebar-item:translate-x-0.5',
    );
    const subtitleClassName = cn(
      'truncate text-[11px] transition-colors duration-300',
      isActive ? 'text-[var(--text-secondary)]' : 'text-[hsl(var(--sidebar-text-muted))]',
    );

    return (
      <Link
        key={item.href}
        href={item.href}
        className={itemClassName}
        title={isCollapsed ? item.label : undefined}
        aria-label={item.label}
      >
        <Icon
          size={18}
          strokeWidth={1.8}
          className={cn(
            'shrink-0 text-current transition-transform duration-300 ease-out',
            isActive ? 'scale-105' : 'group-hover/sidebar-item:translate-x-0.5 group-hover/sidebar-item:scale-105',
          )}
        />
            {!isCollapsed ? (
              <div className="min-w-0">
                <span className={labelClassName}>{item.label}</span>
                {item.subtitle ? (
                  <div className={subtitleClassName}>{item.subtitle}</div>
                ) : null}
              </div>
            ) : null}
        {!isCollapsed && item.badge === 'approvals' && pendingCount !== null && pendingCount > 0 ? (
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
          <p className="px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--sidebar-section-label))]">
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
        'hidden shrink-0 border-r-0 transition-[width,padding,background-color] duration-300 lg:flex lg:flex-col bg-[hsl(var(--sidebar-bg))]',
        !isVisible && 'lg:w-0 lg:overflow-hidden lg:border-r-0 lg:p-0',
        isVisible && (isCollapsed ? 'w-16 py-2 pl-2 pr-0' : 'w-[var(--sidebar-width)] py-3 pl-3 pr-0'),
      )}
      aria-label="Navegação do ERP"
    >
        <button
          type="button"
          className="group/sidebar-brand mb-3 inline-flex items-center gap-2 overflow-hidden rounded-xl px-2 py-2 text-left transition-colors duration-300 hover:bg-[hsl(var(--background)/0.97)]"
          onClick={() => setIsCollapsed((previous) => !previous)}
          aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)] text-sm font-bold text-[var(--accent-foreground)] transition-transform duration-300 group-hover/sidebar-brand:scale-105">■</span>
        {!isCollapsed ? <span className="text-[14px] font-semibold text-[hsl(var(--sidebar-text))]">Nexos Financeiro</span> : null}
      </button>

      <nav className="scrollbar-thin min-h-0 flex-1 overflow-y-auto pr-0" aria-label="Navegação do ERP">
        <div className="space-y-1">{sections.main.map(renderItem)}</div>
        {renderSection('financeiro')}
        {renderSection('controle')}
        {sections.relatorios.length ? (
          <div className="mt-3">
            <CollapsibleMenu id="relatorios" title={SECTION_LABELS.relatorios} isCollapsed={isCollapsed}>
              <div className="space-y-1">{sections.relatorios.map(renderItem)}</div>
            </CollapsibleMenu>
          </div>
        ) : null}
        {renderSection('configuracoes')}
      </nav>

      <div className="mt-3 border-t border-[hsl(var(--sidebar-section-label)/0.2)] pt-3">
        <div className={cn('flex items-center gap-2', isCollapsed ? 'justify-center' : '')}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-[var(--accent-foreground)]">
            {getIdentityInitials(identity)}
          </div>
          {!isCollapsed ? (
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-[hsl(var(--sidebar-text))]">{identity}</p>
              <p className="truncate text-[11px] text-[hsl(var(--sidebar-text-muted))]">{roleLabel}</p>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            void logout();
          }}
          className={cn(normalItem, 'mt-2 hover:bg-transparent hover:text-[var(--danger)]', isCollapsed ? 'justify-center px-2.5' : '')}
          aria-label="Sair"
        >
          <LogOut size={18} strokeWidth={1.8} className="shrink-0 text-current" />
          {!isCollapsed ? <span>Sair</span> : null}
        </button>
      </div>
    </aside>
  );
}
