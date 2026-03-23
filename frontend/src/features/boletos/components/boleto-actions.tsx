'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import { useBranch } from '@/hooks/use-branch';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const HAS_RESEND_ENDPOINT = false;

export function BoletoActions({ entryId }: { entryId: string }) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [isOpeningPdf, setIsOpeningPdf] = useState(false);
  const { activeBranchId } = useBranch();
  const queryClient = useQueryClient();

  async function handleCancel(): Promise<void> {
    const confirmed = window.confirm('Cancelar este boleto? Esta acao nao pode ser desfeita.');
    if (!confirmed) {
      return;
    }

    setIsCancelling(true);
    try {
      await api.post(`/boletos/${entryId}/cancel`);
      await queryClient.invalidateQueries({ queryKey: ['boletos', activeBranchId || 'default'] });
      toast.success('Boleto cancelado com sucesso.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao cancelar boleto.';
      toast.error(message);
    } finally {
      setIsCancelling(false);
    }
  }

  async function handleViewPdf(): Promise<void> {
    setIsOpeningPdf(true);
    try {
      const pdf = await api.get<{ url: string }>(`/boletos/${entryId}/pdf`);
      const fileResponse = await fetch(pdf.data.url);
      if (!fileResponse.ok) {
        throw new Error('Nao foi possivel baixar o PDF do boleto.');
      }

      const blob = await fileResponse.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao abrir PDF do boleto.';
      toast.error(message);
    } finally {
      setIsOpeningPdf(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => void handleViewPdf()} disabled={isOpeningPdf || isCancelling}>
        {isOpeningPdf ? 'Abrindo PDF...' : 'Ver PDF'}
      </Button>
      <Button type="button" variant="danger" size="sm" onClick={() => void handleCancel()} disabled={isCancelling || isOpeningPdf}>
        {isCancelling ? 'Cancelando...' : 'Cancelar'}
      </Button>
      {HAS_RESEND_ENDPOINT ? (
        <Button type="button" variant="secondary" size="sm">
          Reenviar e-mail
        </Button>
      ) : null}
    </div>
  );
}
