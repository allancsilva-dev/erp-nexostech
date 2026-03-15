'use client';

import { Input } from '@/components/ui/input';
import type { UseFormReturn } from 'react-hook-form';
import type { CreateEntryInput } from '@/features/entries/types/entry.schemas';

export function BasicInfo({ form }: { form: UseFormReturn<CreateEntryInput> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm">Descricao</label>
        <Input {...form.register('description')} />
      </div>
      <div>
        <label className="mb-1 block text-sm">Observacoes</label>
        <Input {...form.register('notes')} />
      </div>
    </div>
  );
}
