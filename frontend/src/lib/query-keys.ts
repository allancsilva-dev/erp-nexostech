import type { EntryFilters } from '@/features/entries/types/entry.types';
import { safeJsonStringify } from '@/lib/utils';

export const queryKeys = {
  dashboard: {
    all: (branchId: string) => ['dashboard', branchId] as const,
    summary: (branchId: string) => ['dashboard', branchId, 'summary'] as const,
    overdue: (branchId: string) => ['dashboard', branchId, 'overdue'] as const,
  },
  entries: {
    all: (branchId: string) => ['entries', branchId] as const,
    list: (branchId: string, filters: EntryFilters) =>
      ['entries', branchId, 'list', safeJsonStringify(filters as unknown as Record<string, unknown>)] as const,
    detail: (branchId: string, id: string) => ['entries', branchId, 'detail', id] as const,
    payments: (branchId: string, id: string) => ['entries', branchId, 'payments', id] as const,
  },
  branches: {
    my: ['branches', 'my'] as const,
  },
  permissions: {
    me: ['permissions', 'me'] as const,
  },
};
