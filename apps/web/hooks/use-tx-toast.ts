"use client";

import * as React from "react";
import { toast } from "sonner";
import { classifyTxError } from "@/lib/tx-error";
import { logger } from "@/lib/logger";

export interface TxToastMessages {
  /** Shown while the transaction is pending (signing + submission + confirmation). */
  pending: string;
  /** Shown once the transaction is confirmed successfully. */
  success: string;
  /** Optional label used in logging, e.g. "join_group". Defaults to "transaction". */
  label?: string;
}

export interface UseTxToastResult {
  /** True while a transaction submitted through submitTx is in flight. */
  isSubmitting: boolean;
  /**
   * Wraps an async transaction-submitting call with a shared pending →
   * success/failed toast. Returns the resolved value on success, or
   * undefined if the transaction failed (the error is already surfaced
   * via toast and returned for callers that need it).
   */
  submitTx: <T>(
    fn: () => Promise<T>,
    messages: TxToastMessages,
  ) => Promise<{ data?: T; error?: ReturnType<typeof classifyTxError> }>;
}

/**
 * Single shared hook for surfacing pending/success/failed Soroban
 * transaction state, used by every transaction-submitting flow (group
 * creation, join, contribute, payout, etc). Distinguishes a rejected
 * wallet signature from a network/contract failure in the message shown.
 */
export function useTxToast(): UseTxToastResult {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const submitTx = React.useCallback(
    async <T,>(fn: () => Promise<T>, messages: TxToastMessages) => {
      const label = messages.label ?? "transaction";
      const id = toast.loading(messages.pending);
      setIsSubmitting(true);

      try {
        const data = await fn();
        toast.success(messages.success, { id });
        return { data };
      } catch (err) {
        const classified = classifyTxError(err);
        logger.error(`${label} failed`, {
          kind: classified.kind,
          error: err instanceof Error ? err.message : String(err),
        });

        // A rejected signature is an intentional user action, not a
        // failure worth alarming over — keep it low-key.
        if (classified.kind === "rejected") {
          toast.message(classified.message, { id });
        } else {
          toast.error(classified.message, { id });
        }

        return { error: classified };
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  return { isSubmitting, submitTx };
}
