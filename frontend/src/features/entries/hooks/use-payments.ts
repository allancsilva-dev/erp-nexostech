'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function usePayments() {
  const payEntry = useMutation({
    mutationFn: ({ entryId, ...payload }: { entryId: string; [key: string]: unknown }) =>
      api.post(`/entries/${entryId}/pay`, payload),
  });

  const refundPayment = useMutation({
    mutationFn: ({ entryId, reason }: { entryId: string; reason: string }) =>
      api.post(`/entries/${entryId}/refund`, { reason }),
  });

  return { payEntry, refundPayment };
}
