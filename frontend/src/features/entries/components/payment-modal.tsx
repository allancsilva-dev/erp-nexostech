'use client';

import { useState } from 'react';
import { CurrencyInput } from '@/components/shared/currency-input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { usePayEntry } from '@/features/entries/hooks/use-entries';

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function PaymentModal({ entryId }: { entryId: string }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('0.00');
  const [paymentDate, setPaymentDate] = useState(todayDate());
  const [notes, setNotes] = useState('');
  const payEntry = usePayEntry();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    payEntry.mutate(
      {
        entryId,
        amount,
        paymentDate,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setNotes('');
        },
      },
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Registrar pagamento</Button>
      <Dialog open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1 block text-sm">Valor pago</label>
              <CurrencyInput value={amount} onChange={setAmount} />
            </div>
            <div>
              <label className="mb-1 block text-sm">Data do pagamento</label>
              <Input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm">Observacoes</label>
              <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Opcional" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Fechar
              </Button>
              <Button type="submit" disabled={payEntry.isPending}>
                {payEntry.isPending ? 'Salvando...' : 'Confirmar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
