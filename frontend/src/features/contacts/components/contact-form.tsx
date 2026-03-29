'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DocumentInput } from '@/components/shared/document-input';
import { PhoneInput } from '@/components/shared/phone-input';
import { api } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

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

export function ContactForm({
  initialValues,
  onSaved,
}: {
  initialValues?: Partial<ContactFormValues> | null;
  onSaved?: () => void;
}) {
  const { control, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<ContactFormValues>({
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

  const queryClient = useQueryClient();

  useEffect(() => {
    if (initialValues) {
      Object.entries(initialValues).forEach(([k, v]) => {
        setValue(k as keyof ContactFormValues, v as unknown as ContactFormValues[keyof ContactFormValues]);
      });
    }
  }, [initialValues, setValue]);

  async function onSubmit(values: ContactFormValues) {
    function formatDocumentForApi(digits?: string | null) {
      if (!digits) return null;
      const d = String(digits).replace(/\D/g, '');
      if (d.length <= 11) {
        return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      }
      return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }

    function formatPhoneForApi(digits?: string | null) {
      if (!digits) return null;
      const d = String(digits).replace(/\D/g, '');
      if (d.length === 11) {
        return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      }
      if (d.length === 10) {
        return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
      }
      return String(digits);
    }

    try {
      const { id } = values as ContactFormValues & Record<string, unknown>;

      const cloned = { ...(values as Record<string, unknown>) };
      delete cloned.active;
      delete cloned.id;
      const payload = cloned;

      const apiPayload = {
        ...payload,
        document: payload.document ? formatDocumentForApi(String(payload.document)) : null,
        phone: payload.phone ? formatPhoneForApi(String(payload.phone)) : null,
        email: payload.email || null,
      } as Record<string, unknown>;

      if (id) {
        await api.put(`/contacts/${id}`, apiPayload);
        toast.success('Contato atualizado com sucesso');
      } else {
        await api.post('/contacts', apiPayload);
        toast.success('Contato criado com sucesso');
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      onSaved?.();
    } catch (error: unknown) {
      let message = 'Falha ao salvar contato.';
      if (error && typeof error === 'object' && 'message' in error) {
        const raw = String((error as { message: string }).message);
        if (raw.includes('should not exist')) {
          message = 'Erro de validação. Tente novamente.';
        } else if (raw.includes('document must match')) {
          message = 'CPF ou CNPJ em formato inválido.';
        } else if (raw.includes('digito verificador')) {
          message = 'CPF ou CNPJ inválido. Verifique os dígitos.';
        } else if (raw.includes('Telefone')) {
          message = 'Telefone em formato inválido.';
        } else {
          message = raw;
        }
      }
      toast.error(message);
    }
  }

  return (
    <form className="grid gap-3" onSubmit={handleSubmit(onSubmit)}>
      <label className="text-sm font-medium">
        Nome
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <Input
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        {errors.name && (
          <p className="text-xs text-red-600">{String(errors.name.message)}</p>
        )}
      </label>

      <label className="text-sm font-medium">
        Tipo
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={field.value ?? 'FORNECEDOR'}
              onChange={field.onChange}
              onBlur={field.onBlur}
            >
              <option value="FORNECEDOR">Fornecedor</option>
              <option value="CLIENTE">Cliente</option>
              <option value="AMBOS">Fornecedor e Cliente</option>
            </select>
          )}
        />
        {errors.type && (
          <p className="text-xs text-red-600">{String(errors.type.message)}</p>
        )}
      </label>

      <label className="text-sm font-medium">
        CPF / CNPJ
        <DocumentInput
          value={watch('document') ?? ''}
          onChange={(v) => setValue('document', v)}
        />
      </label>

      <label className="text-sm font-medium">
        Telefone
        <PhoneInput
          value={watch('phone') ?? ''}
          onChange={(v) => setValue('phone', v)}
        />
      </label>

      <label className="text-sm font-medium">
        E-mail
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <Input
              type="email"
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
      </label>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : 'Salvar'}
      </Button>
    </form>
  );
}

export default ContactForm;
