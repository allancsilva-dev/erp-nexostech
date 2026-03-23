'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { FormSkeleton } from '@/components/shared/loading-skeleton';
import { useBranch } from '@/hooks/use-branch';
import { usePermissions } from '@/hooks/use-permissions';
import { api } from '@/lib/api-client';

interface FinancialSettingsData {
  branchId: string;
  closingDay: number;
  currency: string;
  alertDaysBefore: number;
  emailAlerts: boolean;
  maxRefundDaysPayable: number;
  maxRefundDaysReceivable: number;
}

interface FinancialSettingsForm {
  closingDay: number;
  currency: string;
  alertDaysBefore: number;
  emailAlerts: boolean;
  maxRefundDaysPayable: number;
  maxRefundDaysReceivable: number;
}

const DEFAULT_FORM: FinancialSettingsForm = {
  closingDay: 1,
  currency: 'BRL',
  alertDaysBefore: 3,
  emailAlerts: true,
  maxRefundDaysPayable: 90,
  maxRefundDaysReceivable: 180,
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export function FinancialSettings() {
  const { activeBranchId } = useBranch();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const canManage = hasPermission('financial.settings.manage');

  const [form, setForm] = useState<FinancialSettingsForm>(DEFAULT_FORM);

  const settingsQuery = useQuery({
    queryKey: ['settings', activeBranchId] as const,
    queryFn: () => api.get<FinancialSettingsData>('/settings'),
    enabled: Boolean(activeBranchId) && canManage,
  });

  useEffect(() => {
    if (!settingsQuery.data?.data) {
      return;
    }

    const data = settingsQuery.data.data;
    setForm({
      closingDay: data.closingDay,
      currency: data.currency,
      alertDaysBefore: data.alertDaysBefore,
      emailAlerts: data.emailAlerts,
      maxRefundDaysPayable: data.maxRefundDaysPayable,
      maxRefundDaysReceivable: data.maxRefundDaysReceivable,
    });
  }, [settingsQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (payload: FinancialSettingsForm) => api.put<FinancialSettingsData>('/settings', payload),
    onSuccess: () => {
      toast.success('Configuracoes financeiras salvas com sucesso');
      void queryClient.invalidateQueries({ queryKey: ['settings', activeBranchId] });
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error, 'Erro inesperado. Tente novamente.');
      toast.error(message);
      console.error('[settings:update]', error);
    },
  });

  if (!canManage) {
    return (
      <EmptyState
        title="Sem permissao para configuracoes financeiras"
        description="Sua conta nao possui acesso financial.settings.manage."
      />
    );
  }

  if (settingsQuery.isLoading) {
    return <FormSkeleton />;
  }

  if (settingsQuery.isError) {
    return <ErrorBanner message={getErrorMessage(settingsQuery.error, 'Erro inesperado. Tente novamente.')} onRetry={() => void settingsQuery.refetch()} />;
  }

  function updateNumberField(
    field: keyof Pick<FinancialSettingsForm, 'closingDay' | 'alertDaysBefore' | 'maxRefundDaysPayable' | 'maxRefundDaysReceivable'>,
    value: number,
  ): void {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const payload: FinancialSettingsForm = {
      closingDay: Math.max(1, Math.min(28, form.closingDay)),
      currency: form.currency.trim() || 'BRL',
      alertDaysBefore: Math.max(0, form.alertDaysBefore),
      emailAlerts: form.emailAlerts,
      maxRefundDaysPayable: Math.max(0, form.maxRefundDaysPayable),
      maxRefundDaysReceivable: Math.max(0, form.maxRefundDaysReceivable),
    };

    updateMutation.mutate(payload);
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
      <label className="text-sm font-medium">
        Dia de fechamento (1-28)
        <Input
          type="number"
          min={1}
          max={28}
          value={form.closingDay}
          onChange={(event) => updateNumberField('closingDay', Number(event.target.value))}
          disabled={updateMutation.isPending}
          required
        />
      </label>

      <label className="text-sm font-medium">
        Moeda
        <Input
          value={form.currency}
          onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))}
          disabled={updateMutation.isPending}
          required
        />
      </label>

      <label className="text-sm font-medium">
        Dias de alerta
        <Input
          type="number"
          min={0}
          value={form.alertDaysBefore}
          onChange={(event) => updateNumberField('alertDaysBefore', Number(event.target.value))}
          disabled={updateMutation.isPending}
          required
        />
      </label>

      <label className="text-sm font-medium">
        Limite de estorno (contas a pagar)
        <Input
          type="number"
          min={0}
          value={form.maxRefundDaysPayable}
          onChange={(event) => updateNumberField('maxRefundDaysPayable', Number(event.target.value))}
          disabled={updateMutation.isPending}
          required
        />
      </label>

      <label className="text-sm font-medium">
        Limite de estorno (contas a receber)
        <Input
          type="number"
          min={0}
          value={form.maxRefundDaysReceivable}
          onChange={(event) => updateNumberField('maxRefundDaysReceivable', Number(event.target.value))}
          disabled={updateMutation.isPending}
          required
        />
      </label>

      <label className="flex items-center gap-2 pt-7 text-sm font-medium">
        <input
          type="checkbox"
          checked={form.emailAlerts}
          onChange={(event) => setForm((current) => ({ ...current, emailAlerts: event.target.checked }))}
          disabled={updateMutation.isPending}
        />
        Enviar alertas por e-mail
      </label>

      <div className="md:col-span-2">
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Processando...' : 'Salvar configuracoes'}
        </Button>
      </div>
    </form>
  );
}
