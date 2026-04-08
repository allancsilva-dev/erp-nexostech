import type { EntryFilters } from '@/features/entries/types/entry.types';
import { safeJsonStringify } from '@/lib/utils';

export const queryKeys = {
  dashboard: {
    all: (branchId: string) => ['dashboard', branchId] as const,
    summary: (branchId: string) => ['dashboard', branchId, 'summary'] as const,
    overdue: (branchId: string) => ['dashboard', branchId, 'overdue'] as const,
    cashflow: (branchId: string, period: string) => ['dashboard', branchId, 'cashflow', period] as const,
  },
  entries: {
    all: (branchId: string) => ['entries', branchId] as const,
    list: (branchId: string, filters: EntryFilters) =>
      ['entries', branchId, 'list', safeJsonStringify(filters as unknown as Record<string, unknown>)] as const,
    detail: (branchId: string, id: string) => ['entries', branchId, 'detail', id] as const,
    payments: (branchId: string, id: string) => ['entries', branchId, 'payments', id] as const,
  },
  categories: {
    all: (branchId: string) => ['categories', branchId] as const,
    tree: (branchId: string, type?: string) => ['categories', branchId, 'tree', type ?? 'all'] as const,
  },
  contacts: {
    all: ['contacts'] as const,
    list: (filters?: Record<string, unknown>) => ['contacts', 'list', safeJsonStringify(filters ?? {})] as const,
    detail: (id: string) => ['contacts', 'detail', id] as const,
  },
  approvals: {
  pending: (branchId: string) => ['approvals', branchId, 'pending'] as const,
  history: (branchId: string) => ['approvals', branchId, 'history'] as const,
  count:   (branchId: string) => ['approvals', branchId, 'count']   as const,
  },
  notifications: {
    all: (userId: string) => ['notifications', userId] as const,
    list: (userId: string, filters: { page: number; limit: number; unreadOnly: boolean }) =>
      ['notifications', userId, 'list', safeJsonStringify(filters as unknown as Record<string, unknown>)] as const,
    count: (userId: string) => ['notifications', userId, 'count'] as const,
  },
  boletos: {
    list: (branchId: string) => ['boletos', branchId, 'list'] as const,
  },
  transfers: {
    all: (branchId: string) => ['transfers', branchId] as const,
    list: (branchId: string, filters?: Record<string, unknown>) =>
      ['transfers', branchId, 'list', safeJsonStringify(filters ?? {})] as const,
  },
  reports: {
    dre: (branchId: string, params?: Record<string, unknown>) =>
      ['reports', branchId, 'dre', safeJsonStringify(params ?? {})] as const,
    balanceSheet: (branchId: string, params?: Record<string, unknown>) =>
      ['reports', branchId, 'balance-sheet', safeJsonStringify(params ?? {})] as const,
    aging: (branchId: string, params?: Record<string, unknown>) =>
      ['reports', branchId, 'aging', safeJsonStringify(params ?? {})] as const,
  },
  reconciliation: {
    all: (branchId: string) => ['reconciliation', branchId] as const,
  },
  auditLogs: {
    list: (branchId: string) => ['audit-logs', branchId, 'list'] as const,
  },
  settings: {
    all: (branchId: string) => ['settings', branchId] as const,
    bankAccounts: (branchId: string) => ['bank-accounts', branchId] as const,
    lockPeriods: (branchId: string) => ['lock-periods', branchId] as const,
    collectionRules: (branchId: string) => ['collection-rules', branchId] as const,
  },
  roles: ['roles'] as const,
  branches: {
    my: ['branches', 'my'] as const,
  },
  permissions: {
    me: ['permissions', 'me'] as const,
  },
};
