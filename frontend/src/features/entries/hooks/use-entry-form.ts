'use client';

import { useMemo } from 'react';
import { toast } from 'sonner';
import Decimal from 'decimal.js';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateEntry } from '@/features/entries/hooks/use-entries';
import { createEntrySchema, type CreateEntryInput } from '@/features/entries/types/entry.schemas';

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useEntryForm(type: 'PAYABLE' | 'RECEIVABLE') {
  const createEntry = useCreateEntry();

  const form = useForm<CreateEntryInput>({
    resolver: zodResolver(createEntrySchema),
    defaultValues: {
      type,
      description: '',
      amount: '0.00',
      issueDate: todayDate(),
      dueDate: todayDate(),
      categoryId: '',
      installment: false,
      notes: '',
    },
  });

  const isInstallment = form.watch('installment');
  const installmentCount = Number(form.watch('installmentCount') ?? 0);
  const amount = form.watch('amount');

  const installmentPreview = useMemo(() => {
    if (!isInstallment || installmentCount < 2 || !amount) {
      return [];
    }

    const value = new Decimal(amount).div(installmentCount).toFixed(2);
    return Array.from({ length: installmentCount }).map((_, index) => ({
      installment: `${index + 1}/${installmentCount}`,
      value,
    }));
  }, [amount, installmentCount, isInstallment]);

  function submitAsDraft() {
    return form.handleSubmit(
      (values) => {
        createEntry.mutate(
          { ...values, submit: false, notes: values.notes || undefined },
          {
            onSuccess: () => {
              toast.success('Rascunho salvo com sucesso');
            },
          },
        );
      },
      (errors) => console.error('[EntryForm] Erros:', errors),
    );
  }

  function submitAndSend() {
    return form.handleSubmit(
      (values) => {
        createEntry.mutate(
          { ...values, submit: true, notes: values.notes || undefined },
          {
            onSuccess: () => {
              toast.success('Lançamento enviado com sucesso');
              if (type === 'RECEIVABLE') {
                toast.info('O envio automático de cobrança será habilitado em breve.');
              }
            },
          },
        );
      },
      (errors) => console.error('[EntryForm] Erros:', errors),
    );
  }

  const onSubmitDraft = submitAsDraft();
  const onSubmitPending = submitAndSend();
  // default for compatibility
  const onSubmit = onSubmitPending;

  return {
    form,
    onSubmit,
    onSubmitDraft,
    onSubmitPending,
    isPending: createEntry.isPending,
    installmentPreview,
    isInstallment,
    installmentCount,
  };
}
