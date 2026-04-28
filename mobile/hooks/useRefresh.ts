import { useState, useCallback } from 'react';

/**
 * Hook that manages pull-to-refresh state.
 * Pass the returned `refreshing` and `onRefresh` to a ScrollView/FlatList RefreshControl.
 *
 * @param fetchFn - async function to call on refresh
 */
export function useRefresh(fetchFn: () => Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchFn();
    } finally {
      setRefreshing(false);
    }
  }, [fetchFn]);

  return { refreshing, onRefresh };
}
