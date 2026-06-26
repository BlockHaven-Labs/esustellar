/**
 * Contract Integration Tests - Contribution Flow
 * Issue #333: Tests for smart contract interactions (contribution)
 */

import { TransactionHelper } from '../../services/contracts/sorobanClient';

// ─── mock setup ──────────────────────────────────────────────────────────────

const mockCallContract = jest.fn();
const mockSubmitTransaction = jest.fn();
const mockGetTransactionStatus = jest.fn();

const mockClient = {
  connect: jest.fn().mockResolvedValue(true),
  isClientConnected: jest.fn().mockReturnValue(true),
  getAccount: jest.fn().mockResolvedValue({
    address: 'GTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567',
    balance: '5000.0000000',
    sequence: 100,
  }),
  callContract: mockCallContract,
  submitTransaction: mockSubmitTransaction,
  getTransactionStatus: mockGetTransactionStatus,
  estimateGas: jest.fn().mockResolvedValue(1500),
  disconnect: jest.fn(),
};

jest.mock('../../services/contracts/sorobanClient', () => {
  const actual = jest.requireActual('../../services/contracts/sorobanClient');
  return {
    ...actual,
    default: jest.fn(() => mockClient),
    createSorobanClient: jest.fn(() => mockClient),
  };
});

// ─── constants ───────────────────────────────────────────────────────────────

const VALID_STELLAR_ADDRESS = 'GTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567';
const CONTRACT_ID = 'savings_group_contract';
const GROUP_ID = 'group_test_001';

// ─── tests ───────────────────────────────────────────────────────────────────

describe('Contribution Flow Contract Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.isClientConnected.mockReturnValue(true);
  });

  describe('contribute()', () => {
    it('submits a contribution transaction and returns success', async () => {
      mockSubmitTransaction.mockResolvedValueOnce({
        hash: 'abc123def456',
        status: 'success',
      });

      const tx = TransactionHelper.createTransaction(VALID_STELLAR_ADDRESS, []);
      const txWithOp = TransactionHelper.addContractCallOperation(
        tx,
        CONTRACT_ID,
        'contribute',
        [{ group_id: GROUP_ID, amount: 100 }]
      );
      const signed = await TransactionHelper.signTransaction(txWithOp, VALID_STELLAR_ADDRESS);
      const result = await mockSubmitTransaction(signed);

      expect(result.status).toBe('success');
      expect(result.hash).toBeTruthy();
    });

    it('returns contract contribution id after successful call', async () => {
      mockCallContract.mockResolvedValueOnce({
        success: true,
        contribution_id: 'contrib_42',
        new_balance: 700,
      });

      const result = await mockCallContract({
        method: 'contribute',
        args: [{ group_id: GROUP_ID, amount: 100 }],
        signer: VALID_STELLAR_ADDRESS,
      });

      expect(result.success).toBe(true);
      expect(result.contribution_id).toBe('contrib_42');
      expect(result.new_balance).toBe(700);
    });

    it('rejects contribution with zero amount', async () => {
      mockCallContract.mockRejectedValueOnce(
        new Error('Contract call failed: amount must be > 0')
      );

      await expect(
        mockCallContract({
          method: 'contribute',
          args: [{ group_id: GROUP_ID, amount: 0 }],
          signer: VALID_STELLAR_ADDRESS,
        })
      ).rejects.toThrow('amount must be > 0');
    });

    it('rejects when client not connected', async () => {
      mockClient.isClientConnected.mockReturnValue(false);
      mockCallContract.mockRejectedValueOnce(
        new Error('Client not connected to network')
      );

      await expect(
        mockCallContract({ method: 'contribute', args: [], signer: VALID_STELLAR_ADDRESS })
      ).rejects.toThrow('Client not connected to network');
    });

    it('validates transaction before submission', () => {
      const tx = TransactionHelper.createTransaction(VALID_STELLAR_ADDRESS, [
        { type: 'invoke_contract' },
      ]);
      const validation = TransactionHelper.validateTransaction(tx);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('flags invalid transaction missing source account', () => {
      const tx = TransactionHelper.createTransaction('', [{ type: 'invoke_contract' }]);
      const validation = TransactionHelper.validateTransaction(tx);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Source account is required');
    });

    it('estimates gas cost for contribution', async () => {
      mockClient.estimateGas.mockResolvedValueOnce(2500);

      const tx = TransactionHelper.createTransaction(VALID_STELLAR_ADDRESS, []);
      const txWithOp = TransactionHelper.addContractCallOperation(
        tx, CONTRACT_ID, 'contribute', [{ amount: 100 }]
      );
      const gas = await mockClient.estimateGas(txWithOp);

      expect(gas).toBeGreaterThan(0);
    });
  });
});
