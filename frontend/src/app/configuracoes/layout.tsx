"use client";

import { usePermissions } from '@/hooks/use-permissions';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';

export default function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  const { hasPermission, isAdmin } = usePermissions();
  const allowed = isAdmin || hasPermission('admin.users.manage');

  if (!allowed) {
    return (
      <div className="space-y-6">
        <PageHeader title="Configurações" subtitle="Acesso restrito a administradores do tenant" />
        <Card>Você não possui permissão para acessar a área de configurações.</Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" />
      {children}
    </div>
  );
}
