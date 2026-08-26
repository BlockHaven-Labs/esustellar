export type TxErrorKind = "rejected" | "network" | "contract" | "unknown";

export interface ClassifiedTxError {
  kind: TxErrorKind;
  message: string;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
}

/**
 * Classifies a thrown transaction error into a user-facing category and
 * message. Signature rejection is distinguished from RPC/network failure
 * and from a contract-level failure (simulation error, non-SUCCESS status,
 * etc.) so the toast can show the right message and (for network/contract
 * failures) offer a retry, rather than one generic "transaction failed".
 */
export function classifyTxError(error: unknown): ClassifiedTxError {
  const message = getErrorMessage(error);
  const lower = message.toLowerCase();

  if (
    lower.includes("rejected") ||
    lower.includes("declined") ||
    lower.includes("denied") ||
    lower.includes("user cancelled") ||
    lower.includes("user canceled")
  ) {
    return { kind: "rejected", message: "Signature request was rejected." };
  }

  if (
    lower.includes("wallet not connected") ||
    lower.includes("wrong network")
  ) {
    return { kind: "rejected", message: message || "Wallet is not ready to sign." };
  }

  if (
    lower.includes("failed to fetch") ||
    lower.includes("network") ||
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("econnrefused") ||
    lower.includes("fetch failed")
  ) {
    return {
      kind: "network",
      message: "Couldn't reach the Stellar network. Check your connection and try again.",
    };
  }

  if (
    lower.includes("simulation") ||
    lower.includes("transaction failed") ||
    lower.includes("result: ") ||
    lower.includes("contract, #") ||
    lower.includes("hosterror")
  ) {
    return {
      kind: "contract",
      message: message || "The contract rejected this transaction.",
    };
  }

  return {
    kind: "unknown",
    message: message || "Something went wrong submitting the transaction.",
  };
}
