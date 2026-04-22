export type GroupStatus = 'Open' | 'Active' | 'Completed' | 'Paused'

export type MemberStatus =
  | 'Active'
  | 'PaidCurrentRound'
  | 'Overdue'
  | 'Defaulted'
  | 'ReceivedPayout'

export type Frequency = 'Weekly' | 'BiWeekly' | 'Monthly'

// ============================================================
// Core contract data structures
// Mirrors the Rust structs in contracts/savings/src/lib.rs
// ============================================================

export interface SavingsGroup {
  group_id: string
  admin: string
  name: string
  contribution_amount: bigint   // in stroops (1 XLM = 10_000_000 stroops)
  total_members: number
  frequency: Frequency
  start_timestamp: bigint       // Unix timestamp (u64)
  status: GroupStatus
  is_public: boolean
  current_round: number
  platform_fee_percent: number  // basis points (200 = 2%)
}

export interface Member {
  address: string
  join_timestamp: bigint        // Unix timestamp (u64)
  join_order: number
  status: MemberStatus
  total_contributed: bigint     // in stroops
  has_received_payout: boolean
  payout_round: number
}

export interface Contribution {
  member: string                // Stellar public key
  amount: bigint                // in stroops
  round: number
  timestamp: bigint             // Unix timestamp (u64)
}

export interface Payout {
  recipient: string             // Stellar public key
  amount: bigint                // in stroops
  round: number
  timestamp: bigint             // Unix timestamp (u64)
}

// ============================================================
// Registry contract data structure
// Mirrors the Rust struct in contracts/registry/src/lib.rs
// ============================================================

export interface GroupInfo {
  contract_address: string      // Stellar contract address
  group_id: string
  name: string
  admin: string                 // Stellar public key
  is_public: boolean
  created_at: bigint            // Unix timestamp (u64)
  total_members: number
}

// ============================================================
// Frontend form params (used when creating a group)
// ============================================================

export interface CreateGroupParams {
  groupId: string
  name: string
  contributionAmount: bigint    // in stroops
  totalMembers: number
  frequency: Frequency
  startTimestamp: bigint        // Unix timestamp (u64)
  isPublic: boolean
}

// ============================================================
// Network constants
// ============================================================

export const STELLAR_NETWORK = {
  testnet: 'https://horizon-testnet.stellar.org',
  mainnet: 'https://horizon.stellar.org',
} as const

// ============================================================
// Utility functions
// ============================================================

/**
 * Convert stroops to XLM.
 * 1 XLM = 10,000,000 stroops
 */
export function stroopsToXLM(stroops: bigint | number): number {
  return Number(stroops) / 10_000_000
}

/**
 * Convert XLM to stroops.
 */
export function xlmToStroops(xlm: number): bigint {
  return BigInt(Math.floor(xlm * 10_000_000))
}

/**
 * Format a stroops amount as a human-readable XLM string.
 * e.g. 500000000n → "50.00 XLM"
 */
export function formatXLM(stroops: bigint | number): string {
  const xlm = stroopsToXLM(stroops)
  return `${xlm.toLocaleString(undefined, { maximumFractionDigits: 2 })} XLM`
}

/**
 * Convert a Unix timestamp (seconds) to a JS Date object.
 */
export function timestampToDate(timestamp: bigint | number): Date {
  return new Date(Number(timestamp) * 1000)
}

/**
 * Format a Unix timestamp as a readable date string.
 * e.g. 1704067200n → "Jan 1, 2024"
 */
export function formatTimestamp(timestamp: bigint | number): string {
  return timestampToDate(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Returns true if a contribution amount matches the required group amount.
 */
export function validateContribution(
  amount: bigint,
  required: bigint
): boolean {
  return amount === required
}

/**
 * Calculate the total payout pool for a group.
 * Deducts the platform fee before returning.
 */
export function calculatePayoutAmount(
  contributionAmount: bigint,
  totalMembers: number,
  platformFeePercent: number
): bigint {
  const totalPool = contributionAmount * BigInt(totalMembers)
  const fee = (totalPool * BigInt(platformFeePercent)) / 10000n
  return totalPool - fee
}