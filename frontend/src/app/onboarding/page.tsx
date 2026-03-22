'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Loader2, TriangleAlert } from 'lucide-react';
import { api } from '@/lib/api-client';
import { ApiError } from '@/lib/api-types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type OnboardingPayload = {
  name: string;
};

type OnboardingResponse = {
  id: string;
  name: string;
  slug: string;
  schema: string;
  active: boolean;
  createdAt: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [tenantName, setTenantName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trimmedTenantName = useMemo(() => tenantName.trim(), [tenantName]);

  const onboardingMutation = useMutation({
    mutationFn: async (payload: OnboardingPayload) => api.post<OnboardingResponse>('/tenants/onboarding', payload),
    onSuccess: (response) => {
      setErrorMessage(null);
      console.info('[onboarding.createTenant]', {
        tenantId: response.data.id,
      });
      router.replace('/dashboard');
    },
    onError: (error: unknown) => {
      const message = error instanceof ApiError
        ? error.message
        : 'Erro inesperado ao finalizar onboarding. Tente novamente.';

      setErrorMessage(message);
      console.error('[onboarding.createTenant]', error);
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmedTenantName || onboardingMutation.isPending) {
      return;
    }

    onboardingMutation.mutate({
      name: trimmedTenantName,
    });
  };

  if (onboardingMutation.isPending) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center justify-center">
        <Card className="w-full space-y-4 p-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-500" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Configurando sua empresa...</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Estamos preparando tenant, filial matriz e permissoes iniciais para liberar o modulo financeiro.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center justify-center">
      <Card className="w-full space-y-4 p-8">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Bem-vindo ao Nexos ERP</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Informe o nome da empresa para concluir o onboarding e criar a filial matriz.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="tenantName" className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Nome da empresa
            </label>
            <Input
              id="tenantName"
              name="tenantName"
              value={tenantName}
              onChange={(event) => setTenantName(event.target.value)}
              placeholder="Ex.: Nexos Tech Ltda"
              maxLength={120}
              autoComplete="organization"
              required
            />
          </div>

          {errorMessage ? (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{errorMessage}</p>
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.replace('/dashboard')}>
              Voltar
            </Button>
            <Button type="submit" disabled={!trimmedTenantName || onboardingMutation.isPending}>
              {onboardingMutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Finalizando...
                </span>
              ) : (
                'Finalizar onboarding'
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
