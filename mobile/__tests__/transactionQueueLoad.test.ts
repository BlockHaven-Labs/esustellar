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
    const NUM_TRANSACTIONS = 100;

    // Add all transactions concurrently to the queue
    const txIds = await Promise.all(
      Array.from({ length: NUM_TRANSACTIONS }, (_, i) =>
        Promise.resolve().then(() =>
          useTransactionQueue.getState().addTransaction({
            type: 'contribution',
            amount: 10 + i,
            recipient: 'GBABC123...',
            memo: `Load test payment ${i}`,
            groupId: 'test_group_1',
            metadata: { loadTestRun: true },
          }),
        ),
      ),
    );

    expect(txIds.every(Boolean)).toBe(true);
    expect(new Set(txIds).size).toBe(NUM_TRANSACTIONS);
    expect(useTransactionQueue.getState().transactions.length).toBe(NUM_TRANSACTIONS);

    // Concurrently update statuses to simulate heavy processing without corrupting state
    await Promise.all(
      txIds.map((id, i) =>
        Promise.resolve().then(() => {
          if (i % 2 === 0) {
            useTransactionQueue.getState().updateTransactionStatus(id, 'confirmed', undefined, `tx_hash_${i}_verified`);
          } else {
            useTransactionQueue.getState().updateTransactionStatus(id, 'failed', 'Stellar network timeout');
          }
        }),
      ),
    );

    const transactions = useTransactionQueue.getState().transactions;
    const successes = transactions.filter((t) => t.status === 'confirmed').length;
    const failures = transactions.filter((t) => t.status === 'failed').length;

    expect(transactions.length).toBe(NUM_TRANSACTIONS);
    expect(successes + failures).toBe(NUM_TRANSACTIONS);
    expect(useTransactionQueue.getState().isProcessing).toBe(false);

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
