'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { api } from '@/lib/api-client';
import { useBranch } from '@/hooks/use-branch';
import { usePermissions } from '@/hooks/use-permissions';

interface ApprovalRule {
  id: string;
  entryType?: 'PAYABLE' | 'RECEIVABLE';
  minAmount: string;
  approverRoleId: string;
  active: boolean;
}

interface RoleOption {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
}

interface ApprovalRuleFormState {
  entryType: '' | 'PAYABLE' | 'RECEIVABLE';
  minAmount: string;
  approverRoleId: string;
  active: boolean;
}

const DEFAULT_FORM: ApprovalRuleFormState = {
  entryType: '',
  minAmount: '0.00',
  approverRoleId: '',
  active: true,
};

function normalizeAmount(value: string): string {
  const normalized = value.replace(',', '.').trim();
  const numeric = Number.parseFloat(normalized);

  if (Number.isNaN(numeric) || numeric < 0) {
    return '0.00';
  }

  return numeric.toFixed(2);
}

export function ApprovalRulesManager() {
  const { activeBranchId } = useBranch();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ApprovalRuleFormState>(DEFAULT_FORM);

  const canManageRules = hasPermission('financial.approval_rules.manage');

  const rulesQuery = useQuery({
    queryKey: ['approval-rules', activeBranchId || 'default'] as const,
    queryFn: () => api.get<ApprovalRule[]>('/approval-rules'),
    enabled: Boolean(activeBranchId) && canManageRules,
    staleTime: 60_000,
  });

  const rolesQuery = useQuery({
    queryKey: ['roles', 'approval-rules'] as const,
    queryFn: () => api.get<RoleOption[]>('/roles'),
    enabled: canManageRules,
    staleTime: 60_000,
  });

  const createRule = useMutation({
    mutationFn: async (payload: ApprovalRuleFormState) => {
      await api.post('/approval-rules', {
        entryType: payload.entryType || null,
        minAmount: normalizeAmount(payload.minAmount),
        approverRoleId: payload.approverRoleId,
        active: payload.active,
      });
    },
    onSuccess: () => {
      setForm(DEFAULT_FORM);
      void queryClient.invalidateQueries({ queryKey: ['approval-rules', activeBranchId || 'default'] });
    },
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ApprovalRuleFormState }) => {
      await api.put(`/approval-rules/${id}`, {
        entryType: payload.entryType || null,
        minAmount: normalizeAmount(payload.minAmount),
        approverRoleId: payload.approverRoleId,
        active: payload.active,
      });
    },
    onSuccess: () => {
      setEditingId(null);
      setForm(DEFAULT_FORM);
      void queryClient.invalidateQueries({ queryKey: ['approval-rules', activeBranchId || 'default'] });
    },
  });

  const deleteRule = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await api.delete(`/approval-rules/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['approval-rules', activeBranchId || 'default'] });
    },
  });

  const isSubmitting = createRule.isPending || updateRule.isPending;
  const isDeleting = deleteRule.isPending;

  const errorMessage =
    rulesQuery.error?.message ??
    rolesQuery.error?.message ??
    createRule.error?.message ??
    updateRule.error?.message ??
    deleteRule.error?.message ??
    null;

  const rules = rulesQuery.data?.data ?? [];
  const roles = rolesQuery.data?.data ?? [];

  const roleMap = useMemo(() => {
    return new Map(roles.map((role) => [role.id, role.name]));
  }, [roles]);

  function startEdit(rule: ApprovalRule): void {
    setEditingId(rule.id);
    setForm({
      entryType: rule.entryType ?? '',
      minAmount: rule.minAmount,
      approverRoleId: rule.approverRoleId,
      active: rule.active,
    });
  }

  function resetForm(): void {
    setEditingId(null);
    setForm(DEFAULT_FORM);
  }

  async function submitForm(): Promise<void> {
    if (!form.approverRoleId) {
      return;
    }

    if (editingId) {
      await updateRule.mutateAsync({ id: editingId, payload: form });
      return;
    }

    await createRule.mutateAsync(form);
  }

  async function handleDelete(rule: ApprovalRule): Promise<void> {
    const approved = window.confirm(
      `Ao excluir esta regra, lancamentos acima de R$ ${normalizeAmount(rule.minAmount)} irao direto para PENDING sem aprovacao.`,
    );

    if (!approved) {
      return;
    }

    await deleteRule.mutateAsync({ id: rule.id });
  }

  if (!canManageRules) {
    return (
      <EmptyState
        title="Sem permissao para regras de aprovacao"
        description="Sua conta nao possui acesso financial.approval_rules.manage."
      />
    );
  }

  if (rulesQuery.isLoading || rolesQuery.isLoading) {
    return <TableSkeleton rows={7} cols={5} />;
  }

  return (
    <div className="space-y-4">
      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

      <div className="grid gap-3 rounded-xl border p-4 md:grid-cols-4">
        <label className="text-xs font-semibold uppercase tracking-wide">
          Tipo
          <select
            className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            value={form.entryType}
            onChange={(event) => setForm((current) => ({ ...current, entryType: event.target.value as ApprovalRuleFormState['entryType'] }))}
          >
            <option value="">Ambos</option>
            <option value="PAYABLE">PAYABLE</option>
            <option value="RECEIVABLE">RECEIVABLE</option>
          </select>
        </label>

        <label className="text-xs font-semibold uppercase tracking-wide">
          Valor minimo
          <Input
            value={form.minAmount}
            onChange={(event) => setForm((current) => ({ ...current, minAmount: event.target.value }))}
            onBlur={() => setForm((current) => ({ ...current, minAmount: normalizeAmount(current.minAmount) }))}
            placeholder="0.00"
          />
        </label>

        <label className="text-xs font-semibold uppercase tracking-wide">
          Role aprovadora
          <select
            className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            value={form.approverRoleId}
            onChange={(event) => setForm((current) => ({ ...current, approverRoleId: event.target.value }))}
          >
            <option value="">Selecione</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 pt-7 text-sm font-medium">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
          />
          Ativa
        </label>
      </div>

      <div className="flex gap-2">
        <Button type="button" onClick={() => void submitForm()} disabled={isSubmitting || !form.approverRoleId}>
          {editingId ? 'Salvar alteracoes' : 'Criar regra'}
        </Button>
        {editingId ? (
          <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>
            Cancelar edicao
          </Button>
        ) : null}
      </div>

      {rules.length === 0 ? (
        <EmptyState title="Nenhuma regra cadastrada" description="Crie regras para encaminhar lancamentos para aprovacao." />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left dark:bg-slate-900/60">
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Valor minimo</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Ativa</th>
                <th className="px-3 py-2 font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-b">
                  <td className="px-3 py-2">{rule.entryType ?? 'Ambos'}</td>
                  <td className="px-3 py-2">R$ {normalizeAmount(rule.minAmount)}</td>
                  <td className="px-3 py-2">{roleMap.get(rule.approverRoleId) ?? rule.approverRoleId}</td>
                  <td className="px-3 py-2">{rule.active ? 'Sim' : 'Nao'}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => startEdit(rule)} disabled={isSubmitting || isDeleting}>
                        Editar
                      </Button>
                      <Button type="button" variant="danger" size="sm" onClick={() => void handleDelete(rule)} disabled={isSubmitting || isDeleting}>
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
