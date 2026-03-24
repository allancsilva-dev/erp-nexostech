'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuid } from 'uuid';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Role {
  id: string;
  name: string;
  isSystem: boolean;
}

interface Branch {
  id: string;
  name: string;
}

interface TenantUser {
  userId: string;
  email: string;
  roles: Role[];
  branches: Branch[];
}

export default function ConfiguracoesUsuariosPage() {
  const queryClient = useQueryClient();

  const [email, setEmail] = useState('');
  const [newRoleId, setNewRoleId] = useState('');
  const [newBranchIds, setNewBranchIds] = useState<string[]>([]);

  const usersQuery = useQuery({
    queryKey: ['configuracoes', 'usuarios'],
    queryFn: () => api.get<TenantUser[]>('/users'),
  });

  const rolesQuery = useQuery({
    queryKey: ['configuracoes', 'roles-catalog'],
    queryFn: () => api.get<Role[]>('/roles'),
  });

  const branchesQuery = useQuery({
    queryKey: ['configuracoes', 'branches-catalog'],
    queryFn: () => api.get<Branch[]>('/branches'),
  });

  const usersData = usersQuery.data?.data;
  const users = usersData ?? [];
  const roles = rolesQuery.data?.data ?? [];
  const branches = branchesQuery.data?.data ?? [];
  const isLoading = usersQuery.isLoading || rolesQuery.isLoading || branchesQuery.isLoading;
  const isError = usersQuery.isError || rolesQuery.isError || branchesQuery.isError;
  const errorMessage =
    usersQuery.error?.message || rolesQuery.error?.message || branchesQuery.error?.message || 'Erro desconhecido';

  const createUser = useMutation({
    mutationFn: () =>
      api.post<{ userId: string }>(
        '/users',
        {
          email,
          roleId: newRoleId,
          branchIds: newBranchIds,
        },
        uuid(),
      ),
    onSuccess: () => {
      toast.success('Usuario vinculado com sucesso');
      setEmail('');
      setNewRoleId('');
      setNewBranchIds([]);
      queryClient.invalidateQueries({ queryKey: ['configuracoes', 'usuarios'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateBranches = useMutation({
    mutationFn: ({ userId, branchIds }: { userId: string; branchIds: string[] }) =>
      api.patch<{ updated: true }>(`/users/${userId}/branches`, { branchIds }),
    onSuccess: () => {
      toast.success('Filiais atualizadas');
      queryClient.invalidateQueries({ queryKey: ['configuracoes', 'usuarios'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({
      userId,
      currentRoleIds,
      roleId,
    }: {
      userId: string;
      currentRoleIds: string[];
      roleId: string;
    }) => {
      await Promise.all(
        currentRoleIds.map((currentRoleId) =>
          api.delete(`/roles/users/${userId}/roles/${currentRoleId}`),
        ),
      );

      return api.post(`/users/${userId}/roles`, { roleId }, uuid());
    },
    onSuccess: () => {
      toast.success('Role atualizada');
      queryClient.invalidateQueries({ queryKey: ['configuracoes', 'usuarios'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const canSubmit = email.trim().length > 0 && newRoleId.length > 0;

  const branchIdsByUser = useMemo(
    () =>
      (usersData ?? []).reduce<Record<string, string[]>>((acc, item) => {
        acc[item.userId] = item.branches.map((branch) => branch.id);
        return acc;
      }, {}),
    [usersData],
  );

  return (
    <div>
      <PageHeader title="Usuários" subtitle="Gestão de usuários e acessos" />

      <Card className="surface-card mb-4 space-y-4 p-5">
        <h2 className="text-base font-semibold">Adicionar usuário</h2>

        <div className="grid gap-3 md:grid-cols-3">
          <Input
            placeholder="email@empresa.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <Select
            value={newRoleId}
            onChange={(event) => setNewRoleId(event.target.value)}
          >
            <option value="">Selecione a role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>

          <Button
            type="button"
            disabled={!canSubmit || createUser.isPending}
            onClick={() => createUser.mutate()}
          >
            {createUser.isPending ? 'Adicionando...' : 'Adicionar usuário'}
          </Button>
        </div>

        <div>
          <p className="mb-2 text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>
            Filiais iniciais (opcional)
          </p>
          <div className="flex flex-wrap gap-2">
            {branches.map((branch) => {
              const checked = newBranchIds.includes(branch.id);
              return (
                <label
                  key={branch.id}
                  className="inline-flex items-center gap-2 rounded px-3 py-1.5 text-sm"
                  style={{ border: '0.5px solid hsl(var(--border-default))', color: 'hsl(var(--text-secondary))' }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setNewBranchIds((previous) => [...previous, branch.id]);
                      } else {
                        setNewBranchIds((previous) =>
                          previous.filter((id) => id !== branch.id),
                        );
                      }
                    }}
                  />
                  {branch.name}
                </label>
              );
            })}
          </div>
        </div>
      </Card>

      <Card className="surface-card overflow-x-auto p-0">
        {isLoading ? (
          <div className="p-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 py-3">
                <div className="skeleton h-4 w-32" />
                <div className="skeleton h-4 flex-1" />
                <div className="skeleton h-4 w-20" />
              </div>
            ))}
          </div>
        ) : null}

        {isError ? (
          <div className="m-4 flex items-center justify-between rounded-lg p-4" style={{ background: 'hsl(var(--danger-muted))' }}>
            <div className="flex items-center gap-3">
              <AlertCircle size={18} style={{ color: 'hsl(var(--danger))' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'hsl(var(--danger))' }}>
                  Falha ao carregar dados
                </p>
                <p className="text-xs" style={{ color: 'hsl(var(--text-secondary))' }}>
                  {errorMessage}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                void usersQuery.refetch();
                void rolesQuery.refetch();
                void branchesQuery.refetch();
              }}
              className="rounded-md px-3 py-1.5 text-xs font-medium"
              style={{
                background: 'hsl(var(--bg-surface))',
                color: 'hsl(var(--text-primary))',
                border: '0.5px solid hsl(var(--border-default))',
              }}
            >
              Tentar novamente
            </button>
          </div>
        ) : null}

        {!isLoading && !isError ? (
          <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Filiais</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((item) => (
              <TableRow key={item.userId}>
                <TableCell>
                  <div className="font-medium">{item.email}</div>
                  <div className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>{item.userId}</div>
                </TableCell>

                <TableCell>
                  <Select
                    defaultValue={item.roles[0]?.id ?? ''}
                    onChange={(event) => {
                      updateRole.mutate({
                        userId: item.userId,
                        currentRoleIds: item.roles.map((role) => role.id),
                        roleId: event.target.value,
                      });
                    }}
                    disabled={updateRole.isPending}
                  >
                    <option value="">Selecione</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </Select>
                </TableCell>

                <TableCell>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {branches.map((branch) => {
                        const checked =
                          branchIdsByUser[item.userId]?.includes(branch.id) ?? false;
                        return (
                          <label
                            key={branch.id}
                            className="inline-flex items-center gap-2 rounded px-2 py-1 text-xs"
                            style={{ border: '0.5px solid hsl(var(--border-default))', color: 'hsl(var(--text-secondary))' }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                const current =
                                  branchIdsByUser[item.userId] ?? [];
                                const next = event.target.checked
                                  ? [...current, branch.id]
                                  : current.filter((id) => id !== branch.id);

                                updateBranches.mutate({
                                  userId: item.userId,
                                  branchIds: next,
                                });
                              }}
                              disabled={updateBranches.isPending}
                            />
                            {branch.name}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {users.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Inbox size={40} style={{ color: 'hsl(var(--text-muted))' }} strokeWidth={1} />
            <p className="mt-4 text-sm font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>
              Nenhum usuario vinculado
            </p>
            <p className="mt-1 text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
              Adicione o primeiro utilizador para comecar
            </p>
          </div>
        ) : null}
          </>
        ) : null}
      </Card>
    </div>
  );
}
