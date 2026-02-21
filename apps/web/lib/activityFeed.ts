import { Horizon, rpc, xdr, scValToNative } from '@stellar/stellar-sdk';
import { SOROBAN_RPC_URL } from '@/config/walletConfig';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const horizonServer = new Horizon.Server(HORIZON_URL);
const sorobanServer = new rpc.Server(SOROBAN_RPC_URL, { allowHttp: true });

export type ActivityType = 'contribution' | 'payout' | 'joined' | 'created' | 'round_end';

export interface Activity {
  type: ActivityType;
  description: string;
  amount: string | null;
  time: string;
  txHash: string | null;
  groupId: string;
  groupName: string;
  roundNumber?: number;
}

export async function fetchRecentActivity(userAddress: string, getGroupName?: (groupId: string) => Promise<string>): Promise<Activity[]> {
  if (!userAddress) return [];

  try {
    const response = await horizonServer
      .operations()
      .forAccount(userAddress)
      .limit(10)
      .order('desc')
      .call();

    const activities: Activity[] = [];

    // Process operations in parallel for better performance
    const activityPromises = response.records.map(record =>
      parseOperation(record, userAddress, getGroupName)
    );

    const parsedActivities = await Promise.all(activityPromises);

    for (const activity of parsedActivities) {
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

async function parseOperation(
  record: Horizon.ServerApi.OperationRecord,
  userAddress: string,
  getGroupName?: (groupId: string) => Promise<string>
): Promise<Activity | null> {
  const txHash = record.transaction_hash;
  const createdAt = record.created_at;
  const time = formatTime(createdAt);

  // Only process invoke_host_function operations (Soroban contract calls)
  if (record.type === 'invoke_host_function') {
    try {
      // Fetch the full transaction details including events from Soroban RPC
      const tx = await sorobanServer.getTransaction(txHash);

      if (tx.status === rpc.Api.GetTransactionStatus.SUCCESS && tx.resultMetaXdr) {
        // Parse the transaction result and extract contract events
        // resultMetaXdr is already an XDR object, not a string
        const resultMeta = typeof tx.resultMetaXdr === 'string' 
          ? xdr.TransactionMeta.fromXDR(tx.resultMetaXdr, 'base64')
          : tx.resultMetaXdr;

        // Extract contract events
        const events = parseContractEvents(resultMeta);

        if (events.length > 0) {
          // First, try to find group_id from any event or from transaction details
          let groupId = '';
          
          // Try to extract groupId from events
          for (const event of events) {
            if (event.topic === 'created' && event.data.length > 0) {
              groupId = String(scValToNative(event.data[0]));
              break;
            }
          }
          
          // If not found in events, try to extract from transaction envelope
          if (!groupId && tx.envelope) {
            try {
              groupId = extractContractIdFromEnvelope(tx.envelope);
            } catch (e) {
              // Continue without groupId from envelope
            }
          }

          // Map the first relevant event to activity
          for (const event of events) {
            const activity = await mapEventToActivity(
              event,
              txHash,
              userAddress,
              groupId,
              getGroupName
            );
            if (activity) {
              return activity;
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching transaction ${txHash}:`, error);
      // If we can't fetch or parse the transaction, skip it instead of showing generic message
      return null;
    }

    // If no events were found but transaction was successful, still skip instead of showing generic message
    return null;
  }

  // Handle Payments (Native XLM transfers)
  if (record.type === 'payment') {
    const op = record as Horizon.ServerApi.PaymentOperationRecord;
    const isRecipient = op.to === userAddress;

    if (isRecipient) {
      return {
        type: 'payout',
        description: `Received payout of ${formatAmount(op.amount)} XLM`,
        amount: `+${formatAmount(op.amount)} XLM`,
        time,
        txHash,
        groupId: op.from,
        groupName: shortenAddress(op.from),
      };
    } else {
      return {
        type: 'contribution',
        description: `Sent payment of ${formatAmount(op.amount)} XLM`,
        amount: `-${formatAmount(op.amount)} XLM`,
        time,
        txHash,
        groupId: op.to,
        groupName: shortenAddress(op.to),
      };
    }
  }

  return null;
}

/**
 * Extract contract ID from transaction envelope
 */
function extractContractIdFromEnvelope(envelope: string | xdr.TransactionEnvelope): string {
  try {
    const txEnv = typeof envelope === 'string'
      ? xdr.TransactionEnvelope.fromXDR(envelope, 'base64')
      : envelope;

    // Get the transaction
    const txV1 = txEnv.v1?.();
    if (!txV1) return '';

    const tx = txV1.tx?.();
    if (!tx) return '';

    const ops = tx.operations?.();
    if (!ops || ops.length === 0) return '';

    // Find the invoke_host_function operation
    for (const op of ops) {
      const body = op.body?.();
      if (!body) continue;

      const invokeOp = body.invokeHostFunctionOp?.();
      if (!invokeOp) continue;

      // Get the host function
      const hostFunc = invokeOp.hostFunction?.();
      if (!hostFunc) continue;

      // Extract contract address from the host function arguments
      const args = hostFunc.args?.();
      if (!args || args.length === 0) continue;

      // The first arg is usually the contract or contract reference
      const contractVal = args[0];
      if (!contractVal) continue;

      try {
        const contractId = scValToNative(contractVal);
        return String(contractId);
      } catch (e) {
        continue;
      }
    }

    return '';
  } catch (error) {
    console.error('Error extracting contract ID from envelope:', error);
    return '';
  }
}

/**
 * Parse contract events from transaction metadata
 */
function parseContractEvents(
  resultMeta: xdr.TransactionMeta | any
): Array<{ topic: string; data: xdr.ScVal[] }> {
  const events: Array<{ topic: string; data: xdr.ScVal[] }> = [];

  try {
    // Access v3 metadata structure
    const v3 = (resultMeta as any).v3?.();
    if (!v3) return events;

    const sorobanMeta = v3.sorobanMeta?.();
    if (!sorobanMeta) return events;

    const contractEvents = sorobanMeta.events?.();
    if (!contractEvents || contractEvents.length === 0) return events;

    for (const event of contractEvents) {
      try {
        const body = event.body?.();
        if (!body) continue;

        const contractEvent = body.contractEvent?.();
        if (!contractEvent) continue;

        const topics = contractEvent.topics?.() || [];
        const data = contractEvent.data?.() || [];

        // Extract topic name from first topic
        let topicName = '';
        if (topics.length > 0 && topics[0].sym) {
          topicName = topics[0].sym().toString();
        }

        events.push({
          topic: topicName,
          data: data || [],
        });
      } catch (e) {
        console.error('Error parsing individual event:', e);
        continue;
      }
    }
  } catch (error) {
    console.error('Error parsing contract events:', error);
  }

  return events;
}

/**
 * Map a contract event to an Activity
 */
async function mapEventToActivity(
  event: { topic: string; data: xdr.ScVal[] },
  txHash: string,
  userAddress: string,
  groupId: string,
  getGroupName?: (groupId: string) => Promise<string>
): Promise<Activity | null> {
  const time = formatTime(new Date().toISOString());

  try {
    switch (event.topic) {
      case 'created':
        return parseCreatedEvent(event, txHash, time, getGroupName);

      case 'joined':
        return parseJoinedEvent(event, txHash, time, groupId, getGroupName);

      case 'contrib':
        return parseContribEvent(event, txHash, time, groupId, getGroupName);

      case 'payout':
        return parsePayoutEvent(event, txHash, time, groupId, getGroupName);

      case 'round_end':
        return parseRoundEndEvent(event, txHash, time, groupId, getGroupName);

      default:
        return null;
    }
  } catch (error) {
    console.error(`Error mapping event ${event.topic}:`, error);
    return null;
  }
}

/**
 * Parse 'created' event: (group_id, contribution_amount, total_members)
 */
async function parseCreatedEvent(
  event: { topic: string; data: xdr.ScVal[] },
  txHash: string,
  time: string,
  getGroupName?: (groupId: string) => Promise<string>
): Promise<Activity | null> {
  try {
    const data = event.data;
    if (!data || data.length < 3) return null;

    const groupIdVal = scValToNative(data[0]);
    if (!groupIdVal) return null;
    const groupId = String(groupIdVal);
    if (!groupId) return null;

    const groupName = getGroupName ? await getGroupName(groupId) : groupId;

    return {
      type: 'created',
      description: `Created ${groupName}`,
      amount: null,
      time,
      txHash,
      groupId,
      groupName,
    };
  } catch (error) {
    console.error('Error parsing created event:', error);
    return null;
  }
}

/**
 * Parse 'joined' event: (member, new_count)
 * Note: This event doesn't include group_id directly, so we use member as placeholder
 * In production, you might want to query the contract to find which group this member joined
 */
async function parseJoinedEvent(
  event: { topic: string; data: xdr.ScVal[] },
  txHash: string,
  time: string,
  groupId: string,
  getGroupName?: (groupId: string) => Promise<string>
): Promise<Activity | null> {
  try {
    // Use 'Unknown' as fallback if groupId is missing
    const finalGroupId = groupId || 'unknown';
    const groupName = getGroupName && groupId ? await getGroupName(groupId) : finalGroupId;

    return {
      type: 'joined',
      description: `Joined ${groupName}`,
      amount: null,
      time,
      txHash,
      groupId: finalGroupId,
      groupName,
    };
  } catch (error) {
    console.error('Error parsing joined event:', error);
    return null;
  }
}

/**
 * Parse 'contrib' event: (member, contribution_amount, current_round)
 */
async function parseContribEvent(
  event: { topic: string; data: xdr.ScVal[] },
  txHash: string,
  time: string,
  groupId: string,
  getGroupName?: (groupId: string) => Promise<string>
): Promise<Activity | null> {
  try {
    const data = event.data;
    if (!data || data.length < 2) return null;

    const amountVal = scValToNative(data[1]);
    if (amountVal === null || amountVal === undefined) return null;
    const amount = Number(amountVal) / 10_000_000; // Convert stroops to XLM
    if (isNaN(amount)) return null;
    const roundNumber = data.length > 2 ? (() => { const val = Number(scValToNative(data[2])); return isNaN(val) ? undefined : val; })() : undefined;

    const finalGroupId = groupId || 'unknown';
    const groupName = getGroupName && groupId ? await getGroupName(groupId) : finalGroupId;

    return {
      type: 'contribution',
      description: `Contributed ${amount.toFixed(2)} XLM to ${groupName}`,
      amount: `-${amount.toFixed(2)} XLM`,
      time,
      txHash,
      groupId: finalGroupId,
      groupName,
      roundNumber,
    };
  } catch (error) {
    console.error('Error parsing contrib event:', error);
    return null;
  }
}

/**
 * Parse 'payout' event: (recipient, payout_amount, current_round)
 */
async function parsePayoutEvent(
  event: { topic: string; data: xdr.ScVal[] },
  txHash: string,
  time: string,
  groupId: string,
  getGroupName?: (groupId: string) => Promise<string>
): Promise<Activity | null> {
  try {
    const data = event.data;
    if (!data || data.length < 2) return null;

    const amountVal = scValToNative(data[1]);
    if (amountVal === null || amountVal === undefined) return null;
    const amount = Number(amountVal) / 10_000_000; // Convert stroops to XLM
    if (isNaN(amount)) return null;
    const roundNumber = data.length > 2 ? (() => { const val = Number(scValToNative(data[2])); return isNaN(val) ? undefined : val; })() : undefined;

    const finalGroupId = groupId || 'unknown';
    const groupName = getGroupName && groupId ? await getGroupName(groupId) : finalGroupId;

    return {
      type: 'payout',
      description: `Received payout of ${amount.toFixed(2)} XLM from ${groupName}`,
      amount: `+${amount.toFixed(2)} XLM`,
      time,
      txHash,
      groupId: finalGroupId,
      groupName,
      roundNumber,
    };
  } catch (error) {
    console.error('Error parsing payout event:', error);
    return null;
  }
}

/**
 * Parse 'round_end' event: (current_round - 1)
 */
async function parseRoundEndEvent(
  event: { topic: string; data: xdr.ScVal[] },
  txHash: string,
  time: string,
  groupId: string,
  getGroupName?: (groupId: string) => Promise<string>
): Promise<Activity | null> {
  try {
    const data = event.data;
    if (!data || data.length < 1) return null;

    const roundVal = scValToNative(data[0]);
    if (roundVal === null || roundVal === undefined) return null;
    const roundNumber = Number(roundVal);
    if (isNaN(roundNumber)) return null;

    const finalGroupId = groupId || 'unknown';
    const groupName = getGroupName && groupId ? await getGroupName(groupId) : finalGroupId;

    return {
      type: 'round_end',
      description: `Round ${roundNumber} completed in ${groupName}`,
      amount: null,
      time,
      txHash,
      groupId: finalGroupId,
      groupName,
      roundNumber,
    };
  } catch (error) {
    console.error('Error parsing round_end event:', error);
    return null;
  }
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }
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

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatAmount(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function shortenAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/**
 * Export group name cache accessor for use in components
 * This is meant to be used with a group name cache from the Soroban contract context
 */
export function createGroupNameFetcher(
  getGroupNameFromContract: (groupId: string) => Promise<string>
) {
  const cache = new Map<string, string>();

  return async (groupId: string): Promise<string> => {
    if (cache.has(groupId)) {
      return cache.get(groupId)!;
    }

    try {
      const name = await getGroupNameFromContract(groupId);
      cache.set(groupId, name);
      return name;
    } catch (error) {
      console.error(`Failed to fetch group name for ${groupId}:`, error);
      return groupId;
    }
  };
}
