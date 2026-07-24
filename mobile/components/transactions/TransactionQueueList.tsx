import React, { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import {
  useTransactionQueue,
  useQueueStats,
  QueuedTransaction,
  TransactionStatus,
} from '../../services/transactions/queue';
import { TransactionQueueItem } from './TransactionQueueItem';

export interface TransactionQueueListProps {
  showStats?: boolean;
  showEmptyState?: boolean;
  compact?: boolean;
  emptyComponent?: any;
  statusFilter?: TransactionStatus[];
  maxItems?: number;
}

export function useTransactionQueueList() {
  const transactions = useTransactionQueue(state => state.transactions);
  const retryTransaction = useTransactionQueue(state => state.retryTransaction);
  const cancelTransaction = useTransactionQueue(state => state.cancelTransaction);
  const removeTransaction = useTransactionQueue(state => state.removeTransaction);
  const stats = useQueueStats();

  return {
    transactions,
    retryTransaction,
    cancelTransaction,
    removeTransaction,
    stats,
  };
}

export function TransactionQueueBadge({
  size = 'small',
}: {
  size?: 'small' | 'medium' | 'large';
}) {
  const count = useTransactionQueue(state => state.transactions.length);
  const label = useMemo(() => {
    if (count === 0) return 'No queued tx';
    if (count === 1) return '1 queued tx';
    return `${count} queued tx`;
  }, [count]);

  const style = [styles.badge, size === 'medium' && styles.badgeMedium, size === 'large' && styles.badgeLarge];
  const textStyle = [styles.badgeText, size === 'medium' && styles.badgeTextMedium, size === 'large' && styles.badgeTextLarge];

  return (
    <View style={style}>
      <Text style={textStyle}>{label}</Text>
    </View>
  );
}

export function TransactionQueueList({
  showStats = true,
  showEmptyState = true,
  compact = false,
  emptyComponent: EmptyComponent,
  statusFilter,
  maxItems,
}: TransactionQueueListProps) {
  const transactions = useTransactionQueue(state => state.transactions);
  const retryTransaction = useTransactionQueue(state => state.retryTransaction);
  const cancelTransaction = useTransactionQueue(state => state.cancelTransaction);
  const removeTransaction = useTransactionQueue(state => state.removeTransaction);
  const stats = useQueueStats();

  const filteredTransactions = useMemo(() => {
    let list = transactions;

    if (statusFilter && statusFilter.length > 0) {
      list = list.filter(tx => statusFilter.includes(tx.status));
    }

    if (typeof maxItems === 'number') {
      list = list.slice(0, maxItems);
    }

    return list;
  }, [transactions, statusFilter, maxItems]);

  if (filteredTransactions.length === 0 && showEmptyState) {
    if (EmptyComponent) {
      return <EmptyComponent />;
    }

    return (
      <View style={styles.emptyStateContainer}>
        <Text style={styles.emptyStateTitle}>No queued transactions</Text>
        <Text style={styles.emptyStateSubtitle}>Transactions will appear here once you add them to the queue.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showStats && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.submitting}</Text>
            <Text style={styles.statLabel}>Submitting</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.submitted}</Text>
            <Text style={styles.statLabel}>Submitted</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.confirmed}</Text>
            <Text style={styles.statLabel}>Confirmed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.failed}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.scrollView}>
        <View style={styles.listContent}>
          {filteredTransactions.map(transaction => (
            <TransactionQueueItem
              key={transaction.id}
              transaction={transaction}
              compact={compact}
              onRetry={retryTransaction}
              onCancel={cancelTransaction}
              onRemove={removeTransaction}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  statItem: {
    width: '18%',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  badge: {
    backgroundColor: '#E0F2FE',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeMedium: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  badgeLarge: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  badgeText: {
    color: '#0369A1',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextMedium: {
    fontSize: 13,
  },
  badgeTextLarge: {
    fontSize: 14,
  },
});