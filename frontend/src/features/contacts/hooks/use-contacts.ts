'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Contact } from '@/features/contacts/types/contact.types';

export function useContacts(type?: 'FORNECEDOR' | 'CLIENTE' | 'AMBOS', search?: string) {
  return useQuery({
    queryKey: ['contacts', type, search],
    queryFn: () => api.get<Contact[]>('/contacts', { type, search }),
  });
}
