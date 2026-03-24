'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Inbox } from 'lucide-react';
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
      toast.success('Perfil criado com sucesso');
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
      toast.success('Perfil removido');
      queryClient.invalidateQueries({ queryKey: ['configuracoes', 'roles'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const roles = rolesQuery.data?.data ?? [];
  const permissionsData = permissionsQuery.data?.data;
  const isLoading = rolesQuery.isLoading || permissionsQuery.isLoading;
  const isError = rolesQuery.isError || permissionsQuery.isError;
  const errorMessage = rolesQuery.error?.message || permissionsQuery.error?.message || 'Erro desconhecido';

  const groupedPermissions = useMemo(
    () => Object.entries(permissionsData ?? {}),
    [permissionsData],
  );

  return (
    <div>
      <PageHeader title="Permissões" subtitle="Perfis e permissões" />

      <Card className="surface-card mb-4 space-y-3 p-5">
        <h2 className="text-base font-semibold">Novo perfil</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            placeholder="Nome do perfil"
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
            {createRole.isPending ? 'Criando...' : 'Criar perfil'}
          </Button>
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
                void rolesQuery.refetch();
                void permissionsQuery.refetch();
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
              <TableHead>Perfil</TableHead>
              <TableHead>Permissões</TableHead>
              <TableHead className="w-36">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell>
                  <div className="font-medium">{role.name}</div>
                  <div className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>{role.description}</div>
                  {role.isSystem ? (
                    <span
                      className="mt-1 inline-block rounded px-2 py-0.5 text-xs"
                      style={{ background: 'hsl(var(--bg-surface-raised))', color: 'hsl(var(--text-muted))' }}
                    >
                      Sistema
                    </span>
                  ) : null}
                </TableCell>

                <TableCell>
                  <div className="space-y-3">
                    {groupedPermissions.map(([moduleName, modulePermissions]) => (
                      <div key={moduleName}>
                        <div className="mb-1 text-xs font-semibold uppercase" style={{ color: 'hsl(var(--text-muted))' }}>
                          {moduleName}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {modulePermissions.map((permission) => {
                            const checked = role.permissions.includes(permission.code);
                            return (
                              <label
                                key={permission.code}
                                className="inline-flex items-center gap-2 rounded px-2 py-1 text-xs"
                                style={{ border: '0.5px solid hsl(var(--border-default))', color: 'hsl(var(--text-secondary))' }}
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
          <div className="flex flex-col items-center py-12 text-center">
            <Inbox size={40} style={{ color: 'hsl(var(--text-muted))' }} strokeWidth={1} />
            <p className="mt-4 text-sm font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>
              Nenhuma role cadastrada
            </p>
            <p className="mt-1 text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
              Crie a primeira role para definir acessos
            </p>
          </div>
        ) : null}
          </>
        ) : null}
      </Card>
    </div>
  );
}
