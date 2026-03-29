'use client';

import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { CurrencyInput } from '@/components/shared/currency-input';
import { Select } from '@/components/ui/select';
import { useCategories } from '@/features/categories/hooks/use-categories';
import type { CreateEntryInput } from '@/features/entries/types/entry.schemas';

export function FinancialInfo({ form }: { form: UseFormReturn<CreateEntryInput> }) {
  const entryType = form.watch('type');
  const categoryType = entryType === 'PAYABLE' ? 'PAYABLE' : 'RECEIVABLE';
  const categories = useCategories(categoryType);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm">Valor</label>
        <Controller
          name="amount"
          control={form.control}
          render={({ field, fieldState }) => (
            <>
              <CurrencyInput
                value={field.value || ''}
                onChange={(value) => field.onChange(value)}
                className={fieldState.error ? 'border-red-500' : ''}
              />
              {fieldState.error && (
                <p className="text-xs text-red-600 mt-1">{String(fieldState.error.message)}</p>
              )}
            </>
          )}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm">Categoria</label>
        <Controller
          name="categoryId"
          control={form.control}
          render={({ field, fieldState }) => (
            <>
              <Select
                value={field.value || ''}
                onChange={(event) => field.onChange(event.target.value)}
                disabled={categories.isLoading}
                className={fieldState.error ? 'border-red-500' : ''}
              >
                <option value="">{categories.isLoading ? 'Carregando categorias...' : 'Selecione uma categoria'}</option>
                {(categories.data?.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              {fieldState.error && (
                <p className="text-xs text-red-600 mt-1">{String(fieldState.error.message)}</p>
              )}
            </>
          )}
        />
      </div>
    </div>
  );
}
