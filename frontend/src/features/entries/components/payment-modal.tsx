"use client";

import { useState } from 'react';
import { CurrencyInput } from '@/components/shared/currency-input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { usePayEntry } from '@/features/entries/hooks/use-entries';
import { useBankAccounts } from '@/features/settings/hooks/use-bank-accounts';
import type { PaymentMethod } from '@/features/entries/types/entry.types';

interface BankAccountOption {
  id: string;
  name?: string;
  bankName?: string;
}

function toBankAccountOptions(value: unknown): BankAccountOption[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is BankAccountOption => {
    if (typeof item !== 'object' || !item) return false;
    return typeof (item as { id: unknown }).id === 'string';
  });
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function PaymentModal({ entryId }: { entryId: string }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('0.00');
  const [paymentDate, setPaymentDate] = useState(todayDate());
  const [notes, setNotes] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const payEntry = usePayEntry();
  const bankAccounts = useBankAccounts();
  const accountOptions = toBankAccountOptions(bankAccounts.data?.data);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    payEntry.mutate(
      {
        entryId,
        amount,
        paymentDate,
        bankAccountId: bankAccountId || undefined,
        paymentMethod: paymentMethod || undefined,
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
              <label className="mb-1 block text-sm">Conta bancária</label>
              <Select value={bankAccountId} onChange={(event) => setBankAccountId(event.target.value)}>
                <option value="">Selecione a conta</option>
                {accountOptions.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name ?? account.id} {account.bankName ? `— ${account.bankName}` : ''}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm">Forma de pagamento</label>
              <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod | '')}>
                <option value="">Selecione (opcional)</option>
                <option value="PIX">PIX</option>
                <option value="BOLETO">Boleto</option>
                <option value="TRANSFER">Transferência</option>
                <option value="CARD">Cartão</option>
                <option value="CASH">Dinheiro</option>
                <option value="OTHER">Outro</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm">Observações</label>
              <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Opcional" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Fechar
              </Button>
              <Button type="submit" disabled={payEntry.isPending || !bankAccountId || amount === '0.00'}>
                {payEntry.isPending ? 'Salvando...' : 'Confirmar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
