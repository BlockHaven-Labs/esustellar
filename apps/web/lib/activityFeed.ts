import { Horizon, rpc, xdr, scValToNative } from "@stellar/stellar-sdk";
import { SOROBAN_RPC_URL } from "@/config/walletConfig";
import { formatDate, formatXLM, formatXLMFromStroops } from "@/lib/format";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const horizonServer = new Horizon.Server(HORIZON_URL);
const sorobanServer = new rpc.Server(SOROBAN_RPC_URL, { allowHttp: true });

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || "";

export type ActivityType =
  | "contribution"
  | "payout"
  | "joined"
  | "created"
  | "round_end";

export interface Activity {
  type: ActivityType;
  description: string;
  amount: string | null;
  time: string;
  txHash: string | null;
  groupId?: string;
  groupName?: string;
  roundNumber?: number;
}

// In-memory cache for group names to avoid repeated contract calls
const groupNameCache = new Map<string, string>();

/**
 * Fetches the group name from cache or by calling the contract.
 * Relies on a passed-in getGroupById fn from the SavingsContractContext.
 */
async function getGroupName(
  groupId: string,
  getGroupById: (id: string) => Promise<{ name: string }>,
): Promise<string> {
  if (groupNameCache.has(groupId)) {
    return groupNameCache.get(groupId)!;
  }
  try {
    const group = await getGroupById(groupId);
    groupNameCache.set(groupId, group.name);
    return group.name;
  } catch {
    // If we can't get the name, return the truncated groupId
    const shortId =
      groupId.length > 12
        ? `${groupId.slice(0, 6)}...${groupId.slice(-4)}`
        : groupId;
    return shortId;
  }
}

/**
 * Parses Soroban contract events from a transaction result.
 * Returns structured event data for known event topics.
 */
function parseContractEvents(
  txResult: rpc.Api.GetSuccessfulTransactionResponse,
): ParsedEvent[] {
  const events: ParsedEvent[] = [];

  if (!txResult.resultMetaXdr) return events;

  console.log("resultMetaXdr type:", typeof txResult.resultMetaXdr);
  console.log("resultMetaXdr:", txResult.resultMetaXdr);

  try {
    const meta = txResult.resultMetaXdr as xdr.TransactionMeta;

    if (!meta) return events;
    const metaV3 = meta.v3();
    const sorobanMeta = metaV3?.sorobanMeta();
    if (!sorobanMeta) return events;

    const contractEvents = sorobanMeta.events();
    for (const contractEvent of contractEvents) {
      try {
        const topics = contractEvent.body().v0().topics();
        const eventData = contractEvent.body().v0().data();

        if (!topics || topics.length === 0) continue;

        // The first topic is the event name (symbol)
        const eventName = scValToNative(topics[0]) as string;
        const data = scValToNative(eventData);

        events.push({ name: eventName, data, rawTopics: topics });
      } catch {
        // Skip events we can't parse
      }
    }
  } catch {
    // Ignore parse errors - some transactions may not have soroban events
  }

  return events;
}

interface ParsedEvent {
  name: string;
  data: unknown;
  rawTopics: xdr.ScVal[];
}

/**
 * Converts stroops (or raw bigint) to a formatted XLM string.
 * 1 XLM = 10_000_000 stroops
 */
function formatXlm(amount: bigint | number | string): string {
  return formatXLMFromStroops(amount);
}

/**
 * Fetches the full transaction from Soroban RPC and parses its events.
 */
async function getTransactionEvents(txHash: string): Promise<ParsedEvent[]> {
  try {
    const txResult = await sorobanServer.getTransaction(txHash);
    if (txResult.status !== rpc.Api.GetTransactionStatus.SUCCESS) return [];
    return parseContractEvents(
      txResult as rpc.Api.GetSuccessfulTransactionResponse,
    );
  } catch {
    return [];
  }
}

/**
 * Maps a parsed contract event to an Activity object.
 */
