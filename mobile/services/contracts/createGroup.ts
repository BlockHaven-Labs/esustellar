/**
 * Smart Contract Service for Group Creation
 * Handles all contract interactions related to creating savings groups
 */

import SorobanClient, { TransactionHelper, createSorobanClient } from './sorobanClient';

export interface GroupCreationParams {
  name: string;
  description: string;
  contributionAmount: number;
  payoutFrequency: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly';
  maxMembers: number;
  rules: string[];
  creatorAddress: string;
}

export interface GroupCreationResult {
  success: boolean;
  groupId?: string;
  contractAddress?: string;
  transactionHash?: string;
  error?: string;
}

export interface GroupValidationError {
  field: string;
  message: string;
}

class GroupCreationService {
  private sorobanClient: SorobanClient;

  constructor() {
    this.sorobanClient = createSorobanClient('testnet');
  }

  /**
   * Initialize the service by connecting to Soroban network
   */
  async initialize(): Promise<boolean> {
    try {
      const connected = await this.sorobanClient.connect();
      if (!connected) {
        throw new Error('Failed to connect to Soroban network');
      }
      return true;
    } catch (error) {
      console.error('GroupCreationService initialization failed:', error);
      return false;
    }
  }

  /**
   * Validate group creation parameters
   */
  validateGroupParams(params: GroupCreationParams): GroupValidationError[] {
    const errors: GroupValidationError[] = [];

    // Name validation
    if (!params.name.trim()) {
      errors.push({ field: 'name', message: 'Group name is required' });
    } else if (params.name.length < 3) {
      errors.push({ field: 'name', message: 'Group name must be at least 3 characters' });
    } else if (params.name.length > 50) {
      errors.push({ field: 'name', message: 'Group name must be less than 50 characters' });
    }

    // Description validation
    if (!params.description.trim()) {
      errors.push({ field: 'description', message: 'Description is required' });
    } else if (params.description.length < 10) {
      errors.push({ field: 'description', message: 'Description must be at least 10 characters' });
    } else if (params.description.length > 500) {
      errors.push({ field: 'description', message: 'Description must be less than 500 characters' });
    }

    // Contribution amount validation
    if (params.contributionAmount <= 0) {
      errors.push({ field: 'contributionAmount', message: 'Contribution amount must be greater than 0' });
    } else if (params.contributionAmount < 10) {
      errors.push({ field: 'contributionAmount', message: 'Minimum contribution amount is $10' });
    } else if (params.contributionAmount > 10000) {
      errors.push({ field: 'contributionAmount', message: 'Maximum contribution amount is $10,000' });
    }

    // Max members validation
    if (params.maxMembers < 2) {
      errors.push({ field: 'maxMembers', message: 'Minimum 2 members required' });
    } else if (params.maxMembers > 50) {
      errors.push({ field: 'maxMembers', message: 'Maximum 50 members allowed' });
    }

    // Rules validation
    if (!params.rules || params.rules.length === 0) {
      errors.push({ field: 'rules', message: 'At least one rule is required' });
    } else {
      const validRules = params.rules.filter(rule => rule.trim().length > 0);
      if (validRules.length === 0) {
        errors.push({ field: 'rules', message: 'At least one valid rule is required' });
      } else if (validRules.length > 10) {
        errors.push({ field: 'rules', message: 'Maximum 10 rules allowed' });
      }
    }

    // Creator address validation
    if (!params.creatorAddress.trim()) {
      errors.push({ field: 'creatorAddress', message: 'Creator address is required' });
    } else if (!this.isValidAddress(params.creatorAddress)) {
      errors.push({ field: 'creatorAddress', message: 'Invalid creator address format' });
    }

    return errors;
  }

  /**
   * Create a new savings group on the blockchain
   */
  async createGroup(params: GroupCreationParams): Promise<GroupCreationResult> {
    try {
      // Validate parameters
      const validationErrors = this.validateGroupParams(params);
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: `Validation failed: ${validationErrors.map(e => e.message).join(', ')}`,
        };
      }

      // Ensure client is connected
      if (!this.sorobanClient.isClientConnected()) {
        const connected = await this.initialize();
        if (!connected) {
          return {
            success: false,
            error: 'Failed to connect to blockchain network',
          };
        }
      }

      // Check if creator account exists and has sufficient balance
      const account = await this.sorobanClient.getAccount(params.creatorAddress);
      const accountBalance = parseFloat(account.balance);
      const requiredBalance = params.contributionAmount * 2; // Require 2x contribution as buffer

