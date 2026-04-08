'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useEntryPayments, useRefundPayment } from '@/features/entries/hooks/use-entries';

export function RefundModal({ entryId }: { entryId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const payments = useEntryPayments(entryId);
  const refundPayment = useRefundPayment();
  const latestPayment = payments.data?.data?.[0] ?? null;

  function handleRefund(): void {
    if (!latestPayment) return;

    refundPayment.mutate(
      { entryId, paymentId: latestPayment.id, reason },
      {
        onSuccess: () => {
          setOpen(false);
          setReason('');
        },
      },
    );
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} disabled={payments.isLoading || !latestPayment}>
        Estornar
      </Button>
      <Dialog open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estornar pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!latestPayment ? (
              <p className="text-sm text-muted-foreground">Nenhum pagamento disponível para estorno.</p>
            ) : null}
            <div>
              <label className="mb-1 block text-sm">Motivo do estorno</label>
              <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Obrigatorio" />
              <p className="mt-1 text-sm text-muted-foreground">Mínimo 10 caracteres</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Fechar
              </Button>
              <Button
                type="button"
                disabled={refundPayment.isPending || reason.trim().length < 10 || !latestPayment}
                onClick={handleRefund}
              >
                {refundPayment.isPending ? 'Processando...' : 'Confirmar estorno'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
