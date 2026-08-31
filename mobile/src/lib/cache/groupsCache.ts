/**
 * Group data cache utilities.
 *
 * Provides helpers that wrap the TanStack React Query cache so that
 * the UI can immediately show the last-known state while a background
 * refresh runs, and clearly indicate when displayed data is stale.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Group } from '../../../types/group';

const GROUPS_CACHE_KEY = 'esustellar.groups.cache';
const GROUPS_CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes — matches React Query staleTime

export interface GroupsCacheEntry {
  data: Group[];
  fetchedAt: number;
}

/**
 * Writes the latest group list to AsyncStorage for offline-first display.
 */
export async function writeGroupsCache(groups: Group[]): Promise<void> {
  try {
    const entry: GroupsCacheEntry = { data: groups, fetchedAt: Date.now() };
    await AsyncStorage.setItem(GROUPS_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Best-effort — do not surface cache write failures
  }
}

/**
 * Reads the persisted group list from AsyncStorage.
 * Returns `null` if no cache exists or it has expired.
 */
export async function readGroupsCache(): Promise<GroupsCacheEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(GROUPS_CACHE_KEY);
    if (!raw) return null;

    const entry = JSON.parse(raw) as Partial<GroupsCacheEntry>;

    if (!Array.isArray(entry.data) || typeof entry.fetchedAt !== 'number') {
      return null;
    }

    return { data: entry.data, fetchedAt: entry.fetchedAt };
  } catch {
    return null;
  }
}

/**
 * Returns `true` if the given cache entry is older than the TTL.
 */
export function isCacheStale(fetchedAt: number): boolean {
  return Date.now() - fetchedAt > GROUPS_CACHE_TTL_MS;
}

/**
 * Clears the persisted group cache entirely.
 */
export async function clearGroupsCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(GROUPS_CACHE_KEY);
  } catch {
    // Best-effort
  }
}

/**
 * Human-readable age of the cache entry (e.g. "2 min ago").
 */
export function formatCacheAge(fetchedAt: number): string {
  const deltaMs = Date.now() - fetchedAt;
  const seconds = Math.floor(deltaMs / 1000);

  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