async function eventToActivity(
  event: ParsedEvent,
  time: string,
  txHash: string,
  getGroupById: (id: string) => Promise<{ name: string }>,
): Promise<Activity | null> {
  const { name, data } = event;

  switch (name) {
    case "created": {
      // Event data: (group_id, contribution_amount, total_members)
      const [groupId, contributionAmount] = Array.isArray(data)
        ? data
        : [null, null];
      if (!groupId) return null;
      const groupName = await getGroupName(String(groupId), getGroupById);
      return {
        type: "created",
        description: `Created ${groupName}`,
        amount: null,
        time,
        txHash,
        groupId: String(groupId),
        groupName,
      };
    }

    case "joined": {
      // Event data: (member, new_count) — group_id may be in topics[1]
      const [member] = Array.isArray(data) ? data : [null];
      // Try to extract group_id from topics index 1 if available
      const groupId =
        event.rawTopics.length > 1
          ? String(scValToNative(event.rawTopics[1]))
          : null;
      if (!groupId) {
        return {
          type: "joined",
          description: "Joined a Savings Group",
          amount: null,
          time,
          txHash,
        };
      }
      const groupName = await getGroupName(groupId, getGroupById);
      return {
        type: "joined",
        description: `Joined ${groupName}`,
        amount: null,
        time,
        txHash,
        groupId,
        groupName,
      };
    }

    case "contrib": {
      // Event data: (member, contribution_amount, current_round)
      const [, contributionAmount, currentRound] = Array.isArray(data)
        ? data
        : [];
      const groupId =
        event.rawTopics.length > 1
          ? String(scValToNative(event.rawTopics[1]))
          : null;
      const formattedAmount =
        contributionAmount != null ? formatXlm(contributionAmount) : null;

      if (!groupId) {
        return {
          type: "contribution",
          description: "Contributed to Savings Group",
          amount: formattedAmount,
          time,
          txHash,
        };
      }
      const groupName = await getGroupName(groupId, getGroupById);
      return {
        type: "contribution",
        description: `Contributed to ${groupName}`,
        amount: formattedAmount,
        time,
        txHash,
        groupId,
        groupName,
        roundNumber: currentRound != null ? Number(currentRound) : undefined,
      };
    }

    case "payout": {
      // Event data: (recipient, payout_amount, current_round)
      const [, payoutAmount, currentRound] = Array.isArray(data) ? data : [];
      const groupId =
        event.rawTopics.length > 1
          ? String(scValToNative(event.rawTopics[1]))
          : null;
      const formattedAmount =
        payoutAmount != null ? formatXlm(payoutAmount) : null;

      if (!groupId) {
        return {
          type: "payout",
          description: "Received payout",
          amount: formattedAmount,
          time,
          txHash,
        };
      }
      const groupName = await getGroupName(groupId, getGroupById);
      return {
        type: "payout",
        description: `Received payout from ${groupName}`,
        amount: formattedAmount,
        time,
        txHash,
        groupId,
        groupName,
        roundNumber: currentRound != null ? Number(currentRound) : undefined,
      };
    }

    case "round_end": {
      // Event data: current_round - 1 (the round that just ended)
      const roundNumber =
        typeof data === "number" || typeof data === "bigint"
          ? Number(data)
          : Array.isArray(data)
            ? Number(data[0])
            : null;
      const groupId =
        event.rawTopics.length > 1
          ? String(scValToNative(event.rawTopics[1]))
          : null;

      if (!groupId) {
        return {
          type: "round_end",
          description:
            roundNumber != null
              ? `Round ${roundNumber} completed`
              : "Round completed",
          amount: null,
          time,
          txHash,
          roundNumber: roundNumber ?? undefined,
        };
      }
      const groupName = await getGroupName(groupId, getGroupById);
      return {
        type: "round_end",
        description:
          roundNumber != null
            ? `Round ${roundNumber} completed in ${groupName}`
            : `Round completed in ${groupName}`,
        amount: null,
        time,
        txHash,
        groupId,
        groupName,
        roundNumber: roundNumber ?? undefined,
      };
    }

    default:
      return null;
  }
}

/**
 * Main function: fetches recent activity for a user.
 *
 * @param userAddress  The user's Stellar address
 * @param getGroupById A function from SavingsContractContext to look up group names
 */
