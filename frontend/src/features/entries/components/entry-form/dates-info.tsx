'use client';

import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { DatePicker } from '@/components/shared/date-picker';
import type { CreateEntryInput } from '@/features/entries/types/entry.schemas';

function getFieldErrorText(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return '';
  }

  return String((error as { ['message']?: unknown })['message'] ?? '');
}

export function DatesInfo({ form }: { form: UseFormReturn<CreateEntryInput> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm">Data emissão</label>
        <Controller
          name="issueDate"
          control={form.control}
          render={({ field, fieldState }) => (
            <>
              <DatePicker value={field.value} onChange={(value) => field.onChange(value)} className={fieldState.error ? 'border-red-500' : ''} />
              {fieldState.error && (
                <p className="text-xs text-red-600 mt-1">{getFieldErrorText(fieldState.error)}</p>
              )}
            </>
          )}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm">Data vencimento</label>
        <Controller
          name="dueDate"
          control={form.control}
          render={({ field, fieldState }) => (
            <>
              <DatePicker value={field.value} onChange={(value) => field.onChange(value)} className={fieldState.error ? 'border-red-500' : ''} />
              {fieldState.error && (
                <p className="text-xs text-red-600 mt-1">{getFieldErrorText(fieldState.error)}</p>
              )}
            </>
          )}
        />
      </div>
    </div>
  );
}
