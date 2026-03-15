'use client';

import type { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import type { CreateEntryInput } from '@/features/entries/types/entry.schemas';

interface PreviewItem {
  installment: string;
  value: string;
}

export function InstallmentSection({
  form,
  preview,
}: {
  form: UseFormReturn<CreateEntryInput>;
  preview: PreviewItem[];
}) {
  const installment = form.watch('installment');

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={installment}
          onChange={(event) => form.setValue('installment', event.target.checked)}
        />
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
              value={String(form.watch('installmentCount') ?? '')}
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

      {preview.length > 0 ? (
        <div className="rounded-md border p-3 text-sm">
          <p className="mb-2 font-medium">Preview de parcelas</p>
          <div className="space-y-1">
            {preview.slice(0, 8).map((item) => (
              <p key={item.installment}>{item.installment} - R$ {item.value.replace('.', ',')}</p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
