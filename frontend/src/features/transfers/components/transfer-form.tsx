'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/shared/currency-input';
import { DatePicker } from '@/components/shared/date-picker';

export function TransferForm() {
  const [amount, setAmount] = useState('0.00');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  return (
    <form className="grid gap-4 rounded-xl border bg-white p-4 dark:bg-slate-800 md:grid-cols-2">
      <select className="h-10 rounded-md border border-slate-300 px-3 text-sm">
        <option>Conta origem</option>
      </select>
      <select className="h-10 rounded-md border border-slate-300 px-3 text-sm">
        <option>Conta destino</option>
      </select>
      <CurrencyInput value={amount} onChange={setAmount} />
      <DatePicker value={date} onChange={setDate} />
      <Button type="button" className="md:col-span-2">Transferir</Button>
    </form>
  );
}
