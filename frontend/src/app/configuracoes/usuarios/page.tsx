'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

  const users = usersQuery.data?.data ?? [];
  const roles = rolesQuery.data?.data ?? [];
  const branches = branchesQuery.data?.data ?? [];

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
      users.reduce<Record<string, string[]>>((acc, item) => {
        acc[item.userId] = item.branches.map((branch) => branch.id);
        return acc;
      }, {}),
    [users],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        subtitle="Vincule usuarios do Auth ao tenant e gerencie roles e filiais"
      />

      <Card className="space-y-4">
        <h2 className="text-base font-semibold">Adicionar usuario</h2>

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
            {createUser.isPending ? 'Adicionando...' : 'Adicionar usuario'}
          </Button>
        </div>

        <div>
          <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">
            Filiais iniciais (opcional)
          </p>
          <div className="flex flex-wrap gap-2">
            {branches.map((branch) => {
              const checked = newBranchIds.includes(branch.id);
              return (
                <label
                  key={branch.id}
                  className="inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm"
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

      <Card className="overflow-x-auto">
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
                  <div className="text-xs text-slate-500">{item.userId}</div>
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
                            className="inline-flex items-center gap-2 rounded border px-2 py-1 text-xs"
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
          <p className="p-3 text-sm text-slate-500">Nenhum usuario vinculado ao tenant.</p>
        ) : null}
      </Card>
    </div>
  );
}
