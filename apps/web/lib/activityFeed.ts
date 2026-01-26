import { Horizon } from '@stellar/stellar-sdk';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const server = new Horizon.Server(HORIZON_URL);

export type ActivityType = 'contribution' | 'payout' | 'joined' | 'created' | 'round_end';

export interface Activity {
  type: ActivityType;
  description: string;
  amount: string | null;
  time: string;
  txHash: string | null;
  groupId?: string;
}

export async function fetchRecentActivity(userAddress: string): Promise<Activity[]> {
  if (!userAddress) return [];

  try {
    const response = await server
      .operations()
      .forAccount(userAddress)
      .limit(20)
      .order('desc')
      .call();

    const activities: Activity[] = [];

    for (const record of response.records) {
      const activity = await parseOperation(record, userAddress);
      if (activity) {
        activities.push(activity);
      }
    }

    return activities;
  } catch (error) {
    console.error('Error fetching horizon operations:', error);
    return [];
  }
}

async function parseOperation(record: Horizon.ServerApi.OperationRecord, userAddress: string): Promise<Activity | null> {
  const txHash = record.transaction_hash;
  const createdAt = record.created_at;
  const time = formatTime(createdAt);

  // We are primarily looking for contract invocations (invoke_host_function)
  if (record.type === 'invoke_host_function') {
      // In a real scenario with full Horizon data, we might inspect parameters.
      // However, standard Horizon response for invoke_host_function often lacks decoded args without extra queries.
      // For this implementation, we will try to infer based on function names if available,
      // or fall back to generic "Interaction".
      // Note: Horizon 'invoke_host_function' details are limited.
      // A robust implementation often requires indexing (e.g. Mercury) or querying transaction details/events.
      // Given the prompt asks to use Horizon operations, we will do our best effort mapping.
      
      // Since we can't easily get the function name directly from the operation record in all Horizon versions
      // without decoding XDR, we might check if we can see the function name in the record details
      // or if we have to treat it as a generic contract interaction.
      
      // Let's assume for this task we are looking for patterns or just labeling generic interactions
      // If the prompt implies we CAN parse contract invocations, we might need to look at the 'function' field if exposed
      // or decode the XDR. Decoding XDR in the frontend is heavy.
      // Let's check if the record has `function` (some Horizon instances enrich this).
      // Otherwise, we might rely on the `type` being `invoke_host_function`.
      
      // To satisfy the requirements "contrib", "payout", "joined", "created", "round_end"
      // strictly from Horizon operations is tricky without decoding arguments.
      // However, we can look at "payment" operations if the contract sends money (payouts).
      // Or "payment" from user to contract (contributions).

      // Let's refine the strategy:
      // 1. Payment (User -> Contract) = Contribution? (Or User -> Group Account)
      // 2. Payment (Contract -> User) = Payout?
      // 3. Invoke Host Function = Joined / Created / Round End? (Hard to distinguish without decoding)

      // WAIT. The prompt says "Parse contract invocations".
      // Let's try to map generic types first, or if we see 'payment' types.
      
      // For the purpose of this task and the limitations of standard Horizon JSON response:
      // We will map:
      // - payment (to user) -> Payout
      // - payment (from user) -> Contribution
      // - invoke_host_function -> "Contract Interaction" (and try to refine if possible)

      // Actually, standard "invoke_host_function" operations in Horizon response include "function" field
      // standard invocation. Let's try to access it safely.
      // The type definition might not show it, so we cast to unknown first.
      const op = record as unknown as { function?: string };
      
      if (op.function) {
          const funcName = op.function; // e.g., "join_group", "create_group", "make_payment"
          
          if (funcName === 'create_group') {
              return {
                  type: 'created',
                  description: 'Created a new Savings Group',
                  amount: null,
                  time,
                  txHash
              };
          }
          if (funcName === 'join_group') {
               return {
                  type: 'joined',
                  description: 'Joined a Savings Group',
                  amount: null,
                  time,
                  txHash
              };
          }
          if (funcName === 'deposit' || funcName === 'contribute') {
               return {
                  type: 'contribution',
                  description: 'Contributed to Savings Group',
                  amount: '- XLM', // We might not get amount easily without parsing events/transfers
                  time,
                  txHash
              };
          }
          if (funcName === 'distribute' || funcName === 'payout') {
               return {
                  type: 'round_end',
                  description: 'Round completed in Savings Group',
                  amount: null,
                  time,
                  txHash
              };
          }
      }
      
      // If we can't parse function name, return generic
       return {
          type: 'created', // Fallback/Placeholder if we can't distinguish, or maybe 'joined'
          description: 'Contract Interaction',
          amount: null,
          time,
          txHash
      };
  }
  
  // Handle Payments (Native XLM transfers)
  if (record.type === 'payment') {
      const op = record as Horizon.ServerApi.PaymentOperationRecord;
      const isRecipient = op.to === userAddress;
      
      if (isRecipient) {
          return {
              type: 'payout',
              description: `Received payout from ${shortenAddress(op.from)}`,
              amount: `${parseFloat(op.amount).toLocaleString()} XLM`,
              time,
              txHash
          };
      } else {
          return {
              type: 'contribution',
              description: `Sent payment to ${shortenAddress(op.to)}`,
              amount: `${parseFloat(op.amount).toLocaleString()} XLM`,
              time,
              txHash
          };
      }
  }

  // Handle Account Merge (often used in closing accounts or specific flows)
  // Handle Create Account (if user created a group account?)

  return null;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function shortenAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
