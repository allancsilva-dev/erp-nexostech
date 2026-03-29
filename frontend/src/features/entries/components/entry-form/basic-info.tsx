'use client';

import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useContacts } from '@/features/contacts/hooks/use-contacts';
import type { CreateEntryInput } from '@/features/entries/types/entry.schemas';

export function BasicInfo({ form }: { form: UseFormReturn<CreateEntryInput> }) {
  const entryType = form.watch('type');
  const contactType = entryType === 'PAYABLE' ? 'FORNECEDOR' : 'CLIENTE';
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
                <p className="text-xs text-red-600 mt-1">{String(fieldState.error.message)}</p>
              )}
            </>
          )}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm">Fornecedor/Cliente</label>
        <Select
          value={form.watch('contactId') || ''}
          onChange={(event) => form.setValue('contactId', event.target.value, { shouldValidate: true })}
          disabled={contacts.isLoading}
        >
          <option value="">{contacts.isLoading ? 'Carregando contatos...' : 'Não vincular contato'}</option>
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