export async function fetchRecentActivity(
  userAddress: string,
  getGroupById?: (id: string) => Promise<{ name: string }>,
): Promise<Activity[]> {
  if (!userAddress) return [];

  // Fallback resolver if no contract context is provided
  const resolveGroup = getGroupById ?? (async (id: string) => ({ name: id }));

  try {
    const response = await horizonServer
      .operations()
      .forAccount(userAddress)
      .limit(20)
      .order("desc")
      .call();

    const activities: Activity[] = [];

    // Process operations in parallel for speed, but limit concurrency
    const CONCURRENCY = 5;
    const records = response.records;

    for (let i = 0; i < records.length; i += CONCURRENCY) {
      const batch = records.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map((record) =>
          parseOperation(record, userAddress, resolveGroup),
        ),
      );
      for (const result of batchResults) {
        if (result) activities.push(result);
      }
    }

    return activities;
  } catch (error) {
    console.error("Error fetching horizon operations:", error);
    return [];
  }
}

async function parseOperation(
  record: Horizon.ServerApi.OperationRecord,
  userAddress: string,
  getGroupById: (id: string) => Promise<{ name: string }>,
): Promise<Activity | null> {
  const txHash = record.transaction_hash;
  const time = formatTime(record.created_at);

  if (record.type === "invoke_host_function") {
    // Fetch full transaction from Soroban RPC and parse events
    if (txHash) {
      const events = await getTransactionEvents(txHash);
      console.log("Events for", txHash, events);

      if (events.length > 0) {
        // Use the first recognized event from our contract
        for (const event of events) {
          const activity = await eventToActivity(
            event,
            time,
            txHash,
            getGroupById,
          );
          if (activity) return activity;
        }
      }
    }

    // Fallback: try to infer from legacy Horizon field (rarely populated)
    const op = record as unknown as { function?: string };
    if (op.function) {
      return legacyFunctionToActivity(op.function, time, txHash);
    }

    // No event data and no function name — skip entirely (don't show "Contract Interaction")
    // Instead of: return null
    return {
      type: "created",
      description: "Contract Interaction",
      amount: null,
      time,
      txHash,
    };
  }

  // Handle native XLM payment operations
  if (record.type === "payment") {
    const op = record as Horizon.ServerApi.PaymentOperationRecord;
    if (op.asset_type !== "native") return null; // Only care about XLM

    const isRecipient = op.to === userAddress;
    // Horizon returns the raw on-chain amount, which can be smaller than
    // 0.01 XLM (e.g. `0.004`). Pass Stellar's max precision (7 decimal
    // digits, matching the stroop denominator) so small payments don't
    // get rounded away to "0 XLM" by the 2-decimal summary default.
    const formattedAmount = formatXLM(parseFloat(op.amount), 7);

    if (isRecipient) {
      return {
        type: "payout",
        description: `Received payment from ${shortenAddress(op.from)}`,
        amount: formattedAmount,
        time,
        txHash,
      };
    } else {
      return {
        type: "contribution",
        description: `Sent payment to ${shortenAddress(op.to)}`,
        amount: formattedAmount,
        time,
        txHash,
      };
    }
  }

  return null;
}

/** Legacy fallback for when Horizon exposes the function field (rare). */
function legacyFunctionToActivity(
  funcName: string,
  time: string,
  txHash: string,
): Activity | null {
  if (funcName === "create_group") {
    return {
      type: "created",
      description: "Created a new Savings Group",
      amount: null,
      time,
      txHash,
    };
  }
  if (funcName === "join_group") {
    return {
      type: "joined",
      description: "Joined a Savings Group",
      amount: null,
      time,
      txHash,
    };
  }
  if (funcName === "contribute") {
    return {
      type: "contribution",
      description: "Contributed to Savings Group",
      amount: null,
      time,
      txHash,
    };
  }
  if (funcName === "payout" || funcName === "distribute") {
    return {
      type: "payout",
      description: "Received payout from Savings Group",
      amount: null,
      time,
      txHash,
    };
  }
  return null;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  }

  return formatDate(date);
}

function shortenAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
