import * as React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { formatXLM, truncateAddress } from '../../utils/stellar';
import { QueuedTransaction, TransactionStatus, useTransactionQueue } from '../../services/transactions/queue';

// Status configuration
const STATUS_CONFIG: Record<TransactionStatus, { label: string; color: string; icon: string }> = {
  pending: { label: 'Pending', color: '#F59E0B', icon: '⏳' },
  submitting: { label: 'Submitting...', color: '#3B82F6', icon: '📤' },
  submitted: { label: 'Submitted', color: '#3B82F6', icon: '✅' },
  confirmed: { label: 'Confirmed', color: '#22C55E', icon: '✓' },
  failed: { label: 'Failed', color: '#EF4444', icon: '✕' },
  expired: { label: 'Expired', color: '#94A3B8', icon: '⏰' },
  cancelled: { label: 'Cancelled', color: '#94A3B8', icon: '⊘' },
};

// Transaction type configuration
const TYPE_CONFIG: Record<'contribution' | 'payout' | 'transfer', { label: string; icon: string }> = {
  contribution: { label: 'Contribution', icon: '↑' },
  payout: { label: 'Payout', icon: '↓' },
  transfer: { label: 'Transfer', icon: '→' },
};

interface Props {
  transaction: QueuedTransaction;
  onRetry?: (id: string) => void;
  onCancel?: (id: string) => void;
  onRemove?: (id: string) => void;
  compact?: boolean;
}

