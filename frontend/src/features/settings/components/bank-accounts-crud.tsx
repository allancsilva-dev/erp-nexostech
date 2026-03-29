'use client';

import { formatCurrency } from '@/lib/format';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { v4 as uuid } from 'uuid';
import { toast } from 'sonner';
import { CurrencyInput } from '@/components/shared/currency-input';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useBranch } from '@/hooks/use-branch';
import { usePermissions } from '@/hooks/use-permissions';
import { api } from '@/lib/api-client';

type BankAccountType = 'CORRENTE' | 'POUPANCA' | 'INVESTIMENTO' | 'CAIXA';

interface BankAccount {
  id: string;
  branchId: string;
  name: string;
  bankCode: string | null;
  agency: string | null;
  accountNumber: string | null;
  type: BankAccountType;
  initialBalance: string;
  active: boolean;
  createdAt: string;
}

interface BankAccountForm {
  name: string;
  bankCode: string;
  agency: string;
  accountNumber: string;
  type: BankAccountType;
  initialBalance: string;
}

const DEFAULT_FORM: BankAccountForm = {
  name: '',
  bankCode: '',
  agency: '',
  accountNumber: '',
  type: 'CORRENTE',
  initialBalance: '0.00',
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export function BankAccountsCrud() {
  const { activeBranchId } = useBranch();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BankAccountForm>(DEFAULT_FORM);

  const canManage = hasPermission('financial.bank_accounts.manage');

  const accountsQuery = useQuery({
    queryKey: ['bank-accounts', activeBranchId] as const,
    queryFn: () => api.get<BankAccount[]>('/bank-accounts'),
    enabled: Boolean(activeBranchId),
  });

  const createMutation = useMutation({
    mutationFn: (payload: BankAccountForm) => {
      if (!activeBranchId) {
        throw new Error('Filial ativa não encontrada.');
      }

      return api.post<BankAccount>('/bank-accounts', {
        branchId: activeBranchId,
        ...payload,
      });
    },
    onSuccess: () => {
      toast.success('Conta bancária criada com sucesso');
      setForm(DEFAULT_FORM);
      void queryClient.invalidateQueries({ queryKey: ['bank-accounts', activeBranchId] });
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error, 'Erro inesperado. Tente novamente.');
      toast.error(message);
      console.error('[bank-accounts:create]', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: BankAccountForm }) =>
      api.put<BankAccount>(`/bank-accounts/${id}`, payload, uuid()),
    onSuccess: () => {
      toast.success('Conta bancária atualizada com sucesso');
      setEditingId(null);
      setForm(DEFAULT_FORM);
      void queryClient.invalidateQueries({ queryKey: ['bank-accounts', activeBranchId] });
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error, 'Erro inesperado. Tente novamente.');
      toast.error(message);
      console.error('[bank-accounts:update]', error);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/bank-accounts/${id}`),
    onSuccess: () => {
      toast.success('Conta bancária desativada com sucesso');
      void queryClient.invalidateQueries({ queryKey: ['bank-accounts', activeBranchId] });
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error, 'Erro inesperado. Tente novamente.');
      toast.error(message);
      console.error('[bank-accounts:deactivate]', error);
    },
  });

  const isMutating = createMutation.isPending || updateMutation.isPending || deactivateMutation.isPending;

  const sortedAccounts = useMemo(() => {
    const accounts = accountsQuery.data?.data ?? [];
    return [...accounts].sort((a, b) => Number(b.active) - Number(a.active));
  }, [accountsQuery.data]);

  if (accountsQuery.isLoading) {
    return <TableSkeleton rows={6} cols={7} />;
  }

  if (accountsQuery.isError) {
    return <ErrorBanner message={getErrorMessage(accountsQuery.error, 'Erro inesperado. Tente novamente.')} onRetry={() => void accountsQuery.refetch()} />;
  }

  function resetForm(): void {
    setEditingId(null);
    setForm(DEFAULT_FORM);
  }

  function startEdit(account: BankAccount): void {
    setEditingId(account.id);
    setForm({
      name: account.name,
      bankCode: account.bankCode ?? '',
      agency: account.agency ?? '',
      accountNumber: account.accountNumber ?? '',
      type: account.type,
      initialBalance: account.initialBalance,
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!canManage) {
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload: form });
      return;
    }

    createMutation.mutate(form);
  }

  function handleDeactivate(account: BankAccount): void {
    if (!canManage || !account.active) {
      return;
    }

    const shouldDeactivate = window.confirm('Desativar conta bancária? A conta não poderá ser usada em novos lançamentos.');
    if (!shouldDeactivate) {
      return;
    }

    deactivateMutation.mutate(account.id);
  }

  return (
    <div className="space-y-4">
      {canManage ? (
        <form className="grid gap-3 rounded-xl border p-4 md:grid-cols-3" onSubmit={handleSubmit}>
          <label className="text-sm font-medium md:col-span-2">
            Nome
            <Input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              disabled={isMutating}
              required
            />
          </label>

          <label className="text-sm font-medium">
            Tipo
            <Select
              value={form.type}
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as BankAccountType }))}
              disabled={isMutating}
            >
              <option value="CORRENTE">Corrente</option>
              <option value="POUPANCA">Poupanca</option>
              <option value="INVESTIMENTO">Investimento</option>
              <option value="CAIXA">Caixa</option>
            </Select>
          </label>

          <label className="text-sm font-medium">
            Banco
            <Input
              value={form.bankCode}
              onChange={(event) => setForm((current) => ({ ...current, bankCode: event.target.value }))}
              disabled={isMutating}
            />
          </label>

          <label className="text-sm font-medium">
            Agencia
            <Input
              value={form.agency}
              onChange={(event) => setForm((current) => ({ ...current, agency: event.target.value }))}
              disabled={isMutating}
            />
          </label>

          <label className="text-sm font-medium">
            Conta
            <Input
              value={form.accountNumber}
              onChange={(event) => setForm((current) => ({ ...current, accountNumber: event.target.value }))}
              disabled={isMutating}
            />
          </label>

          <label className="text-sm font-medium md:col-span-2">
            Saldo inicial
            <CurrencyInput
              value={form.initialBalance}
              onChange={(value) => setForm((current) => ({ ...current, initialBalance: value || '0.00' }))}
              disabled={isMutating}
            />
          </label>

            <div className="flex items-end gap-2">
            <Button type="submit" disabled={isMutating}>
              {isMutating ? 'Processando...' : editingId ? 'Salvar Alterações' : 'Criar conta'}
            </Button>
            {editingId ? (
              <Button type="button" variant="outline" onClick={resetForm} disabled={isMutating}>
                Cancelar
              </Button>
            ) : null}
          </div>
        </form>
      ) : (
        <EmptyState
          title="Sem permissao para gerenciar contas"
          description="Sua conta nao possui acesso financial.bank_accounts.manage para criar ou editar contas."
        />
      )}

      {sortedAccounts.length === 0 ? (
        <EmptyState title="Nenhuma conta bancaria cadastrada" description="Crie uma conta para iniciar conciliacoes e movimentacoes." />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left bg-[var(--bg-surface-raised)]">
                <th className="px-3 py-2 font-medium">Nome</th>
                <th className="px-3 py-2 font-medium">Banco</th>
                <th className="px-3 py-2 font-medium">Agencia/Conta</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Saldo inicial</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sortedAccounts.map((account) => (
                <tr key={account.id} className="border-b">
                  <td className="px-3 py-2">{account.name}</td>
                  <td className="px-3 py-2">{account.bankCode ?? '-'}</td>
                  <td className="px-3 py-2">{`${account.agency ?? '-'} / ${account.accountNumber ?? '-'}`}</td>
                  <td className="px-3 py-2">{account.type}</td>
                  <td className="px-3 py-2">{formatCurrency(account.initialBalance)}</td>
                  <td className="px-3 py-2">{account.active ? 'Ativa' : 'Inativa'}</td>
                  <td className="px-3 py-2">
                    {canManage ? (
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => startEdit(account)} disabled={isMutating}>
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeactivate(account)}
                          disabled={isMutating || !account.active}
                        >
                          {account.active ? 'Desativar' : 'Desativada'}
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">Sem permissao</span>
                    )}
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
