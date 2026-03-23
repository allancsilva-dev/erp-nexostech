'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { useBranch } from '@/hooks/use-branch';
import { usePermissions } from '@/hooks/use-permissions';
import { api } from '@/lib/api-client';

interface LockPeriod {
  id: string;
  branchId: string;
  lockedUntil: string;
  reason: string | null;
  lockedBy: string;
  createdAt: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('pt-BR');
}

export function LockPeriodForm() {
  const { activeBranchId } = useBranch();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  const [lockedUntil, setLockedUntil] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');

  const canManage = hasPermission('financial.settings.manage');
  const canRemove = hasPermission('admin.users.manage');

  const lockPeriodsQuery = useQuery({
    queryKey: ['lock-periods', activeBranchId] as const,
    queryFn: () => api.get<LockPeriod[]>('/lock-periods'),
    enabled: Boolean(activeBranchId) && canManage,
  });

  const createMutation = useMutation({
    mutationFn: (payload: { lockedUntil: string; reason: string }) => api.post<LockPeriod>('/lock-periods', payload),
    onSuccess: () => {
      toast.success('Periodo de bloqueio criado com sucesso');
      setReason('');
      void queryClient.invalidateQueries({ queryKey: ['lock-periods', activeBranchId] });
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error, 'Erro inesperado. Tente novamente.');
      toast.error(message);
      console.error('[lock-periods:create]', error);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/lock-periods/${id}`),
    onSuccess: () => {
      toast.success('Periodo de bloqueio removido com sucesso');
      void queryClient.invalidateQueries({ queryKey: ['lock-periods', activeBranchId] });
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error, 'Erro inesperado. Tente novamente.');
      toast.error(message);
      console.error('[lock-periods:remove]', error);
    },
  });

  const activeLock = useMemo(() => {
    const now = new Date();
    return (lockPeriodsQuery.data?.data ?? []).find((item) => {
      const lockedDate = new Date(item.lockedUntil);
      return !Number.isNaN(lockedDate.getTime()) && lockedDate >= now;
    });
  }, [lockPeriodsQuery.data]);

  if (!canManage) {
    return (
      <EmptyState
        title="Sem permissao para bloqueio contabil"
        description="Sua conta nao possui acesso financial.settings.manage."
      />
    );
  }

  if (lockPeriodsQuery.isLoading) {
    return <TableSkeleton rows={5} cols={4} />;
  }

  if (lockPeriodsQuery.isError) {
    return <ErrorBanner message={getErrorMessage(lockPeriodsQuery.error, 'Erro inesperado. Tente novamente.')} onRetry={() => void lockPeriodsQuery.refetch()} />;
  }

  const isSubmitting = createMutation.isPending || removeMutation.isPending;
  const periods = lockPeriodsQuery.data?.data ?? [];

  function handleCreate(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (reason.trim().length < 5) {
      toast.error('Informe um motivo com no minimo 5 caracteres.');
      return;
    }

    createMutation.mutate({
      lockedUntil,
      reason: reason.trim(),
    });
  }

  function handleRemove(item: LockPeriod): void {
    if (!canRemove) {
      return;
    }

    const shouldRemove = window.confirm(
      `Todos os lancamentos ate ${formatDate(item.lockedUntil)} serao desbloqueados para edicao. Confirmar?`,
    );

    if (!shouldRemove) {
      return;
    }

    removeMutation.mutate(item.id);
  }

  return (
    <div className="space-y-4">
      {activeLock ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Lancamentos com data ate {formatDate(activeLock.lockedUntil)} estao bloqueados para alteracao.
        </div>
      ) : null}

      <form className="grid gap-3 rounded-xl border p-4 md:grid-cols-2" onSubmit={handleCreate}>
        <label className="text-sm font-medium">
          Bloqueado ate
          <Input
            type="date"
            value={lockedUntil}
            onChange={(event) => setLockedUntil(event.target.value)}
            disabled={isSubmitting}
            required
          />
        </label>

        <label className="text-sm font-medium">
          Motivo
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={isSubmitting}
            minLength={5}
            required
            placeholder="Ex.: Fechamento contabil mensal"
          />
        </label>

        <div className="md:col-span-2">
          <Button type="submit" disabled={isSubmitting}>
            {createMutation.isPending ? 'Processando...' : 'Criar bloqueio'}
          </Button>
        </div>
      </form>

      {periods.length === 0 ? (
        <EmptyState title="Nenhum bloqueio cadastrado" description="Crie um bloqueio contabil para proteger periodos fechados." />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[680px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left dark:bg-slate-900/60">
                <th className="px-3 py-2 font-medium">Bloqueado ate</th>
                <th className="px-3 py-2 font-medium">Motivo</th>
                <th className="px-3 py-2 font-medium">Criado em</th>
                <th className="px-3 py-2 font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="px-3 py-2">{formatDate(item.lockedUntil)}</td>
                  <td className="px-3 py-2">{item.reason ?? '-'}</td>
                  <td className="px-3 py-2">{formatDate(item.createdAt)}</td>
                  <td className="px-3 py-2">
                    {canRemove ? (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemove(item)}
                        disabled={isSubmitting}
                      >
                        {removeMutation.isPending ? 'Processando...' : 'Remover bloqueio'}
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-500">Sem permissao para remover</span>
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
