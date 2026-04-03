'use client';

import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useContacts } from '@/features/contacts/hooks/use-contacts';
import type { CreateEntryInput } from '@/features/entries/types/entry.schemas';

function getFieldErrorText(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return '';
  }

  return String((error as { ['message']?: unknown })['message'] ?? '');
}

export function BasicInfo({ form }: { form: UseFormReturn<CreateEntryInput> }) {
  const entryType = form.watch('type');
  const contactType = entryType === 'PAYABLE' ? 'FORNECEDOR' : 'CLIENTE';
  const contactLabel = entryType === 'PAYABLE' ? 'Fornecedor' : 'Cliente';
  const contacts = useContacts(contactType);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm">Descrição</label>
        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <>
              <Input
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                className={fieldState.error ? 'border-red-500' : ''}
              />
              {fieldState.error && (
                <p className="text-xs text-red-600 mt-1">{getFieldErrorText(fieldState.error)}</p>
              )}
            </>
          )}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm">{contactLabel}</label>
        <Select
          value={form.watch('contactId') || ''}
          onChange={(event) => form.setValue('contactId', event.target.value, { shouldValidate: true })}
          disabled={contacts.isLoading}
        >
          <option value="">{contacts.isLoading ? 'Carregando contatos...' : entryType === 'PAYABLE' ? 'Não vincular fornecedor' : 'Não vincular cliente'}</option>
          {(contacts.data?.data ?? []).map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-sm">Observações</label>
        <Controller
          name="notes"
          control={form.control}
          render={({ field }) => (
            <Input value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} />
          )}
        />
      </div>
    </div>
  );
}
