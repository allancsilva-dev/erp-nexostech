'use client';

import type { UseFormReturn } from 'react-hook-form';
import { CurrencyInput } from '@/components/shared/currency-input';
import { Input } from '@/components/ui/input';
import type { CreateEntryInput } from '@/features/entries/types/entry.schemas';

export function FinancialInfo({ form }: { form: UseFormReturn<CreateEntryInput> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm">Valor</label>
        <CurrencyInput value={form.watch('amount') || ''} onChange={(value) => form.setValue('amount', value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm">Categoria (ID)</label>
        <Input {...form.register('categoryId')} placeholder="UUID da categoria" />
      </div>
    </div>
  );
}
