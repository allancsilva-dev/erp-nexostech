'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock4,
  FileText,
  FolderTree,
  GitCompare,
  LayoutDashboard,
  LogOut,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { useFeatureFlag } from '@/hooks/use-feature-flags';
import { useApprovals } from '@/features/approvals/hooks/use-approvals';
import { useAuthContext } from '@/providers/auth-provider';

type SidebarItem = {
  section: 'main' | 'financeiro' | 'relatorios' | 'operacoes' | 'configuracoes';
  label: string;
  href: string;
  permission: string;
  icon: LucideIcon;
  featureFlag?:
    | 'boletos_enabled'
    | 'approval_flow_enabled'
    | 'branches_enabled'
    | 'collection_rules_enabled';
  badge?: 'approvals';
};

const ITEMS: SidebarItem[] = [
  {
    section: 'main',
    label: 'Dashboard',
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
    label: 'Categorias',
    href: ROUTES.categorias,
    permission: 'financial.categories.view',
    icon: FolderTree,
  },
  {
    section: 'financeiro',
    label: 'Conciliacao',
    href: ROUTES.conciliacao,
    permission: 'financial.reconciliation.execute',
    icon: GitCompare,
  },
  {
    section: 'financeiro',
    label: 'Transferencias',
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
    label: 'Aging',
    href: '/financeiro/relatorios/aging',
    permission: 'financial.reports.view',
    icon: Clock4,
  },
  {
    section: 'operacoes',
    label: 'Aprovacoes',
    href: ROUTES.aprovacoes,
    permission: 'financial.entries.approve',
    icon: CheckCircle2,
    featureFlag: 'approval_flow_enabled',
    badge: 'approvals',
  },
  {
    section: 'operacoes',
    label: 'Auditoria',
    href: ROUTES.auditoria,
    permission: 'financial.audit.view',
    icon: ScrollText,
  },
  {
    section: 'configuracoes',
    label: 'Geral',
    href: ROUTES.configuracoes,
    permission: 'financial.settings.manage',
    icon: Settings,
  },
  {
    section: 'configuracoes',
    label: 'Regua de cobranca',
    href: ROUTES.reguaCobranca,
    permission: 'financial.settings.manage',
    icon: Settings,
    featureFlag: 'collection_rules_enabled',
  },
  {
    section: 'configuracoes',
    label: 'Filiais',
    href: ROUTES.adminFiliais,
    permission: 'admin.branches.manage',
    icon: Building2,
    featureFlag: 'branches_enabled',
  },
  {
    section: 'configuracoes',
    label: 'Usuarios',
    href: ROUTES.configuracoesUsuarios,
    permission: 'admin.users.manage',
    icon: Users,
  },
  {
    section: 'configuracoes',
    label: 'Roles',
    href: ROUTES.configuracoesRoles,
    permission: 'admin.users.manage',
    icon: ShieldCheck,
  },
];

const SECTION_LABELS: Record<Exclude<SidebarItem['section'], 'main'>, string> = {
  financeiro: 'Financeiro',
  relatorios: 'Relatorios',
  operacoes: 'Operacoes',
  configuracoes: 'Configuracoes',
};

const baseItem =
  'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-[7px] text-[13px] font-medium transition-all duration-150';
const normalItem = `${baseItem} text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-primary)]`;
const activeItem = `${baseItem} bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)]`;

function getIdentityLabel(user: { email: string | null; roles?: Array<{ name: string }> } | null): string {
  if (!user?.email) {
    return 'Utilizador';
  }

  return user.email;
}

function getIdentityInitials(identity: string): string {
  const chunks = identity.split(' ').filter(Boolean);
  if (chunks.length === 0) {
    return 'US';
  }

  if (chunks.length === 1) {
    return chunks[0].slice(0, 2).toUpperCase();
  }

  return `${chunks[0][0] ?? ''}${chunks[1][0] ?? ''}`.toUpperCase();
}

export function Sidebar({ isVisible }: { isVisible: boolean }) {
  const { hasPermission } = usePermissions();
  const { user, logout } = useAuthContext();
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
  const identity = getIdentityLabel(user);
  const roleLabel = user?.roles?.[0]?.name ?? 'User';

  const filteredItems = useMemo(
    () =>
      ITEMS.filter((item) => hasPermission(item.permission)).filter((item) => {
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

  const sections = useMemo(() => {
    return {
      main: filteredItems.filter((item) => item.section === 'main'),
      financeiro: filteredItems.filter((item) => item.section === 'financeiro'),
      relatorios: filteredItems.filter((item) => item.section === 'relatorios'),
      operacoes: filteredItems.filter((item) => item.section === 'operacoes'),
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
        <Icon size={18} strokeWidth={1.8} className="shrink-0" />
        {!isCollapsed ? <span className="truncate">{item.label}</span> : null}
        {!isCollapsed && item.badge === 'approvals' && pendingCount > 0 ? (
          <span className="ml-auto min-w-[18px] rounded-full bg-[var(--danger)] px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
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
        'hidden shrink-0 border-r transition-all duration-200 lg:flex lg:flex-col',
        !isVisible && 'lg:w-0 lg:overflow-hidden lg:border-r-0 lg:p-0',
        isVisible && (isCollapsed ? 'w-16 p-2' : 'w-[var(--sidebar-width)] p-3'),
      )}
      style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--sidebar-border)' }}
      aria-label="Menu lateral principal"
    >
      <button
        type="button"
        className="mb-3 inline-flex items-center gap-2 overflow-hidden rounded-lg px-2 py-2 text-left"
        onClick={() => setIsCollapsed((previous) => !previous)}
        aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-white">■</span>
        {!isCollapsed ? <span className="text-[14px] font-semibold text-[var(--text-primary)]">Nexos Financeiro</span> : null}
      </button>

      <nav className="scrollbar-thin min-h-0 flex-1 overflow-y-auto pr-1" aria-label="Navegacao do ERP">
        <div className="space-y-1">{sections.main.map(renderItem)}</div>
        {renderSection('financeiro')}
        {renderSection('relatorios')}
        {renderSection('operacoes')}
        {renderSection('configuracoes')}
      </nav>

      <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--sidebar-border)' }}>
        <div className={cn('flex items-center gap-2', isCollapsed ? 'justify-center' : '')}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-white">
            {getIdentityInitials(identity)}
          </div>
          {!isCollapsed ? (
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-[var(--text-primary)]">{identity}</p>
              <p className="truncate text-[11px] text-[var(--text-secondary)]">{roleLabel}</p>
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
          <LogOut size={18} strokeWidth={1.8} className="shrink-0" />
          {!isCollapsed ? <span>Sair</span> : null}
        </button>
      </div>
    </aside>
  );
}
