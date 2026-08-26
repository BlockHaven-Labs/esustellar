import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { groupsApi } from '../services/api/groupsApi';
import { queryKeys } from '../services/queryClient';
import { writeGroupsCache } from '../src/lib/cache/groupsCache';

export function useUserGroups(userAddress: string) {
  const query = useQuery({
    queryKey: queryKeys.groups.user(userAddress),
    queryFn: async () => {
      const groups = await groupsApi.getUserGroups(userAddress);
      // Write-through: persist fresh data to AsyncStorage so it's available
      // immediately on next launch.
      await writeGroupsCache(groups).catch(() => {});
      return groups;
    },
    enabled: !!userAddress,
  });

  return query;
}

export function useGroupById(groupId: string) {
  return useQuery({
    queryKey: queryKeys.groups.detail(groupId),
    queryFn: () => groupsApi.getGroupById(groupId),
    enabled: !!groupId,
  });
}

export function useInvalidateGroups() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.groups.all }),
    [queryClient],
  );
}

/**
 * Returns whether the cached group data is considered stale.
 * `dataUpdatedAt` comes from `useUserGroups()` — when it's older than the
 * staleTime the query will be re-fetching in the background.
 */
export function useIsGroupDataStale(dataUpdatedAt: number): boolean {
  const STALE_THRESHOLD_MS = 1000 * 60 * 5; // matches staleTime
  if (!dataUpdatedAt) return false;
  return Date.now() - dataUpdatedAt > STALE_THRESHOLD_MS;
}
