'use client';

import { useState } from 'react';
import Link from 'next/link';
import { EmptyState } from '@/components/shared/empty-state';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/shared/permission-gate';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useContacts, useDeleteContact } from '@/features/contacts/hooks/use-contacts';
import type { Contact } from '@/features/contacts/types/contact.types';

export function ContactsTable() {
  const contactsQuery = useContacts(undefined, undefined);
  const deleteContact = useDeleteContact();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);

  if (contactsQuery.isLoading) {
    return <TableSkeleton rows={6} cols={6} />;
  }

  if (contactsQuery.isError) {
    return <EmptyState title="Erro" description={contactsQuery.error?.message ?? 'Falha ao carregar contatos.'} />;
  }

  const list: Contact[] = Array.isArray(contactsQuery.data?.data) ? contactsQuery.data!.data : [];

  if (list.length === 0) {
    return <EmptyState title="Nenhum contato" description="Crie um contato para começar." />;
  }

  return (
    <div className="surface-card overflow-x-auto p-3">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b text-left bg-[var(--bg-surface-raised)]">
            <th className="px-3 py-2 font-medium">Nome</th>
            <th className="px-3 py-2 font-medium">Tipo</th>
            <th className="px-3 py-2 font-medium">Documento</th>
            <th className="px-3 py-2 font-medium">Telefone</th>
            <th className="px-3 py-2 font-medium">E-mail</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          {list.map((c) => (
            <tr key={c.id} className="border-b">
              <td className="px-3 py-2">{c.name}</td>
              <td className="px-3 py-2">{c.type === 'FORNECEDOR' ? 'Fornecedor' : c.type === 'CLIENTE' ? 'Cliente' : 'Fornecedor e Cliente'}</td>
              <td className="px-3 py-2">{c.document ?? '-'}</td>
              <td className="px-3 py-2">{c.phone ?? '-'}</td>
              <td className="px-3 py-2">{c.email ?? '-'}</td>
              <td className="px-3 py-2">{c.active ? 'Ativo' : 'Inativo'}</td>
              <td className="px-3 py-2">
                <div className="flex gap-2">
                  <Link href={`/financeiro/contatos/${c.id}/editar`} className="text-sm font-medium text-[var(--text-primary)]">
                    Editar
                  </Link>
                  <PermissionGate permission="contacts.manage">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={deletingId === c.id || deleteContact.isPending}
                      onClick={() => {
                        setTargetId(c.id);
                        setConfirmOpen(true);
                      }}
                    >
                      {deletingId === c.id || (deleteContact.isPending && targetId === c.id) ? 'Excluindo...' : 'Excluir'}
                    </Button>
                  </PermissionGate>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ConfirmDialog
        open={confirmOpen}
        title="Excluir contato"
        description="Tem certeza que deseja excluir este contato? Esta ação não pode ser desfeita."
        onCancel={() => {
          setConfirmOpen(false);
          setTargetId(null);
        }}
        onConfirm={() => {
          if (!targetId) return;
          setDeletingId(targetId);
          setConfirmOpen(false);
          deleteContact.mutate(targetId, {
            onSettled: () => {
              setDeletingId(null);
              setTargetId(null);
            },
          });
        }}
      />
    </div>
  );
}

export default ContactsTable;
