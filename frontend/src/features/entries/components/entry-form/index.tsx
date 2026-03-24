'use client';

import { Button } from '@/components/ui/button';
import { BasicInfo } from '@/features/entries/components/entry-form/basic-info';
import { FinancialInfo } from '@/features/entries/components/entry-form/financial-info';
import { DatesInfo } from '@/features/entries/components/entry-form/dates-info';
import { InstallmentSection } from '@/features/entries/components/entry-form/installment-section';
import { AttachmentsSection } from '@/features/entries/components/entry-form/attachments-section';
import { useEntryForm } from '@/features/entries/hooks/use-entry-form';

export function EntryForm({ type }: { type: 'PAYABLE' | 'RECEIVABLE' }) {
  const { form, onSubmit, isPending, installmentPreview } = useEntryForm(type);

  return (
    <form className="space-y-6 surface-card p-6" onSubmit={onSubmit}>
      <BasicInfo form={form} />
      <FinancialInfo form={form} />
      <DatesInfo form={form} />
      <InstallmentSection form={form} preview={installmentPreview} />
      <AttachmentsSection />

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Salvando...' : 'Salvar e enviar'}
        </Button>
      </div>
    </form>
  );
}
