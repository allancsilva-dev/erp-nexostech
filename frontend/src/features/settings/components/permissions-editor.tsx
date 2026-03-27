import { useMemo, useState } from 'react';
import { usePermissions } from '@/features/settings/hooks/use-permissions';
import { groupPermissions, getPermissionLabel } from '@/lib/permission-labels';
import { Button } from '@/components/ui/button';

type Role = { id: string; name: string; permissions: string[] };

type Props = {
  role: Role;
  onSave: (roleId: string, permissions: string[]) => void;
  onDelete: (roleId: string) => void;
};

export function PermissionsEditor({ role, onSave, onDelete }: Props) {
  const [permissions, setPermissions] = useState<string[]>(role.permissions ?? []);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: allPermissions = [], isLoading } = usePermissions();

  const permsByModule = useMemo(() => groupPermissions(allPermissions), [allPermissions]);

  function togglePermission(perm: string) {
    setPermissions((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]));
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave(role.id, permissions);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Excluir perfil "${role.name}"? Esta acao e irreversivel.`)) return;
    setIsDeleting(true);
    try {
      await onDelete(role.id);
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return <p>Carregando permissões...</p>;
  }

  return (
    <div className="surface-card p-5">
      <h4 className="text-base font-semibold text-[var(--text-primary)] mb-3">Permissões do perfil: {role.name}</h4>

      {Object.entries(permsByModule).map(([module, perms]) => (
        <div key={module} className="mb-4">
          <h5 className="text-sm font-medium text-[var(--text-primary)] mb-2">
            {module === 'financial' ? 'Financeiro' : module === 'admin' ? 'Administração' : module}
          </h5>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {perms.map((perm) => (
              <label key={perm} className="flex items-center gap-2 rounded px-3 py-1.5 text-sm border-[0.5px] border-[var(--border-default)]">
                <input type="checkbox" checked={permissions.includes(perm)} onChange={() => togglePermission(perm)} />
                <span className="ml-2 text-[var(--text-primary)]">{getPermissionLabel(perm)}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar alterações'}</Button>
        <Button onClick={handleDelete} disabled={isDeleting} variant="destructive">{isDeleting ? 'Excluindo...' : 'Excluir perfil'}</Button>
      </div>
    </div>
  );
}

export default PermissionsEditor;
