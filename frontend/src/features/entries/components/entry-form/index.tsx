'use client';

import { useMemo, useState } from 'react';
import Decimal from 'decimal.js';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/shared/currency-input';
import { DatePicker } from '@/components/shared/date-picker';
import { FileUpload } from '@/components/shared/file-upload';
import { createEntrySchema, type CreateEntryInput } from '@/features/entries/types/entry.schemas';
import { useCreateEntry } from '@/features/entries/hooks/use-entries';

function InstallmentPreview({ amount, count }: { amount: string; count: number }) {
  const items = useMemo(() => {
    if (!amount || count < 2) {
      return [];
    }
    const value = new Decimal(amount).div(count).toFixed(2);
    return Array.from({ length: count }).map((_, index) => ({
      installment: `${index + 1}/${count}`,
      value,
    }));
  }, [amount, count]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border p-3 text-sm">
      <p className="mb-2 font-medium">Preview de parcelas</p>
      <div className="space-y-1">
        {items.slice(0, 8).map((item) => (
          <p key={item.installment}>{item.installment} - R$ {item.value.replace('.', ',')}</p>
        ))}
      </div>
    </div>
  );
}

export function EntryForm({ type }: { type: 'PAYABLE' | 'RECEIVABLE' }) {
  const [attachment, setAttachment] = useState<File | null>(null);
  const createEntry = useCreateEntry();

  const form = useForm<CreateEntryInput>({
    resolver: zodResolver(createEntrySchema),
    defaultValues: {
      type,
      description: '',
      amount: '0.00',
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      categoryId: '',
      installment: false,
      notes: '',
    },
  });

  const installment = form.watch('installment');
  const installmentCount = Number(form.watch('installmentCount') ?? 0);
  const amount = form.watch('amount');

  return (
    <form
      className="space-y-6 rounded-xl border bg-white p-6 dark:bg-slate-800"
      onSubmit={form.handleSubmit((values) => {
        void createEntry.mutate({ ...values, notes: values.notes || undefined });
      })}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm">Descricao</label>
          <Input {...form.register('description')} />
        </div>
        <div>
          <label className="mb-1 block text-sm">Categoria (ID)</label>
          <Input {...form.register('categoryId')} placeholder="UUID da categoria" />
        </div>
        <div>
          <label className="mb-1 block text-sm">Valor</label>
          <CurrencyInput value={form.watch('amount') || ''} onChange={(value) => form.setValue('amount', value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm">Data emissao</label>
          <DatePicker value={form.watch('issueDate')} onChange={(value) => form.setValue('issueDate', value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm">Data vencimento</label>
          <DatePicker value={form.watch('dueDate')} onChange={(value) => form.setValue('dueDate', value)} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={installment} onChange={(event) => form.setValue('installment', event.target.checked)} />
        Parcelar lancamento
      </label>

      {installment ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm">Numero de parcelas</label>
            <Input
              type="number"
              min={2}
              max={120}
              value={String(installmentCount || '')}
              onChange={(event) => form.setValue('installmentCount', Number(event.target.value))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Frequencia</label>
            <select
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              value={form.watch('installmentFrequency') || 'MONTHLY'}
              onChange={(event) =>
                form.setValue('installmentFrequency', event.target.value as 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY')
              }
            >
              <option value="WEEKLY">Semanal</option>
              <option value="BIWEEKLY">Quinzenal</option>
              <option value="MONTHLY">Mensal</option>
              <option value="YEARLY">Anual</option>
            </select>
          </div>
        </div>
      ) : null}

      <InstallmentPreview amount={amount || ''} count={installmentCount} />

      <FileUpload onChange={setAttachment} />
      {attachment ? <p className="text-xs text-slate-500">Anexo selecionado: {attachment.name}</p> : null}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={createEntry.isPending}>
          {createEntry.isPending ? 'Salvando...' : 'Salvar e enviar'}
        </Button>
      </div>
    </form>
  );
}