      if (accountBalance < requiredBalance) {
        return {
          success: false,
          error: `Insufficient balance. Required: $${requiredBalance}, Available: $${accountBalance}`,
        };
      }

      // Prepare contract arguments
      const contractArgs = {
        name: params.name,
        description: params.description,
        contribution_amount: params.contributionAmount,
        payout_frequency: params.payoutFrequency,
        max_members: params.maxMembers,
        rules: params.rules.filter(rule => rule.trim().length > 0),
        creator: params.creatorAddress,
        created_at: new Date().toISOString(),
      };

      // Create transaction for group creation
      const transaction = TransactionHelper.createTransaction(params.creatorAddress, []);
      const transactionWithContract = TransactionHelper.addContractCallOperation(
        transaction,
        'savings_group_contract', // This would be the actual contract ID
        'create_group',
        [contractArgs]
      );

      // Validate transaction
      const validation = TransactionHelper.validateTransaction(transactionWithContract);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Transaction validation failed: ${validation.errors.join(', ')}`,
        };
      }

      // Sign transaction
      const signedTransaction = await TransactionHelper.signTransaction(
        transactionWithContract,
        params.creatorAddress
      );

      // Submit transaction
      const result = await this.sorobanClient.submitTransaction(signedTransaction);

      if (result.status === 'success') {
        // Call contract to get group details
        const contractResult = await this.sorobanClient.callContract({
          method: 'create_group',
          args: [contractArgs],
          signer: params.creatorAddress,
        });

        return {
          success: true,
          groupId: contractResult.group_id,
          contractAddress: contractResult.contract_address,
          transactionHash: result.hash,
        };
      } else {
        return {
          success: false,
          error: result.error || 'Transaction failed',
        };
      }
    } catch (error) {
      console.error('Group creation failed:', error);
      return {
        success: false,
        error: `Group creation failed: ${error}`,
      };
    }
  }

  /**
   * Get group creation transaction status
   */
  async getTransactionStatus(transactionHash: string): Promise<GroupCreationResult> {
    try {
      const result = await this.sorobanClient.getTransactionStatus(transactionHash);

      if (result.status === 'success') {
        return {
          success: true,
          transactionHash: result.hash,
        };
      } else if (result.status === 'error') {
        return {
          success: false,
          error: result.error || 'Transaction failed',
          transactionHash: result.hash,
        };
      } else {
        return {
          success: false,
          error: 'Transaction is still pending',
          transactionHash: result.hash,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get transaction status: ${error}`,
      };
    }
  }

  /**
   * Estimate gas cost for group creation
   */
  async estimateGasCost(params: GroupCreationParams): Promise<number> {
    try {
      // Create mock transaction for gas estimation
      const transaction = TransactionHelper.createTransaction(params.creatorAddress, []);
      const transactionWithContract = TransactionHelper.addContractCallOperation(
        transaction,
        'savings_group_contract',
        'create_group',
        [params]
      );

      const gasCost = await this.sorobanClient.estimateGas(transactionWithContract);
      return gasCost;
    } catch (error) {
      console.error('Gas estimation failed:', error);
      // Return default gas cost if estimation fails
      return 5000;
    }
  }

  /**
   * Check if a group name is available
   */
  async checkGroupNameAvailability(name: string): Promise<boolean> {
    try {
      // Mock check - replace with actual contract call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simulate name collision check
      const existingNames = ['Family Savings', 'Investment Club', 'Emergency Fund'];
      return !existingNames.includes(name);
    } catch (error) {
      console.error('Name availability check failed:', error);
      // Default to available if check fails
      return true;
    }
  }

  /**
   * Validate address format
   */
  private isValidAddress(address: string): boolean {
    // Basic address validation - replace with proper Stellar address validation
    if (!address || typeof address !== 'string') {
      return false;
    }

    // Check if it starts with '0x' and has valid length for Ethereum-style addresses
    if (address.startsWith('0x')) {
      return address.length === 42 && /^[0-9a-fA-F]+$/.test(address.slice(2));
    }

    // Check for Stellar public key format (G...)
    if (address.startsWith('G')) {
      return address.length === 56 && /^[A-Z0-9]+$/.test(address.slice(1));
    }

    return false;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.sorobanClient.disconnect();
  }
}

// Export singleton instance
export const groupCreationService = new GroupCreationService();

// Export types for use in components
export type { GroupCreationParams, GroupCreationResult, GroupValidationError };

export default GroupCreationService;
