"use client";

import { usePermissions } from '@/hooks/use-permissions';
import { Card } from '@/components/ui/card';

// NOTE: pages own the document <h1>. Layouts must NOT render a semantic <h1> to
// avoid duplicate headings. This layout preserves the permission gate but only
// renders a visual title (non-<h1>) when blocking access.
export default function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  const { hasPermission, isAdmin } = usePermissions();
  const allowed = isAdmin || hasPermission('admin.users.manage');

  if (!allowed) {
    return (
      <div className="space-y-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-2xl font-semibold text-[var(--text-primary)]">Configurações</p>
            <p className="text-sm text-[var(--text-muted)]">Acesso restrito a administradores do tenant</p>
          </div>
        </div>
        <Card>Você não possui permissão para acessar a área de configurações.</Card>
      </div>
    );
  }

  return <div className="space-y-6">{children}</div>;
}
