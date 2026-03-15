'use client';

import type { UseFormReturn } from 'react-hook-form';
import { CurrencyInput } from '@/components/shared/currency-input';
import { Select } from '@/components/ui/select';
import { useCategories } from '@/features/categories/hooks/use-categories';
import type { CreateEntryInput } from '@/features/entries/types/entry.schemas';

export function FinancialInfo({ form }: { form: UseFormReturn<CreateEntryInput> }) {
  const entryType = form.watch('type');
  const categoryType = entryType === 'PAYABLE' ? 'DESPESA' : 'RECEITA';
  const categories = useCategories(categoryType);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm">Valor</label>
        <CurrencyInput value={form.watch('amount') || ''} onChange={(value) => form.setValue('amount', value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm">Categoria</label>
        <Select
          value={form.watch('categoryId') || ''}
          onChange={(event) => form.setValue('categoryId', event.target.value, { shouldValidate: true })}
          disabled={categories.isLoading}
        >
          <option value="">{categories.isLoading ? 'Carregando categorias...' : 'Selecione uma categoria'}</option>
          {(categories.data?.data ?? []).map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
