'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface PermissionDef {
  code: string;
  module: string;
  description: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
}

export default function ConfiguracoesRolesPage() {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const rolesQuery = useQuery({
    queryKey: ['configuracoes', 'roles'],
    queryFn: () => api.get<Role[]>('/roles'),
  });

  const permissionsQuery = useQuery({
    queryKey: ['configuracoes', 'permissions'],
    queryFn: () => api.get<Record<string, PermissionDef[]>>('/permissions'),
  });

  const createRole = useMutation({
    mutationFn: () =>
      api.post('/roles', {
        name,
        description,
        permissionCodes: [],
      }),
    onSuccess: () => {
      toast.success('Role criada com sucesso');
      setName('');
      setDescription('');
      queryClient.invalidateQueries({ queryKey: ['configuracoes', 'roles'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updatePermissions = useMutation({
    mutationFn: ({ roleId, permissionCodes }: { roleId: string; permissionCodes: string[] }) =>
      api.patch(`/roles/${roleId}/permissions`, { permissionCodes }),
    onSuccess: () => {
      toast.success('Permissoes atualizadas');
      queryClient.invalidateQueries({ queryKey: ['configuracoes', 'roles'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteRole = useMutation({
    mutationFn: (roleId: string) => api.delete(`/roles/${roleId}`),
    onSuccess: () => {
      toast.success('Role removida');
      queryClient.invalidateQueries({ queryKey: ['configuracoes', 'roles'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const roles = rolesQuery.data?.data ?? [];
  const permissionsByModule = permissionsQuery.data?.data ?? {};

  const groupedPermissions = useMemo(
    () => Object.entries(permissionsByModule),
    [permissionsByModule],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles e permissoes"
        subtitle="Crie roles de tenant e ajuste permissoes por modulo"
      />

      <Card className="space-y-3">
        <h2 className="text-base font-semibold">Nova role</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            placeholder="Nome da role"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            placeholder="Descricao"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <Button
            type="button"
            onClick={() => createRole.mutate()}
            disabled={!name || !description || createRole.isPending}
          >
            {createRole.isPending ? 'Criando...' : 'Criar role'}
          </Button>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Permissoes</TableHead>
              <TableHead className="w-36">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell>
                  <div className="font-medium">{role.name}</div>
                  <div className="text-xs text-slate-500">{role.description}</div>
                  {role.isSystem ? (
                    <span className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs">
                      Sistema
                    </span>
                  ) : null}
                </TableCell>

                <TableCell>
                  <div className="space-y-3">
                    {groupedPermissions.map(([moduleName, modulePermissions]) => (
                      <div key={moduleName}>
                        <div className="mb-1 text-xs font-semibold uppercase text-slate-500">
                          {moduleName}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {modulePermissions.map((permission) => {
                            const checked = role.permissions.includes(permission.code);
                            return (
                              <label
                                key={permission.code}
                                className="inline-flex items-center gap-2 rounded border px-2 py-1 text-xs"
                                title={permission.description}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(event) => {
                                    const next = event.target.checked
                                      ? [...role.permissions, permission.code]
                                      : role.permissions.filter(
                                          (code) => code !== permission.code,
                                        );

                                    updatePermissions.mutate({
                                      roleId: role.id,
                                      permissionCodes: Array.from(new Set(next)),
                                    });
                                  }}
                                  disabled={updatePermissions.isPending || role.isSystem}
                                />
                                {permission.code}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </TableCell>

                <TableCell>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={role.isSystem || deleteRole.isPending}
                    onClick={() => {
                      const confirmed = window.confirm(
                        `Excluir role ${role.name}? Esta acao nao pode ser desfeita.`,
                      );
                      if (confirmed) {
                        deleteRole.mutate(role.id);
                      }
                    }}
                  >
                    Excluir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {roles.length === 0 ? (
          <p className="p-3 text-sm text-slate-500">Nenhuma role cadastrada.</p>
        ) : null}
      </Card>
    </div>
  );
}
