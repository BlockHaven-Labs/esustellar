/**
 * Transaction Queue Screen
 * Example screen demonstrating the transaction queue system
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import {
  useTransactionQueue,
  useQueueStats,
  useQueueTransactions,
  transactionQueueProcessor,
  QueuedTransaction,
} from '../services/transactions/queue';
import {
  TransactionQueueList,
  TransactionQueueBadge,
  TransactionQueueItem,
} from '../components/transactions';

interface Props {
  navigation: any;
}

function TransactionQueueScreen({ navigation }: Props) {
  const stats = useQueueStats();
  const transactions = useQueueTransactions();
  const addTransaction = useTransactionQueue(state => state.addTransaction);
  const clearAll = useTransactionQueue(state => state.clearAll);

  // Example: Add a test transaction
  const addTestTransaction = (type: 'contribution' | 'payout' | 'transfer') => {
    const id = addTransaction({
      type,
      amount: Math.random() * 100 + 10,
      recipient: `G${Math.random().toString(36).substring(2, 56)}`,
      memo: `Test ${type}`,
      groupId: 'group_1',
      maxRetries: 3,
    });

    if (id) {
      window.confirm(`Transaction Added\nTransaction ${id} has been queued`);
    }
  };

  // Example: Simulate processing the queue
  const processQueue = async () => {
    const mockSubmitFn = async (tx: QueuedTransaction): Promise<string> => {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate random success/failure (90% success rate)
      if (Math.random() > 0.1) {
        return `txhash_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      } else {
        throw new Error('Network error: Transaction failed');
      }
    };

    await transactionQueueProcessor.processQueue(mockSubmitFn);
    window.confirm('Processing Complete');
  };

  // Example: Clear all transactions
  const handleClearAll = () => {
    const confirmClear = window.confirm('Clear All\nAre you sure you want to clear all transactions?');
    
    if (confirmClear) {
      clearAll();
      window.confirm('Cleared');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transaction Queue</Text>
        <TransactionQueueBadge size="medium" />
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.submitting}</Text>
          <Text style={styles.statLabel}>Submitting</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.submitted}</Text>
          <Text style={styles.statLabel}>Submitted</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#22C55E' }]}>{stats.confirmed}</Text>
          <Text style={styles.statLabel}>Confirmed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.failed}</Text>
          <Text style={styles.statLabel}>Failed</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <View style={styles.actionsWrapper}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
            onPress={() => addTestTransaction('contribution')}
          >
            <Text style={styles.actionButtonText}>Add Contribution</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#22C55E' }]}
            onPress={() => addTestTransaction('payout')}
          >
            <Text style={styles.actionButtonText}>Add Payout</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]}
            onPress={() => addTestTransaction('transfer')}
          >
            <Text style={styles.actionButtonText}>Add Transfer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
            onPress={processQueue}
          >
            <Text style={styles.actionButtonText}>Process Queue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
            onPress={handleClearAll}
          >
            <Text style={styles.actionButtonText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Transaction List */}
      <View style={styles.listContainer}>
        <TransactionQueueList
          showStats={false}
          showEmptyState={true}
          compact={false}
          emptyComponent={EmptyState}
        />
      </View>
    </SafeAreaView>
  );
}

// Empty state component
function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={styles.emptyTitle}>Queue is Empty</Text>
      <Text style={styles.emptySubtitle}>
        Add transactions using the buttons above or they will be automatically queued when you perform actions.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  actionsContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionsWrapper: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default TransactionQueueScreen;