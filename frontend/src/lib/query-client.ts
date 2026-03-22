import { QueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/utils/logger';

export const queryDefaultOptions = {
  queries: {
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
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
  return new QueryClient({
    defaultOptions: queryDefaultOptions,
  });
}

export const queryClient = createAppQueryClient();
