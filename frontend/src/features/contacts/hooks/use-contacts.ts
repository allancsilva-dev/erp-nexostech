"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { Contact } from '@/features/contacts/types/contact.types';
import { queryKeys } from '@/lib/query-keys';

export function useContacts(type?: 'FORNECEDOR' | 'CLIENTE' | 'AMBOS', search?: string) {
  return useQuery({
    queryKey: queryKeys.contacts.list({ type, search }),
    queryFn: () => api.get<Contact[]>('/contacts', { type, search }),
  });
}

export function useContact(id: string | null) {
  return useQuery({
    queryKey: id ? queryKeys.contacts.detail(id) : ['contacts', 'detail', 'null'] as const,
    queryFn: () => api.get<Contact>(`/contacts/${id}`),
    enabled: Boolean(id),
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.list({}) });
      toast.success('Contato excluído');
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Falha ao excluir contato');
    },
  });
}
