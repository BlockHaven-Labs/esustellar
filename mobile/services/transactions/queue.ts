/**
 * Transaction Queue Service
 * Manages pending blockchain transactions, tracks status, and handles retries
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
// Try to load react-native async storage; fall back to a simple localStorage-based shim for
// environments where the native module isn't available (e.g., web or tests).
let AsyncStorage: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AsyncStorage = require('@react-native-async-storage/async-storage');
} catch (e) {
  // Fallback shim using browser localStorage when available
  const hasLocalStorage = typeof localStorage !== 'undefined';
  AsyncStorage = {
    getItem: async (key: string) => (hasLocalStorage ? Promise.resolve(localStorage.getItem(key)) : Promise.resolve(null)),
    setItem: async (key: string, value: string) => (hasLocalStorage ? Promise.resolve(localStorage.setItem(key, value)) : Promise.resolve()),
    removeItem: async (key: string) => (hasLocalStorage ? Promise.resolve(localStorage.removeItem(key)) : Promise.resolve()),
  };
}
import { logger } from '../logger';

// Transaction status enum
export type TransactionStatus = 
  | 'pending'      // Waiting to be submitted
  | 'submitting'   // Being submitted to the network
  | 'submitted'    // Submitted, waiting for confirmation
  | 'confirmed'    // Successfully confirmed
  | 'failed'       // Failed and needs retry
  | 'expired'      // Expired and will be cleared
  | 'cancelled';   // User cancelled

// Transaction type
export type TransactionType = 'contribution' | 'payout' | 'transfer';

// Queued transaction interface
export interface QueuedTransaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  recipient?: string;
  memo?: string;
  txHash?: string;
  error?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  submittedAt?: number;
  confirmedAt?: number;
  groupId?: string;
  metadata?: Record<string, unknown>;
}

// Queue statistics
export interface QueueStats {
  pending: number;
  submitting: number;
  submitted: number;
  confirmed: number;
  failed: number;
  total: number;
}

// Callback for status updates
export type StatusUpdateCallback = (tx: QueuedTransaction) => void;

// Queue configuration
const QUEUE_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 5000,
  EXPIRY_MS: 24 * 60 * 60 * 1000, // 24 hours
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  MAX_QUEUE_SIZE: 100,
  CONFIRMATION_TIMEOUT_MS: 60 * 1000, // 1 minute
};

// Status callbacks registry
const statusCallbacks = new Map<string, Set<StatusUpdateCallback>>();

/**
 * Generate a unique transaction ID
 */
function generateTransactionId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Subscribe to status updates for a specific transaction
 */
export function subscribeToStatusUpdates(
  txId: string,
  callback: StatusUpdateCallback
): () => void {
  if (!statusCallbacks.has(txId)) {
    statusCallbacks.set(txId, new Set());
  }
  statusCallbacks.get(txId)!.add(callback);

  // Return unsubscribe function
  return () => {
    statusCallbacks.get(txId)?.delete(callback);
  };
}

/**
 * Notify all subscribers of a status update
 */
function notifyStatusUpdate(tx: QueuedTransaction): void {
  const callbacks = statusCallbacks.get(tx.id);
  if (callbacks) {
    callbacks.forEach(callback => {
      try {
        callback(tx);
      } catch (error) {
        logger.error('TransactionQueue', `Error in status callback for ${tx.id}`, error);
      }
    });
  }
}

/**
 * Zustand store for transaction queue
 */
interface TransactionQueueStore {
  // Queue state
  transactions: QueuedTransaction[];
  isProcessing: boolean;
  lastCleanup: number;

  // Actions
  addTransaction: (tx: Omit<QueuedTransaction, 'id' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'retryCount' | 'status'>) => string;
  updateTransactionStatus: (id: string, status: TransactionStatus, error?: string, txHash?: string) => void;
  removeTransaction: (id: string) => void;
  retryTransaction: (id: string) => boolean;
  cancelTransaction: (id: string) => boolean;
  clearCompleted: () => number;
  clearFailed: () => number;
  clearAll: () => void;
  getTransaction: (id: string) => QueuedTransaction | undefined;
  getTransactionsByStatus: (status: TransactionStatus) => QueuedTransaction[];
  getPendingTransactions: () => QueuedTransaction[];
  getFailedTransactions: () => QueuedTransaction[];
  getStats: () => QueueStats;
  setProcessing: (isProcessing: boolean) => void;
  subscribe: (txId: string, callback: StatusUpdateCallback) => () => void;
}

