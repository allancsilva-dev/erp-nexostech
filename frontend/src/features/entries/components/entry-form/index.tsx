'use client';

import { Button } from '@/components/ui/button';
import { BasicInfo } from '@/features/entries/components/entry-form/basic-info';
import { FinancialInfo } from '@/features/entries/components/entry-form/financial-info';
import { DatesInfo } from '@/features/entries/components/entry-form/dates-info';
import { InstallmentSection } from '@/features/entries/components/entry-form/installment-section';
import { AttachmentsSection } from '@/features/entries/components/entry-form/attachments-section';
import { useEntryForm } from '@/features/entries/hooks/use-entry-form';

export function EntryForm({ type }: { type: 'PAYABLE' | 'RECEIVABLE' }) {
  const { form, onSubmitDraft, onSubmitPending, isPending, installmentPreview } = useEntryForm(type);

  return (
    <form className="space-y-6 surface-card p-6">
      <BasicInfo form={form} />
      <FinancialInfo form={form} />
      <DatesInfo form={form} />
      <InstallmentSection form={form} preview={installmentPreview} />
      <AttachmentsSection />

      <div className="flex justify-end gap-2">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" disabled={isPending} onClick={onSubmitDraft}>
            {isPending ? 'Salvando...' : 'Salvar como rascunho'}
          </Button>
          <Button type="button" disabled={isPending} onClick={onSubmitPending}>
            {isPending ? (type === 'RECEIVABLE' ? 'Enviando...' : 'Salvando...') : type === 'RECEIVABLE' ? 'Salvar e Enviar' : 'Salvar'}
          </Button>
        </div>
      </div>
    </form>
  );
}
