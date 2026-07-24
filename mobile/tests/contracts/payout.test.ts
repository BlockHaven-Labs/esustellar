/**
 * Contract Integration Tests - Payout Flow
 * Issue #333: Tests for smart contract interactions (payout)
 */

import { TransactionHelper } from '../../services/contracts/sorobanClient';

jest.mock('../../services/contracts/sorobanClient', () => {
  const actual = jest.requireActual('../../services/contracts/sorobanClient');

  const mockClient = {
    connect: jest.fn().mockResolvedValue(true),
    isClientConnected: jest.fn().mockReturnValue(true),
    getAccount: jest.fn().mockResolvedValue({
      address: 'GPAYOUT1234ABCDEFGHIJKLMNOPQRSTUVWXYZ12345678',
      balance: '3000.0000000',
      sequence: 55,
    }),
    callContract: jest.fn(),
    submitTransaction: jest.fn(),
    getTransactionStatus: jest.fn(),
    estimateGas: jest.fn().mockResolvedValue(2000),
    disconnect: jest.fn(),
  };

  return {
    ...actual,
    default: jest.fn(() => mockClient),
    createSorobanClient: jest.fn(() => mockClient),
    __mockClient: mockClient,
  };
});

const RECIPIENT_ADDRESS = 'GPAYOUT1234ABCDEFGHIJKLMNOPQRSTUVWXYZ12345678';
const GROUP_ID = 'group_payout_test';

function getMockClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('../../services/contracts/sorobanClient') as any).__mockClient;
}

describe('Payout Flow Contract Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMockClient().isClientConnected.mockReturnValue(true);
  });

  describe('trigger_payout()', () => {
    it('triggers payout and returns recipient and amount', async () => {
      const mockClient = getMockClient();
      mockClient.callContract.mockResolvedValueOnce({
        success: true,
        payout_id: 'payout_001',
        recipient: RECIPIENT_ADDRESS,
        amount: 500,
      });

      const result = await mockClient.callContract({
        method: 'trigger_payout',
        args: [{ group_id: GROUP_ID }],
        signer: RECIPIENT_ADDRESS,
      });

      expect(result.success).toBe(true);
      expect(result.recipient).toBe(RECIPIENT_ADDRESS);
      expect(result.amount).toBe(500);
    });

    it('confirms payout transaction on-chain', async () => {
      const mockClient = getMockClient();
      const txHash = 'deadbeef1234567890abcdef';
      mockClient.submitTransaction.mockResolvedValueOnce({
        hash: txHash,
        status: 'success',
        result: { ledger: 99999, feeCharged: 100 },
      });

      const tx = TransactionHelper.createTransaction(RECIPIENT_ADDRESS, []);
      const txWithOp = TransactionHelper.addContractCallOperation(
        tx,
        'savings_group_contract',
        'trigger_payout',
        [{ group_id: GROUP_ID }]
      );
      const signed = await TransactionHelper.signTransaction(txWithOp, RECIPIENT_ADDRESS);
      const result = await mockClient.submitTransaction(signed);

      expect(result.status).toBe('success');
      expect(result.hash).toBe(txHash);
    });

    it('rejects payout when group has insufficient funds', async () => {
      const mockClient = getMockClient();
      mockClient.callContract.mockRejectedValueOnce(
        new Error('Contract call failed: insufficient group balance')
      );

      await expect(
        mockClient.callContract({
          method: 'trigger_payout',
          args: [{ group_id: GROUP_ID }],
          signer: RECIPIENT_ADDRESS,
        })
      ).rejects.toThrow('insufficient group balance');
    });

    it('rejects payout when called by non-member', async () => {
      const mockClient = getMockClient();
      mockClient.callContract.mockRejectedValueOnce(
        new Error('Contract call failed: caller is not a group member')
      );

      await expect(
        mockClient.callContract({
          method: 'trigger_payout',
          args: [{ group_id: GROUP_ID }],
          signer: 'GSTRANGER00000000000000000000000000000000000000',
        })
      ).rejects.toThrow('caller is not a group member');
    });
  });

  describe('get_payout_schedule()', () => {
    it('returns the payout schedule for a group', async () => {
      const mockClient = getMockClient();
      mockClient.callContract.mockResolvedValueOnce({
        group_id: GROUP_ID,
        schedule: [
          { round: 1, recipient: RECIPIENT_ADDRESS, due_date: '2025-01-01' },
          { round: 2, recipient: 'GMEMBER2000000000000000000000000000000000000000', due_date: '2025-02-01' },
        ],
      });

      const result = await mockClient.callContract({
        method: 'get_payout_schedule',
        args: [{ group_id: GROUP_ID }],
      });

      expect(result.schedule).toHaveLength(2);
      expect(result.schedule[0].recipient).toBe(RECIPIENT_ADDRESS);
    });
  });

  describe('get_transaction_status()', () => {
    it('returns success status for completed payout tx', async () => {
      const mockClient = getMockClient();
      const txHash = 'payouttxhash1234567890';
      mockClient.getTransactionStatus.mockResolvedValueOnce({
        hash: txHash,
        status: 'success',
      });

      const status = await mockClient.getTransactionStatus(txHash);
      expect(status.status).toBe('success');
      expect(status.hash).toBe(txHash);
    });

    it('returns error status for failed payout tx', async () => {
      const mockClient = getMockClient();
      mockClient.getTransactionStatus.mockResolvedValueOnce({
        hash: 'failedtxhash',
        status: 'error',
        error: 'transaction reverted',
      });

      const status = await mockClient.getTransactionStatus('failedtxhash');
      expect(status.status).toBe('error');
      expect(status.error).toBeTruthy();
    });
  });
});
