'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import { ROUTES } from '@/lib/constants';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const TABS = [
  { href: ROUTES.configuracoesUsuarios, label: 'Usuarios' },
  { href: ROUTES.configuracoesRoles, label: 'Roles e Permissoes' },
] as const;

export default function ConfiguracoesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { hasPermission, isAdmin } = usePermissions();
  const allowed = isAdmin || hasPermission('admin.users.manage');

  if (!allowed) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Configuracoes"
          subtitle="Acesso restrito a administradores do tenant"
        />
        <Card>
          Voce nao possui permissao para acessar a area de configuracoes de
          usuarios e roles.
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuracoes de Acesso"
        subtitle="Gestao de usuarios, roles e permissoes do tenant"
      />

      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              pathname === tab.href
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {children}
    </div>
  );
}
