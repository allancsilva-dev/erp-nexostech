import { QueryClient } from '@tanstack/react-query';

export const queryDefaultOptions = {
  queries: {
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  },
  mutations: {
    retry: 0,
  },
} as const;

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: queryDefaultOptions,
  });
}

export const queryClient = createAppQueryClient();
