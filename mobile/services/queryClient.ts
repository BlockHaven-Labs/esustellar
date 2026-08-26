/**
 * React Query Client Configuration
 * Provides query client for optimistic updates and caching.
 *
 * Persistence: the serialised query cache is written to AsyncStorage via
 * `asyncStoragePersister` so that last-known data is available immediately
 * on the next app launch while a background refresh is in progress.
 */

import { QueryClient } from '@tanstack/react-query';
import { asyncStoragePersister } from '../src/lib/cache/asyncStoragePersister';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
      // Keep showing stale data while re-fetching in the background so the
      // UI always has something to display on slow / offline networks.
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

// Query keys for consistent cache management
export const queryKeys = {
  groups: {
    all: ['groups'] as const,
    detail: (id: string) => ['groups', id] as const,
    user: (address: string) => ['groups', 'user', address] as const,
  },
  transactions: {
    all: ['transactions'] as const,
    user: (address: string) => ['transactions', 'user', address] as const,
    group: (groupId: string) => ['transactions', groupId] as const,
  },
  notifications: {
    all: ['notifications'] as const,
  },
};

/**
 * Hydrate the QueryClient from the persisted AsyncStorage cache.
 * Call once at app startup (before the first render) so that cached data
 * is available immediately without a loading spinner.
 */
export async function hydrateQueryClientFromCache(): Promise<void> {
  try {
    const persistedClient = await asyncStoragePersister.restoreClient();
    if (persistedClient) {
      queryClient.setQueryData(['__hydrated__'], true);
      // Restore the full cache state
      const { dehydrate, hydrate } = await import('@tanstack/react-query');
      // persistedClient is already a DehydratedState-shaped object
      hydrate(queryClient, persistedClient as ReturnType<typeof dehydrate>);
    }
  } catch {
    // Hydration is best-effort — app continues normally on failure
  }
}

// Subscribe to cache changes and persist them to AsyncStorage.
// This runs on every successful query result, keeping the local cache fresh.
queryClient.getQueryCache().subscribe((event) => {
  if (event?.type === 'updated' && event.query.state.status === 'success') {
    const { dehydrate } = require('@tanstack/react-query');
    asyncStoragePersister.persistClient(dehydrate(queryClient)).catch(() => {
      // Persist failures are non-fatal
    });
  }
});
