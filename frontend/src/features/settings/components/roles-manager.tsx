'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
// groupPermissions not needed here; PermissionsEditor uses ALL_PERMISSIONS
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PermissionsEditor from '@/features/settings/components/permissions-editor';

type Role = { id: string; name: string; permissions: string[] };

export function RolesManager() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [newRoleName, setNewRoleName] = useState('');

  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: () => api.get<Role[]>('/roles') });

  const roles = rolesQuery.data?.data ?? [];
  // normalize permissions list: accept array of strings or array of { code }
  // permissions are loaded in permsQuery but not required here; PermissionsEditor will use ALL_PERMISSIONS

  const updatePermissions = useMutation({
    mutationFn: ({ roleId, permissions }: { roleId: string; permissions: string[] }) => api.patch(`/roles/${roleId}/permissions`, { permissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });

  const deleteRole = useMutation({
    mutationFn: (roleId: string) => api.delete(`/roles/${roleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setSelectedRole(null);
    },
  });

  const createRole = useMutation({
    mutationFn: (name: string) => api.post('/roles', { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });

  function startEdit(role: Role) {
    setSelectedRole(role);
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
              className={
                'px-3 py-1.5 rounded border-[0.5px] border-[var(--border-default)] text-sm ' +
                (selectedRole?.id === role.id ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'text-[var(--text-primary)]')
              }
              onClick={() => startEdit(role)}
            >
              {role.name}
            </button>
          ))}
        </div>
      </div>

      {selectedRole ? (
        <PermissionsEditor
          role={selectedRole}
          onSave={async (roleId, perms) => updatePermissions.mutate({ roleId, permissions: perms })}
          onDelete={async (roleId) => deleteRole.mutate(roleId)}
        />
      ) : null}
    </div>
  );
}

export default RolesManager;