export const useTransactionQueue = create<TransactionQueueStore>()(
  persist(
    (set, get) => ({
      transactions: [],
      isProcessing: false,
      lastCleanup: Date.now(),

      addTransaction(tx) {
        const state = get();
        
        // Check queue size limit
        if (state.transactions.length >= QUEUE_CONFIG.MAX_QUEUE_SIZE) {
          logger.warn('TransactionQueue', 'Queue is full, cannot add transaction');
          return '';
        }

        const now = Date.now();
        const newTx: QueuedTransaction = {
          id: generateTransactionId(),
          type: tx.type,
          status: 'pending',
          amount: tx.amount,
          recipient: tx.recipient,
          memo: tx.memo,
          retryCount: 0,
          maxRetries: QUEUE_CONFIG.MAX_RETRIES,
          createdAt: now,
          updatedAt: now,
          expiresAt: now + QUEUE_CONFIG.EXPIRY_MS,
          groupId: tx.groupId,
          metadata: tx.metadata,
        };

        set(state => ({
          transactions: [...state.transactions, newTx],
        }));

        notifyStatusUpdate(newTx);
        logger.info('TransactionQueue', `Transaction ${newTx.id} added to queue`);
        
        return newTx.id;
      },

      updateTransactionStatus(id, status, error, txHash) {
        const state = get();
        const txIndex = state.transactions.findIndex(t => t.id === id);
        
        if (txIndex === -1) {
          logger.warn('TransactionQueue', `Transaction ${id} not found`);
          return;
        }

        const updatedTx: QueuedTransaction = {
          ...state.transactions[txIndex],
          status,
          updatedAt: Date.now(),
          error: error || state.transactions[txIndex].error,
          txHash: txHash || state.transactions[txIndex].txHash,
          ...(status === 'submitted' ? { submittedAt: Date.now() } : {}),
          ...(status === 'confirmed' ? { confirmedAt: Date.now() } : {}),
        };

        const newTransactions = [...state.transactions];
        newTransactions[txIndex] = updatedTx;

        set({ transactions: newTransactions });
        notifyStatusUpdate(updatedTx);
        logger.info('TransactionQueue', `Transaction ${id} status updated to ${status}`);
      },

      removeTransaction(id) {
        const state = get();
        const txIndex = state.transactions.findIndex(t => t.id === id);
        
        if (txIndex === -1) return;

        // Unsubscribe all callbacks
        statusCallbacks.delete(id);

        set(state => ({
          transactions: state.transactions.filter(t => t.id !== id),
        }));

        logger.info('TransactionQueue', `Transaction ${id} removed from queue`);
      },

      retryTransaction(id) {
        const state = get();
        const tx = state.transactions.find(t => t.id === id);
        
        if (!tx) {
          logger.warn('TransactionQueue', `Transaction ${id} not found for retry`);
          return false;
        }

        if (tx.retryCount >= tx.maxRetries) {
          logger.warn('TransactionQueue', `Transaction ${id} has exceeded max retries`);
          return false;
        }

        if (tx.status !== 'failed' && tx.status !== 'cancelled') {
          logger.warn('TransactionQueue', `Transaction ${id} cannot be retried in status ${tx.status}`);
          return false;
        }

        const updatedTx: QueuedTransaction = {
          ...tx,
          status: 'pending',
          retryCount: tx.retryCount + 1,
          updatedAt: Date.now(),
          error: undefined,
        };

        set(state => ({
          transactions: state.transactions.map(t => t.id === id ? updatedTx : t),
        }));

        notifyStatusUpdate(updatedTx);
        logger.info('TransactionQueue', `Transaction ${id} queued for retry (${updatedTx.retryCount}/${tx.maxRetries})`);
        
        return true;
      },

      cancelTransaction(id) {
        const state = get();
        const tx = state.transactions.find(t => t.id === id);
        
        if (!tx) {
          logger.warn('TransactionQueue', `Transaction ${id} not found for cancellation`);
          return false;
        }

        if (tx.status === 'confirmed' || tx.status === 'cancelled') {
          logger.warn('TransactionQueue', `Transaction ${id} cannot be cancelled in status ${tx.status}`);
          return false;
        }

        get().updateTransactionStatus(id, 'cancelled');
        return true;
      },

      clearCompleted() {
        const state = get();
        const completedTx = state.transactions.filter(t => 
          t.status === 'confirmed' || t.status === 'expired'
        );
        
        // Remove callbacks for cleared transactions
        completedTx.forEach(tx => statusCallbacks.delete(tx.id));

        set(state => ({
          transactions: state.transactions.filter(t => 
            t.status !== 'confirmed' && t.status !== 'expired'
          ),
          lastCleanup: Date.now(),
        }));

        logger.info('TransactionQueue', `Cleared ${completedTx.length} completed transactions`);
        return completedTx.length;
      },

      clearFailed() {
        const state = get();
        const failedTx = state.transactions.filter(t => 
          t.status === 'failed' && t.retryCount >= t.maxRetries
        );
        
        // Remove callbacks for cleared transactions
        failedTx.forEach(tx => statusCallbacks.delete(tx.id));

        set(state => ({
          transactions: state.transactions.filter(t => 
            !(t.status === 'failed' && t.retryCount >= t.maxRetries)
          ),
          lastCleanup: Date.now(),
        }));

        logger.info('TransactionQueue', `Cleared ${failedTx.length} failed transactions`);
        return failedTx.length;
      },

      clearAll() {
        // Clear all callbacks
        statusCallbacks.clear();
        set({ transactions: [] });
        logger.info('TransactionQueue', 'All transactions cleared');
      },

      getTransaction(id) {
        return get().transactions.find(t => t.id === id);
      },

      getTransactionsByStatus(status) {
        return get().transactions.filter(t => t.status === status);
      },

      getPendingTransactions() {
        return get().transactions.filter(t => 
          t.status === 'pending' || t.status === 'submitting'
        );
      },

      getFailedTransactions() {
        return get().transactions.filter(t => 
          t.status === 'failed' && t.retryCount < t.maxRetries
        );
      },

      getStats() {
        const transactions = get().transactions;
        return {
          pending: transactions.filter(t => t.status === 'pending').length,
          submitting: transactions.filter(t => t.status === 'submitting').length,
          submitted: transactions.filter(t => t.status === 'submitted').length,
          confirmed: transactions.filter(t => t.status === 'confirmed').length,
          failed: transactions.filter(t => t.status === 'failed').length,
          total: transactions.length,
        };
      },

      setProcessing(isProcessing) {
        set({ isProcessing });
      },

      subscribe(txId, callback) {
        return subscribeToStatusUpdates(txId, callback);
      },
    }),
    {
      name: 'esustellar-tx-queue',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        transactions: state.transactions,
        lastCleanup: state.lastCleanup,
      }),
    },
  ),
);

