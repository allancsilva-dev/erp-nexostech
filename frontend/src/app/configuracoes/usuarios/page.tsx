'use client';
import { PageHeader } from '@/components/layout/page-header';
import { UsuariosView } from '@/features/users/components/usuarios-view';
export default function ConfiguracoesUsuariosPage() {
  return (
    <div>
      <PageHeader title="Usuários" subtitle="Gestão de usuários e acessos" />
      <UsuariosView showHeader={false} />
    </div>
  );
}
