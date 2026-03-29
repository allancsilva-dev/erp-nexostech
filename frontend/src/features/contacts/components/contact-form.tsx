'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DocumentInput } from '@/components/shared/document-input';
import { PhoneInput } from '@/components/shared/phone-input';
import { api } from '@/lib/api-client';

const contactSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.enum(['FORNECEDOR', 'CLIENTE', 'AMBOS']),
  document: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export type ContactFormValues = z.infer<typeof contactSchema>;

export function ContactForm({ initialValues, onSaved }: { initialValues?: Partial<ContactFormValues> | null; onSaved?: () => void }) {
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      type: 'FORNECEDOR',
      document: '',
      phone: '',
      email: '',
      active: true,
      ...initialValues,
    },
  });

  useEffect(() => {
    if (initialValues) {
      Object.entries(initialValues).forEach(([k, v]) => {
        setValue(k as keyof ContactFormValues, v as unknown as ContactFormValues[keyof ContactFormValues]);
      });
    }
  }, [initialValues, setValue]);

  async function onSubmit(values: ContactFormValues) {
    try {
      if (values.id) {
        await api.put(`/contacts/${values.id}`, values);
        toast.success('Contato atualizado com sucesso');
      } else {
        await api.post('/contacts', values);
        toast.success('Contato criado com sucesso');
      }
      onSaved?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao salvar contato.';
      toast.error(message);
    }
  }

  return (
    <form className="grid gap-3" onSubmit={handleSubmit(onSubmit)}>
      <label className="text-sm font-medium">
        Nome
        <Input {...register('name')} />
        {errors.name ? <p className="text-xs text-red-600">{String(errors.name.message)}</p> : null}
      </label>

      <label className="text-sm font-medium">
        Tipo
        <Select {...register('type')}>
          <option value="FORNECEDOR">Fornecedor</option>
          <option value="CLIENTE">Cliente</option>
          <option value="AMBOS">Fornecedor e Cliente</option>
        </Select>
      </label>

      <label className="text-sm font-medium">
        CPF / CNPJ
        <DocumentInput value={watch('document') ?? ''} onChange={(v) => setValue('document', v)} />
      </label>

      <label className="text-sm font-medium">
        Telefone
        <PhoneInput value={watch('phone') ?? ''} onChange={(v) => setValue('phone', v)} />
      </label>

      <label className="text-sm font-medium">
        E-mail
        <Input {...register('email')} />
      </label>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Processando...' : 'Salvar'}</Button>
      </div>
    </form>
  );
}

export default ContactForm;
