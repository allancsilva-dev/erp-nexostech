'use client';

import { Fragment, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { v4 as uuid } from 'uuid';
import { toast } from 'sonner';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MaskedInput } from '@/components/ui/masked-input';
import { usePermissions } from '@/hooks/use-permissions';
import { api } from '@/lib/api-client';

interface Branch {
  id: string;
  name: string;
  legalName: string | null;
  document: string | null;
  phone: string | null;
  email: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  isHeadquarters: boolean;
  active: boolean;
}

interface BranchForm {
  name: string;
  legalName: string;
  document: string;
  phone: string;
  email: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
}

interface BranchUserLink {
  userId: string;
}

const DEFAULT_FORM: BranchForm = {
  name: '',
  legalName: '',
  document: '',
  phone: '',
  email: '',
  addressCity: '',
  addressState: '',
  addressZip: '',
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

function normalizeState(value: string): string {
  return value.toUpperCase().slice(0, 2);
}

function toPayload(form: BranchForm): Record<string, string> {
  const payload: Record<string, string> = {
    name: form.name.trim(),
  };

  if (form.legalName.trim()) {
    payload.legalName = form.legalName.trim();
  }
  if (form.document.trim()) {
    payload.document = form.document.replace(/\D/g, '');
  }
  if (form.phone.trim()) {
    payload.phone = form.phone.replace(/\D/g, '');
  }
  if (form.email.trim()) {
    payload.email = form.email.trim();
  }
  if (form.addressCity.trim()) {
    payload.addressCity = form.addressCity.trim();
  }
  if (form.addressState.trim()) {
    payload.addressState = normalizeState(form.addressState);
  }
  if (form.addressZip.trim()) {
    payload.addressZip = form.addressZip.replace(/\D/g, '');
  }

  return payload;
}

export function BranchManager() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BranchForm>(DEFAULT_FORM);
  const [expandedBranchId, setExpandedBranchId] = useState<string | null>(null);
  const [userToLink, setUserToLink] = useState('');

  const canManageBranches = hasPermission('admin.branches.manage');
  const canManageUsers = hasPermission('admin.users.manage');

  const branchesQuery = useQuery({
    queryKey: ['branches'] as const,
    queryFn: () => api.get<Branch[]>('/branches'),
    enabled: canManageBranches,
  });

  const branchUsersQuery = useQuery({
    queryKey: ['branches', expandedBranchId, 'users'] as const,
    queryFn: () => api.get<BranchUserLink[]>(`/branches/${expandedBranchId}/users`),
    enabled: Boolean(expandedBranchId) && canManageUsers,
  });

  const createMutation = useMutation({
    mutationFn: (payload: BranchForm) => api.post<Branch>('/branches', toPayload(payload), uuid()),
    onSuccess: () => {
      toast.success('Filial criada com sucesso');
      setOpen(false);
      setForm(DEFAULT_FORM);
      void queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error, 'Erro inesperado. Tente novamente.');
      toast.error(message);
      console.error('[branches:create]', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: BranchForm }) =>
      api.put<Branch>(`/branches/${id}`, toPayload(payload), uuid()),
    onSuccess: () => {
      toast.success('Filial atualizada com sucesso');
      setOpen(false);
      setEditingId(null);
      setForm(DEFAULT_FORM);
      void queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error, 'Erro inesperado. Tente novamente.');
      toast.error(message);
      console.error('[branches:update]', error);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/branches/${id}`),
    onSuccess: () => {
      toast.success('Filial desativada com sucesso');
      void queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error, 'Erro inesperado. Tente novamente.');
      toast.error(message);
      console.error('[branches:deactivate]', error);
    },
  });

  const linkUserMutation = useMutation({
    mutationFn: ({ branchId, userId }: { branchId: string; userId: string }) =>
      api.post(`/branches/${branchId}/users`, { userId }, uuid()),
    onSuccess: () => {
      toast.success('Usuario vinculado com sucesso');
      setUserToLink('');
      void queryClient.invalidateQueries({ queryKey: ['branches', expandedBranchId, 'users'] });
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error, 'Erro inesperado. Tente novamente.');
      toast.error(message);
      console.error('[branches:link-user]', error);
    },
  });

  const unlinkUserMutation = useMutation({
    mutationFn: ({ branchId, userId }: { branchId: string; userId: string }) =>
      api.delete(`/branches/${branchId}/users/${userId}`),
    onSuccess: () => {
      toast.success('Usuario desvinculado com sucesso');
      void queryClient.invalidateQueries({ queryKey: ['branches', expandedBranchId, 'users'] });
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error, 'Erro inesperado. Tente novamente.');
      toast.error(message);
      console.error('[branches:unlink-user]', error);
    },
  });

  const sortedBranches = useMemo(() => {
    const branches = branchesQuery.data?.data ?? [];
    return [...branches].sort((a, b) => Number(b.active) - Number(a.active));
  }, [branchesQuery.data]);

  if (!canManageBranches) {
    return (
      <EmptyState
        title="Sem permissao para gerenciar filiais"
        description="Sua conta nao possui acesso admin.branches.manage."
      />
    );
  }

  if (branchesQuery.isLoading) {
    return <TableSkeleton rows={6} cols={6} />;
  }

  if (branchesQuery.isError) {
    return <ErrorBanner message={getErrorMessage(branchesQuery.error, 'Erro inesperado. Tente novamente.')} onRetry={() => void branchesQuery.refetch()} />;
  }

  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    deactivateMutation.isPending ||
    linkUserMutation.isPending ||
    unlinkUserMutation.isPending;

  function openCreate(): void {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setOpen(true);
  }

  function openEdit(branch: Branch): void {
    setEditingId(branch.id);
    setForm({
      name: branch.name,
      legalName: branch.legalName ?? '',
      document: branch.document ?? '',
      phone: branch.phone ?? '',
      email: branch.email ?? '',
      addressCity: branch.addressCity ?? '',
      addressState: branch.addressState ?? '',
      addressZip: branch.addressZip ?? '',
    });
    setOpen(true);
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (form.name.trim().length < 2) {
      toast.error('Nome da filial deve ter ao menos 2 caracteres.');
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload: form });
      return;
    }

    createMutation.mutate(form);
  }

  function handleDeactivate(branch: Branch): void {
    if (!branch.active) {
      return;
    }

    const approved = window.confirm('Filiais inativas não aparecem no branch switcher. Confirmar desativação?');
    if (!approved) {
      return;
    }

    deactivateMutation.mutate(branch.id);
  }

  function toggleExpand(branchId: string): void {
    setExpandedBranchId((current) => (current === branchId ? null : branchId));
    setUserToLink('');
  }

  function handleLinkUser(): void {
    if (!expandedBranchId || !userToLink.trim()) {
      return;
    }

    linkUserMutation.mutate({ branchId: expandedBranchId, userId: userToLink.trim() });
  }

  function handleUnlinkUser(userId: string): void {
    if (!expandedBranchId) {
      return;
    }

    unlinkUserMutation.mutate({ branchId: expandedBranchId, userId });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} disabled={isMutating}>
          Nova filial
        </Button>
      </div>

      {sortedBranches.length === 0 ? (
        <EmptyState title="Nenhuma filial cadastrada" description="Crie a primeira filial para habilitar operação multifilial." />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left bg-[var(--bg-surface-raised)]">
                <th className="px-3 py-2 font-medium">Nome</th>
                <th className="px-3 py-2 font-medium">CNPJ</th>
                <th className="px-3 py-2 font-medium">Cidade/UF</th>
                <th className="px-3 py-2 font-medium">Matriz</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {sortedBranches.map((branch) => (
                <Fragment key={branch.id}>
                  <tr key={branch.id} className="border-b">
                    <td className="px-3 py-2">{branch.name}</td>
                    <td className="px-3 py-2">{branch.document ?? '-'}</td>
                    <td className="px-3 py-2">{`${branch.addressCity ?? '-'} / ${branch.addressState ?? '-'}`}</td>
                    <td className="px-3 py-2">
                      {branch.isHeadquarters ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">Matriz</span>
                      ) : (
                        <span className="text-xs text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{branch.active ? 'Ativa' : 'Inativa'}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => toggleExpand(branch.id)} disabled={isMutating}>
                          {expandedBranchId === branch.id ? 'Ocultar usuarios' : 'Usuarios'}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => openEdit(branch)} disabled={isMutating}>
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeactivate(branch)}
                          disabled={isMutating || !branch.active}
                        >
                          {branch.active ? 'Desativar' : 'Desativada'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {expandedBranchId === branch.id ? (
                    <tr className="border-b bg-[var(--bg-surface-raised)]">
                      <td className="px-3 py-3" colSpan={6}>
                        {!canManageUsers ? (
                          <p className="text-sm text-slate-600">Sem permissao admin.users.manage para gerenciar vinculacao de usuarios.</p>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex flex-col gap-2 md:flex-row">
                              <Input
                                value={userToLink}
                                onChange={(event) => setUserToLink(event.target.value)}
                                placeholder="UUID do usuario"
                                disabled={isMutating}
                              />
                              <Button type="button" onClick={handleLinkUser} disabled={isMutating || userToLink.trim().length === 0}>
                                {linkUserMutation.isPending ? 'Processando...' : 'Vincular usuario'}
                              </Button>
                            </div>

                            {branchUsersQuery.isLoading ? (
                              <TableSkeleton rows={2} cols={2} />
                            ) : branchUsersQuery.isError ? (
                              <ErrorBanner
                                message={getErrorMessage(branchUsersQuery.error, 'Erro inesperado. Tente novamente.')}
                                onRetry={() => void branchUsersQuery.refetch()}
                              />
                            ) : (
                              <div className="space-y-2">
                                {(branchUsersQuery.data?.data ?? []).length === 0 ? (
                                  <p className="text-sm text-slate-600">Nenhum usuario vinculado.</p>
                                ) : (
                                  (branchUsersQuery.data?.data ?? []).map((user) => (
                                    <div key={user.userId} className="surface-card flex items-center justify-between px-3 py-2">
                                      <span className="text-sm">{user.userId}</span>
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleUnlinkUser(user.userId)}
                                        disabled={isMutating}
                                      >
                                        {unlinkUserMutation.isPending ? 'Processando...' : 'Desvincular'}
                                      </Button>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar filial' : 'Nova filial'}</DialogTitle>
          </DialogHeader>

          <form className="grid gap-3" onSubmit={handleSave}>
            <Input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Nome"
              disabled={isMutating}
              required
            />
            <Input
              value={form.legalName}
              onChange={(event) => setForm((current) => ({ ...current, legalName: event.target.value }))}
              placeholder="Razao social"
              disabled={isMutating}
            />
            <MaskedInput
              maskType="cnpj"
              value={form.document}
              onChange={(rawValue) => setForm((current) => ({ ...current, document: rawValue }))}
              placeholder="CNPJ (00.000.000/0000-00)"
              disabled={isMutating}
            />
            <MaskedInput
              maskType="phone"
              value={form.phone}
              onChange={(rawValue) => setForm((current) => ({ ...current, phone: rawValue }))}
              placeholder="Telefone"
              disabled={isMutating}
            />
            <Input
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="E-mail"
              disabled={isMutating}
            />
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                value={form.addressCity}
                onChange={(event) => setForm((current) => ({ ...current, addressCity: event.target.value }))}
                placeholder="Cidade"
                disabled={isMutating}
              />
              <Input
                value={form.addressState}
                onChange={(event) => setForm((current) => ({ ...current, addressState: normalizeState(event.target.value) }))}
                placeholder="UF"
                disabled={isMutating}
              />
              <MaskedInput
                maskType="cep"
                value={form.addressZip}
                onChange={(rawValue) => setForm((current) => ({ ...current, addressZip: rawValue }))}
                placeholder="CEP"
                disabled={isMutating}
              />
            </div>

            <div className="mt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  setEditingId(null);
                  setForm(DEFAULT_FORM);
                }}
                disabled={isMutating}
              >
                Fechar
              </Button>
              <Button type="submit" disabled={isMutating}>
                {isMutating ? 'Processando...' : editingId ? 'Salvar Alterações' : 'Criar filial'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
