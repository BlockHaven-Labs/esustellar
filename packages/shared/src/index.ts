export interface SavingsGroup {
  id: string;
  name: string;
  contributionAmount: number;
  frequency: 'monthly' | 'weekly';
  members: string[];
  currentRound: number;
}

export interface Contribution {
  memberId: string;
  amount: number;
  timestamp: Date;
  txHash: string;
}

// Constants
export const STELLAR_NETWORK = {
  testnet: 'https://horizon-testnet.stellar.org',
  mainnet: 'https://horizon.stellar.org'
} as const;

// Utility functions
export function formatAmount(amount: number): string {
  return (amount / 10_000_000).toFixed(2); // Convert stroops to XLM
}

export function validateContribution(amount: number, required: number): boolean {
  return amount === required;
}