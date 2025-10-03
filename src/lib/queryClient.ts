// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: How long data is considered fresh
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Cache time: How long data stays in cache after component unmounts
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      // Retry configuration
      retry: (failureCount: number, error: unknown) => {
        // Don't retry on 401/403 errors (auth issues)
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 403) {
          return false;
        }
        // Don't retry on 429 (rate limited) globally
        if (status === 429) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex: number) => {
        return Math.min(1000 * 2 ** attemptIndex, 30000);
      },
      // Disable refetch on window focus to reduce bursts
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect immediately
      refetchOnReconnect: false,
    },
    mutations: {
      // Global mutation error handling
      onError: (error: unknown) => {
        console.error('Mutation error:', error);
        // You can add global error handling here
      },
    },
  },
});
