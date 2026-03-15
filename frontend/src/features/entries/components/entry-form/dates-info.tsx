'use client';

import type { UseFormReturn } from 'react-hook-form';
import { DatePicker } from '@/components/shared/date-picker';
import type { CreateEntryInput } from '@/features/entries/types/entry.schemas';

export function DatesInfo({ form }: { form: UseFormReturn<CreateEntryInput> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm">Data emissao</label>
        <DatePicker value={form.watch('issueDate')} onChange={(value) => form.setValue('issueDate', value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm">Data vencimento</label>
        <DatePicker value={form.watch('dueDate')} onChange={(value) => form.setValue('dueDate', value)} />
      </div>
    </div>
  );
}
