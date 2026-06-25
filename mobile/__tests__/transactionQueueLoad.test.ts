jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { useTransactionQueue, transactionQueueProcessor } from '../services/transactions/queue';

describe('Transaction Queue Load Testing', () => {
  beforeEach(() => {
    useTransactionQueue.getState().clearAll();
    transactionQueueProcessor.stop();
  });

  afterAll(() => {
    transactionQueueProcessor.stop();
  });

  it('handles heavy concurrent transaction processing without crashes or state corruption', async () => {
    const NUM_TRANSACTIONS = 40; // Simulate heavy user load
    const CONCURRENCY = 8; // Number of items processed concurrently / rate limit
    
    // Mock submit function with variable simulated network delay
    const mockSubmitFn = jest.fn(async (tx) => {
      // Simulate real-world Stellar Horizon transaction submission delay (50ms - 150ms)
      const delay = Math.floor(Math.random() * 100) + 50;
      await new Promise((resolve) => setTimeout(resolve, delay));
      
      // Simulate random network failures (e.g., 5% rate) to test robustness
      if (Math.random() < 0.05) {
        throw new Error('Stellar network timeout');
      }
      
      return `tx_hash_${tx.id}_verified`;
    });

    const startTime = Date.now();

    // 1. Add all transactions concurrently to the queue
    const txIds: string[] = [];
    for (let i = 0; i < NUM_TRANSACTIONS; i++) {
      const id = useTransactionQueue.getState().addTransaction({
        type: 'contribution',
        amount: 10 + i,
        recipient: 'GBABC123...',
        memo: `Load test payment ${i}`,
        groupId: 'test_group_1',
        metadata: { loadTestRun: true },
      });
      if (id) {
        txIds.push(id);
      }
    }

    expect(txIds.length).toBe(NUM_TRANSACTIONS);
    expect(useTransactionQueue.getState().transactions.length).toBe(NUM_TRANSACTIONS);

    // 2. Start processing queue
    // Since processing runs sequentially in queue.ts (using a simple loop for pending),
    // let's simulate multiple workers processing the queue concurrently, or measure the default processor.
    // In our implementation, processQueue processes all pending items in a loop.
    // Let's run the queue processor to completion.
    const processPromise = transactionQueueProcessor.processQueue(mockSubmitFn);
    
    // While it is processing, simulate user adding more transactions concurrently to test concurrency safety
    await new Promise((resolve) => setTimeout(resolve, 20));
    const concurrentTxId = useTransactionQueue.getState().addTransaction({
      type: 'payout',
      amount: 100,
      recipient: 'GBXYZ456...',
      memo: 'Concurrent user interaction',
      groupId: 'test_group_1',
    });
    expect(concurrentTxId).not.toBe('');

    await processPromise;

    // Run processor again to process the concurrent transaction that was added mid-flight
    await transactionQueueProcessor.processQueue(mockSubmitFn);

    const endTime = Date.now();
    const durationMs = endTime - startTime;

    // 3. Collect and verify statistics
    const stats = useTransactionQueue.getState().getStats();
    const transactions = useTransactionQueue.getState().transactions;
    
    const successes = transactions.filter((t) => t.status === 'confirmed').length;
    const failures = transactions.filter((t) => t.status === 'failed').length;
    
    // Calculate performance metrics
    const throughput = (transactions.length / (durationMs / 1000)).toFixed(2);
    const totalSubmitCalls = mockSubmitFn.mock.calls.length;

    console.log('=== LOAD TESTING PERFORMANCE METRICS ===');
    console.log(`Simulated Users Load: ${NUM_TRANSACTIONS + 1} transactions`);
    console.log(`Total Time Taken: ${durationMs} ms`);
    console.log(`Throughput: ${throughput} tx/sec`);
    console.log(`Success Rate: ${((successes / transactions.length) * 100).toFixed(1)}% (${successes}/${transactions.length})`);
    console.log(`Failure Rate: ${((failures / transactions.length) * 100).toFixed(1)}% (${failures}/${transactions.length})`);
    console.log(`Total Network Calls: ${totalSubmitCalls}`);
    console.log('========================================');

    // 4. Assertions to ensure no crashes or invalid states occurred
    expect(successes + failures).toBe(NUM_TRANSACTIONS + 1);
    expect(useTransactionQueue.getState().isProcessing).toBe(false);
    
    // Ensure all transactions have timestamps set
    transactions.forEach((tx) => {
      expect(tx.createdAt).toBeLessThanOrEqual(Date.now());
      expect(tx.updatedAt).toBeLessThanOrEqual(Date.now());
      if (tx.status === 'confirmed') {
        expect(tx.txHash).toContain('tx_hash_');
      }
    });
  });

  it('enforces queue size limits and handles overflow gracefully', () => {
    // Fill the queue up to MAX_QUEUE_SIZE
    const MAX_LIMIT = 100;
    
    for (let i = 0; i < MAX_LIMIT; i++) {
      useTransactionQueue.getState().addTransaction({
        type: 'transfer',
        amount: 1,
        recipient: 'GB...',
      });
    }

    expect(useTransactionQueue.getState().transactions.length).toBe(MAX_LIMIT);

    // Try to add one more - should fail and return empty string
    const overflowId = useTransactionQueue.getState().addTransaction({
      type: 'transfer',
      amount: 1,
      recipient: 'GB...',
    });

    expect(overflowId).toBe('');
    expect(useTransactionQueue.getState().transactions.length).toBe(MAX_LIMIT);
  });
});
