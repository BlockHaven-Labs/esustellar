/**
 * AsyncStorage-based persister for TanStack React Query.
 *
 * Stores the serialised query cache so it survives app restarts.
 * On the next launch, stale-but-valid cached data is shown immediately
 * while a background refresh is in progress.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'esustellar.query.cache';

// Maximum age (ms) before the whole persisted cache is discarded on load.
// Matches the gcTime set on the QueryClient (30 minutes).
export const MAX_CACHE_AGE_MS = 1000 * 60 * 30;

export interface PersistedQueryCache {
  timestamp: number;
  buster: string;
  clientState: string; // serialised PersistedClient JSON
}

export const asyncStoragePersister = {
  persistClient: async (persistedClient: unknown): Promise<void> => {
    try {
      const entry: PersistedQueryCache = {
        timestamp: Date.now(),
        buster: 'v1',
        clientState: JSON.stringify(persistedClient),
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch {
      // Fail silently — cache is best-effort
    }
  },

  restoreClient: async (): Promise<unknown | undefined> => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (!raw) return undefined;

      const entry = JSON.parse(raw) as Partial<PersistedQueryCache>;

      if (
        typeof entry.timestamp !== 'number' ||
        typeof entry.clientState !== 'string' ||
        entry.buster !== 'v1'
      ) {
        return undefined;
      }

      // Discard if older than MAX_CACHE_AGE_MS
      if (Date.now() - entry.timestamp > MAX_CACHE_AGE_MS) {
        await AsyncStorage.removeItem(CACHE_KEY);
        return undefined;
      }

      return JSON.parse(entry.clientState);
    } catch {
      return undefined;
    }
  },

  removeClient: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
    } catch {
      // Fail silently
    }
  },
};