function TransactionQueueItemComponent({
  transaction,
  onRetry,
  onCancel,
  onRemove,
  compact = false,
}: Props) {
  const statusConfig = STATUS_CONFIG[transaction.status];
  const typeConfig = TYPE_CONFIG[transaction.type];
  const formattedAmount = React.useMemo(() => formatXLM(transaction.amount), [transaction.amount]);
  const canRetry = transaction.status === 'failed' && transaction.retryCount < transaction.maxRetries;
  const canCancel = transaction.status === 'pending' || transaction.status === 'submitting';
  const isTerminal = transaction.status === 'confirmed' || transaction.status === 'expired' || transaction.status === 'cancelled';

  const handleRetry = () => {
    onRetry?.(transaction.id);
  };

  const handleCancel = () => {
    onCancel?.(transaction.id);
  };

  const handleRemove = () => {
    onRemove?.(transaction.id);
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return 'just now';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const formatExpiry = () => {
    const remaining = transaction.expiresAt - Date.now();
    if (remaining <= 0) return 'Expired';
    const mins = Math.floor(remaining / 60000);
    if (mins < 60) return `${mins}m remaining`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h remaining`;
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={[styles.compactStatusDot, { backgroundColor: statusConfig.color }]} />
        <View style={styles.compactInfo}>
          <Text style={styles.compactType}>{typeConfig.icon} {typeConfig.label}</Text>
          <Text style={styles.compactAmount}>{formattedAmount}</Text>
        </View>
        {/* {transaction.status === 'submitting' && (
          <ActivityIndicator size="small" color={statusConfig.color} />
        )} */}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeIcon}>{typeConfig.icon}</Text>
          <Text style={styles.typeLabel}>{typeConfig.label}</Text>
        </View>
        <View style={styles.statusBadge(statusConfig.color)}>
          <Text style={styles.statusText}>{statusConfig.icon} {statusConfig.label}</Text>
        </View>
      </View>

      {/* Amount */}
      <View style={styles.amountRow}>
        <Text style={styles.amount}>{formattedAmount}</Text>
        {transaction.txHash && (
          <Text style={styles.txHash}>
            {truncateAddress(transaction.txHash, 6, 4)}
          </Text>
        )}
      </View>

      {/* Details */}
      <View style={styles.detailsRow}>
        <Text style={styles.detailText}>
          {formatTimeAgo(transaction.createdAt)}
        </Text>
        {transaction.recipient && (
          <>
            <Text style={styles.detailSeparator}>•</Text>
            <Text style={styles.detailText}>
              To: {truncateAddress(transaction.recipient)}
            </Text>
          </>
        )}
        {transaction.retryCount > 0 && (
          <>
            <Text style={styles.detailSeparator}>•</Text>
            <Text style={[styles.detailText, styles.retryText]}>
              Attempt {transaction.retryCount + 1}/{transaction.maxRetries + 1}
            </Text>
          </>
        )}
      </View>

      {/* Error Message */}
      {transaction.error && transaction.status === 'failed' && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{transaction.error}</Text>
        </View>
      )}

      {/* Expiry Warning */}
      {!isTerminal && transaction.status !== 'submitting' && (
        <View style={styles.expiryContainer}>
          <Text style={styles.expiryText}>⏰ {formatExpiry()}</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsRow}>
        {canRetry && onRetry && (
          <TouchableOpacity style={styles.actionButton} onPress={handleRetry}>
            <Text style={styles.actionButtonText}>Retry</Text>
          </TouchableOpacity>
        )}
        {canCancel && onCancel && (
          <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={handleCancel}>
            <Text style={[styles.actionButtonText, styles.cancelButtonText]}>Cancel</Text>
          </TouchableOpacity>
        )}
        {isTerminal && onRemove && (
          <TouchableOpacity style={[styles.actionButton, styles.removeButton]} onPress={handleRemove}>
            <Text style={[styles.actionButtonText, styles.removeButtonText]}>Dismiss</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Submitting Progress */}
      {transaction.status === 'submitting' && (
        <View style={styles.progressContainer}>
          {/* <ActivityIndicator size="small" color="#3B82F6" /> */}
          <Text style={styles.progressText}>Submitting to network...</Text>
        </View>
      )}

      {/* Submitted Waiting */}
      {transaction.status === 'submitted' && (
        <View style={styles.progressContainer}>
          {/* <ActivityIndicator size="small" color="#3B82F6" /> */}
          <Text style={styles.progressText}>Waiting for confirmation...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeIcon: {
    fontSize: 16,
    fontWeight: '600',
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    textTransform: 'capitalize',
  },
  statusBadge: (color: string) => ({
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: `${color}15`,
  }),
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  txHash: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  detailSeparator: {
    fontSize: 12,
    color: '#CBD5E1',
    marginHorizontal: 6,
  },
  retryText: {
    color: '#F59E0B',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    lineHeight: 16,
  },
  expiryContainer: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  expiryText: {
    fontSize: 12,
    color: '#D97706',
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: '#FEE2E2',
  },
  cancelButtonText: {
    color: '#DC2626',
  },
  removeButton: {
    backgroundColor: '#F1F5F9',
  },
  removeButtonText: {
    color: '#64748B',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  progressText: {
    fontSize: 12,
    color: '#64748B',
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 12,
  },
  compactStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactInfo: {
    flex: 1,
  },
  compactType: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  compactAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
});

// Export memoized version
const arePropsEqual = (prev: Props, next: Props) =>
  prev.transaction.id === next.transaction.id &&
  prev.transaction.status === next.transaction.status &&
  prev.transaction.retryCount === next.transaction.retryCount &&
  prev.onRetry === next.onRetry &&
  prev.onCancel === next.onCancel &&
  prev.onRemove === next.onRemove;

export const TransactionQueueItem = React.memo(TransactionQueueItemComponent, arePropsEqual);

// Export a connected version that uses the store
export function ConnectedTransactionQueueItem({
  transactionId,
  compact = false,
}: {
  transactionId: string;
  compact?: boolean;
}) {
  const updateStatus = useTransactionQueue(state => state.updateTransactionStatus);
  const retryTransaction = useTransactionQueue(state => state.retryTransaction);
  const cancelTransaction = useTransactionQueue(state => state.cancelTransaction);
  const removeTransaction = useTransactionQueue(state => state.removeTransaction);
  const transaction = useTransactionQueue(state => state.getTransaction(transactionId));

  if (!transaction) {
    return null;
  }

  return (
    <TransactionQueueItem
      transaction={transaction}
      compact={compact}
      onRetry={() => retryTransaction(transactionId)}
      onCancel={() => cancelTransaction(transactionId)}
      onRemove={() => removeTransaction(transactionId)}
    />
  );
}