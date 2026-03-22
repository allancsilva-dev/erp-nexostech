'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Loader2, TriangleAlert } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function OnboardingPage() {
  const router = useRouter();

  const onboardingMutation = useMutation({
    mutationFn: async () => api.post('/tenants/onboarding'),
    onSuccess: () => {
      router.replace('/dashboard');
    },
  });

  useEffect(() => {
    onboardingMutation.mutate();
    // Dispara uma unica vez ao entrar no wizard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  if (onboardingMutation.isError) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center justify-center">
        <Card className="w-full space-y-4 p-8 text-center">
          <TriangleAlert className="mx-auto h-8 w-8 text-amber-600" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Nao foi possivel finalizar o onboarding</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            O backend ainda nao concluiu a inicializacao do tenant. Tente novamente em instantes.
          </p>
          <div className="flex justify-center gap-3">
            <Button type="button" onClick={() => onboardingMutation.mutate()}>
              Tentar novamente
            </Button>
            <Button type="button" variant="outline" onClick={() => router.replace('/dashboard')}>
              Ir para dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}
