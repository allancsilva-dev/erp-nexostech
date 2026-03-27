'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { getPermissionLabel, groupPermissions } from '@/lib/permission-labels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Role = { id: string; name: string; permissions: string[] };

export function RolesManager() {
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<Record<string, boolean>>({});
  const [newRoleName, setNewRoleName] = useState('');

  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: () => api.get<Role[]>('/roles') });
  const permsQuery = useQuery({ queryKey: ['permissions'], queryFn: () => api.get<string[]>('/permissions') });

  const roles = rolesQuery.data?.data ?? [];
  // normalize permissions list: accept array of strings or array of { code }
  const rawPerms = permsQuery.data?.data ?? [];
  const permissions: string[] = useMemo(() => {
    if (!Array.isArray(rawPerms)) return [];
    if (rawPerms.length === 0) return [];
    if (typeof rawPerms[0] === 'string') return rawPerms as string[];
    const first = rawPerms[0] as unknown as Record<string, unknown>;
    if (first && typeof first === 'object' && 'code' in first) {
      return (rawPerms as unknown as Array<{ code: string }>).map((p) => p.code);
    }
    return rawPerms as string[];
  }, [rawPerms]);

  const permsByModule = useMemo(() => groupPermissions(permissions), [permissions]);

  const updatePermissions = useMutation({
    mutationFn: ({ roleId, permissions }: { roleId: string; permissions: string[] }) => api.patch(`/roles/${roleId}/permissions`, { permissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });

  const createRole = useMutation({
    mutationFn: (name: string) => api.post('/roles', { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null;

  function togglePermission(code: string) {
    setEditingPermissions((prev) => ({ ...prev, [code]: !prev[code] }));
  }

  function applyPermissions() {
    if (!selectedRole) return;
    const next = Object.entries(editingPermissions).filter(([, v]) => v).map(([k]) => k);
    updatePermissions.mutate({ roleId: selectedRole.id, permissions: next });
  }

  function startEdit(role: Role) {
    setSelectedRoleId(role.id);
    const map: Record<string, boolean> = {};
    role.permissions.forEach((p) => (map[p] = true));
    setEditingPermissions(map);
  }

  async function handleCreateRole() {
    if (!newRoleName.trim()) return;
    await createRole.mutateAsync(newRoleName.trim());
    setNewRoleName('');
  }

  return (
    <div className="surface-card p-5">
      <h3 className="text-lg font-semibold mb-3 text-[var(--text-primary)]">Criar novo perfil de acesso</h3>
      <div className="mb-4 flex gap-2">
        <Input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="Nome do perfil" />
        <Button onClick={handleCreateRole} disabled={createRole.isPending || !newRoleName.trim()}>{createRole.isPending ? 'Criando...' : 'Criar'}</Button>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Perfis existentes</h4>
        <div className="flex flex-wrap gap-2">
          {roles.map((role) => (
            <button
              key={role.id}
              className="px-3 py-1.5 rounded border-[0.5px] border-[var(--border-default)] text-sm text-[var(--text-primary)]"
              onClick={() => startEdit(role)}
            >
              {role.name}
            </button>
          ))}
        </div>
      </div>

      {selectedRole ? (
        <div>
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Permissões do perfil: {selectedRole.name}</h4>

          {Object.entries(permsByModule).map(([module, perms]) => (
            <div key={module} className="mb-4">
              <h5 className="text-sm font-medium text-[var(--text-primary)] mb-2">{module === 'financial' ? 'Financeiro' : module === 'admin' ? 'Administração' : module}</h5>
              <div className="flex flex-wrap gap-2">
                {perms.map((perm) => (
                  <label key={perm} className="inline-flex items-center gap-2 rounded px-3 py-1.5 text-sm border-[0.5px] border-[var(--border-default)] text-[var(--text-secondary)]">
                    <input type="checkbox" checked={!!editingPermissions[perm]} onChange={() => togglePermission(perm)} />
                    <span className="ml-1 text-[var(--text-primary)]">{getPermissionLabel(perm)}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <Button onClick={applyPermissions} disabled={updatePermissions.isPending}>{updatePermissions.isPending ? 'Salvando...' : 'Salvar permissões'}</Button>
            <Button onClick={() => { setSelectedRoleId(null); setEditingPermissions({}); }} variant="ghost">Cancelar</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default RolesManager;