/**
 * Transaction Queue Processor
 * Handles the actual processing of queued transactions
 */
export class TransactionQueueProcessor {
  private isRunning = false;
  private cleanupInterval?: ReturnType<typeof setInterval>;

  constructor() {
    this.startCleanupInterval();
  }

  /**
   * Start the cleanup interval
   */
  private startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, QUEUE_CONFIG.CLEANUP_INTERVAL_MS);
  }

  /**
   * Stop the cleanup interval
   */
  stop() {
    this.isRunning = false;
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  /**
   * Perform periodic cleanup
   */
  private performCleanup() {
    const store = useTransactionQueue.getState();
    const now = Date.now();

    // Clear expired transactions
    const expiredTx = store.transactions.filter(t => 
      t.expiresAt < now && t.status !== 'confirmed'
    );

    expiredTx.forEach(tx => {
      store.updateTransactionStatus(tx.id, 'expired');
    });

    // Clear old completed transactions (older than expiry period)
    const oldCompleted = store.transactions.filter(t => 
      (t.status === 'confirmed' || t.status === 'expired') &&
      (t.confirmedAt || t.updatedAt) < now - QUEUE_CONFIG.EXPIRY_MS
    );

    if (oldCompleted.length > 0 || expiredTx.length > 0) {
      store.clearCompleted();
      store.clearFailed();
      logger.info('TransactionQueue', `Cleanup: removed ${expiredTx.length} expired, ${oldCompleted.length} old completed`);
    }
  }

  /**
   * Process a single transaction
   */
  async processTransaction(tx: QueuedTransaction, submitFn: (tx: QueuedTransaction) => Promise<string>): Promise<boolean> {
    const store = useTransactionQueue.getState();

    // Check if transaction is expired
    if (tx.expiresAt < Date.now()) {
      store.updateTransactionStatus(tx.id, 'expired', 'Transaction expired');
      return false;
    }

    // Update status to submitting
    store.updateTransactionStatus(tx.id, 'submitting');

    try {
      // Submit transaction
      const txHash = await submitFn(tx);
      
      // Update to submitted
      store.updateTransactionStatus(tx.id, 'submitted', undefined, txHash);

      // Wait for confirmation (simplified - in real implementation, this would poll the network)
      const confirmed = await this.waitForConfirmation(tx.id, txHash);
      
      if (confirmed) {
        store.updateTransactionStatus(tx.id, 'confirmed');
        logger.info('TransactionQueue', `Transaction ${tx.id} confirmed`);
        return true;
      } else {
        throw new Error('Confirmation timeout');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('TransactionQueue', `Transaction ${tx.id} failed: ${errorMessage}`);
      
      store.updateTransactionStatus(tx.id, 'failed', errorMessage);
      return false;
    }
  }

  /**
   * Wait for transaction confirmation
   */
  private async waitForConfirmation(txId: string, txHash: string): Promise<boolean> {
    const store = useTransactionQueue.getState();
    const startTime = Date.now();

    // Simplified confirmation logic - in real implementation, this would check the Stellar network
    while (Date.now() - startTime < QUEUE_CONFIG.CONFIRMATION_TIMEOUT_MS) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate confirmation check
      // In real implementation: check Stellar horizon for transaction status
      const isConfirmed = Math.random() > 0.1; // 90% chance of confirmation
      
      if (isConfirmed) {
        return true;
      }

      // Check if transaction was cancelled
      const tx = store.getTransaction(txId);
      if (!tx || tx.status === 'cancelled') {
        return false;
      }
    }

    return false;
  }

  /**
   * Process all pending transactions
   */
  async processQueue(submitFn: (tx: QueuedTransaction) => Promise<string>): Promise<void> {
    if (this.isRunning) {
      logger.warn('TransactionQueue', 'Queue processor already running');
      return;
    }

    this.isRunning = true;
    const store = useTransactionQueue.getState();
    store.setProcessing(true);

    try {
      const pending = store.getPendingTransactions();
      
      for (const tx of pending) {
        if (!this.isRunning) break;
        
        // Check if transaction should be retried
        if (tx.status === 'failed' && tx.retryCount >= tx.maxRetries) {
          continue;
        }

        // Wait before retry if this is a retry attempt
        if (tx.retryCount > 0) {
          await new Promise(resolve => setTimeout(resolve, QUEUE_CONFIG.RETRY_DELAY_MS));
        }

        await this.processTransaction(tx, submitFn);
      }
    } finally {
      store.setProcessing(false);
      this.isRunning = false;
    }
  }
}

// Export singleton instance
export const transactionQueueProcessor = new TransactionQueueProcessor();

/**
 * Hook to get queue statistics
 */
export function useQueueStats() {
  return useTransactionQueue(state => state.getStats());
}

/**
 * Hook to get transactions by status
 */
export function useTransactionsByStatus(status: TransactionStatus) {
  return useTransactionQueue(state => state.getTransactionsByStatus(status));
}

/**
 * Hook to get all queue transactions
 */
export function useQueueTransactions() {
  return useTransactionQueue(state => state.transactions);
}

/**
 * Hook to get failed transactions that can be retried
 */
export function useRetryableTransactions() {
  return useTransactionQueue(state => state.getFailedTransactions());
}