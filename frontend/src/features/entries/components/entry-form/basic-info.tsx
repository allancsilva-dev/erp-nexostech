'use client';

import type { UseFormReturn } from 'react-hook-form';
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
        <label className="mb-1 block text-sm">Descricao</label>
        <Input {...form.register('description')} />
      </div>
      <div>
        <label className="mb-1 block text-sm">Fornecedor/Cliente</label>
        <Select
          value={form.watch('contactId') || ''}
          onChange={(event) => form.setValue('contactId', event.target.value, { shouldValidate: true })}
          disabled={contacts.isLoading}
        >
          <option value="">{contacts.isLoading ? 'Carregando contatos...' : 'Nao vincular contato'}</option>
          {(contacts.data?.data ?? []).map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-sm">Observacoes</label>
        <Input {...form.register('notes')} />
      </div>
    </div>
  );
}
