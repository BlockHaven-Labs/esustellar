/**
 * StaleCacheIndicator
 *
 * Shows a small badge when the displayed data was loaded from the local cache
 * and a live refresh is pending. Disappears once fresh data arrives.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatCacheAge } from '../../src/lib/cache/groupsCache';

interface StaleCacheIndicatorProps {
  /** Epoch timestamp (ms) when the data was last fetched from the network. */
  dataUpdatedAt: number;
  /** Whether a background fetch is currently in progress. */
  isFetching: boolean;
  /** Whether to show the indicator at all (default: true when stale + fetching). */
  visible?: boolean;
}

export default function StaleCacheIndicator({
  dataUpdatedAt,
  isFetching,
  visible,
}: StaleCacheIndicatorProps) {
  const shouldShow = visible ?? (isFetching && dataUpdatedAt > 0);

  if (!shouldShow) return null;

  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <View style={styles.dot} />
      <Text style={styles.text}>
        {isFetching
          ? `Updating… (cached ${formatCacheAge(dataUpdatedAt)})`
          : `Showing cached data from ${formatCacheAge(dataUpdatedAt)}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'center',
    marginVertical: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  text: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
});
