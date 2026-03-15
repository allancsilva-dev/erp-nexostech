'use client';

import { useMemo } from 'react';
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

  const onSubmit = form.handleSubmit((values) => {
    createEntry.mutate({ ...values, notes: values.notes || undefined });
  });

  return {
    form,
    onSubmit,
    isPending: createEntry.isPending,
    installmentPreview,
    isInstallment,
    installmentCount,
  };
}
