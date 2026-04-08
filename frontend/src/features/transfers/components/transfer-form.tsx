'use client';

import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/shared/currency-input';
import { DatePicker } from '@/components/shared/date-picker';
import { Select } from '@/components/ui/select';
import { ErrorBanner } from '@/components/shared/error-banner';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { useLockPeriodCheck } from '@/components/shared/lock-period-guard';
import { useBankAccounts } from '@/features/settings/hooks/use-bank-accounts';
import { useCreateTransfer } from '@/features/transfers/hooks/use-transfers';
import { getErrorMessage } from '@/components/ui/error-toast';
import { toast } from 'sonner';

interface BankAccountOption {
  id: string;
  name?: string;
}

function toBankAccountOptions(value: unknown): BankAccountOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is BankAccountOption => {
    if (typeof item !== 'object' || !item || !('id' in item)) {
      return false;
    }
    return typeof (item as { id: unknown }).id === 'string';
  });
}

export function TransferForm() {
  const [amount, setAmount] = useState('0.00');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [description, setDescription] = useState('');

  const bankAccounts = useBankAccounts();
  const createTransfer = useCreateTransfer();
  const lockCheck = useLockPeriodCheck(date);

  const accountOptions = toBankAccountOptions(bankAccounts.data?.data);

  if (bankAccounts.isLoading) {
    return <TableSkeleton rows={4} cols={2} />;
  }

  if (bankAccounts.isError) {
    return <ErrorBanner message={getErrorMessage(bankAccounts.error, 'Erro inesperado. Tente novamente.')} onRetry={() => bankAccounts.refetch()} />;
  }

  const isDisabled =
    createTransfer.isPending ||
    lockCheck.isLocked ||
    !fromAccountId ||
    !toAccountId ||
    fromAccountId === toAccountId ||
    amount === '0.00' ||
    description.trim().length === 0;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (lockCheck.isLocked) {
      toast.error(lockCheck.message ?? 'Período contábil fechado');
      return;
    }

    createTransfer.mutate(
      {
        fromAccountId,
        toAccountId,
        amount: String(amount),
        transferDate: date,
        description,
        idempotencyKey: uuid(),
      },
      {
        onSuccess: () => {
          setAmount('0.00');
          setDescription('');
        },
      },
    );
  }

  return (
    <form className="grid gap-4 surface-card p-4 md:grid-cols-2" onSubmit={handleSubmit}>
      <Select value={fromAccountId} onChange={(event) => setFromAccountId(event.target.value)}>
        <option value="">Conta origem</option>
        {accountOptions.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name ?? account.id}
          </option>
        ))}
      </Select>
      <Select value={toAccountId} onChange={(event) => setToAccountId(event.target.value)}>
        <option value="">Conta destino</option>
        {accountOptions.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name ?? account.id}
          </option>
        ))}
      </Select>
      <CurrencyInput value={amount} onChange={setAmount} />
      <DatePicker value={date} onChange={setDate} />
      <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descrição da transferência" className="md:col-span-2" />
      {lockCheck.isLocked && lockCheck.message ? (
        <p className="md:col-span-2 text-sm text-amber-700 dark:text-amber-400">{lockCheck.message}</p>
      ) : null}
      <Button type="submit" className="md:col-span-2" disabled={isDisabled}>
        {createTransfer.isPending ? 'Transferindo...' : 'Transferir'}
      </Button>
    </form>
  );
}
