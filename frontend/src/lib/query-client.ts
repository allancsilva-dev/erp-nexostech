import { keepPreviousData, QueryClient, type QueryKey } from '@tanstack/react-query';
import { logger } from '@/lib/utils/logger';

const REPORTS_STALE_TIME_MS = 5 * 60 * 1000;
const LIST_STALE_TIME_MS = 60 * 1000;
const DASHBOARD_STALE_TIME_MS = 30 * 1000;

function getStaleTimeByQueryCategory(queryKey: QueryKey): number {
  const root = queryKey[0];

  if (root === 'reports') {
    return REPORTS_STALE_TIME_MS;
  }

  if (root === 'dashboard') {
    return DASHBOARD_STALE_TIME_MS;
  }

  return LIST_STALE_TIME_MS;
}

export const queryDefaultOptions = {
  queries: {
    staleTime: ({ queryKey }: { queryKey: QueryKey }) => getStaleTimeByQueryCategory(queryKey),
    gcTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: (attemptIndex: number) => Math.min(1000 * (2 ** attemptIndex), 8000),
    refetchOnWindowFocus: false,
  },
  mutations: {
    retry: 0,
    onError: (error: Error) => {
      const apiError = error as Error & { status?: number; code?: string };

      logger.error('Mutation failed', {
        message: apiError.message,
        status: apiError.status,
        code: apiError.code,
      });
    },
  },
} as const;

export function createAppQueryClient() {
  const client = new QueryClient({
    defaultOptions: queryDefaultOptions,
  });

  // Mantem dados anteriores em mudancas de filtros/paginacao de listagens.
  client.setQueryDefaults(['entries'], {
    placeholderData: keepPreviousData,
  });

  client.setQueryDefaults(['transfers'], {
    placeholderData: keepPreviousData,
  });

  client.setQueryDefaults(['boletos'], {
    placeholderData: keepPreviousData,
  });

  client.setQueryDefaults(['audit-logs'], {
    placeholderData: keepPreviousData,
  });

  return client;
}

export const queryClient = createAppQueryClient();
