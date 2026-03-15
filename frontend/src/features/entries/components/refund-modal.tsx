'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useRefundPayment } from '@/features/entries/hooks/use-entries';

export function RefundModal({ entryId }: { entryId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const refundPayment = useRefundPayment();

  function handleRefund(): void {
    refundPayment.mutate(
      { entryId, reason },
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
      <Button variant="outline" onClick={() => setOpen(true)}>Estornar</Button>
      <Dialog open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estornar pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm">Motivo do estorno</label>
              <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Obrigatorio" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Fechar
              </Button>
              <Button
                type="button"
                disabled={refundPayment.isPending || reason.trim().length < 3}
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
