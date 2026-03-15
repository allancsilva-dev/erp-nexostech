'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Contact } from '@/features/contacts/types/contact.types';
import { queryKeys } from '@/lib/query-keys';

export function useContacts(type?: 'FORNECEDOR' | 'CLIENTE' | 'AMBOS', search?: string) {
  return useQuery({
    queryKey: queryKeys.contacts.list({ type, search }),
    queryFn: () => api.get<Contact[]>('/contacts', { type, search }),
  });
}
