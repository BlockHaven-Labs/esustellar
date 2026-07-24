/**
 * Offline Transaction Signing Service
 *
 * Allows Stellar/Soroban transactions to be constructed and signed
 * without a network connection. Signed transactions are persisted
 * locally via AsyncStorage and broadcast automatically when the
 * device comes back online.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

// ─── Types ───────────────────────────────────────────────────────────────────

export type QueuedTxStatus = "pending" | "broadcasting" | "confirmed" | "failed";

export interface QueuedTransaction {
  /** UUID assigned at construction time. */
  id: string;
  /** Signed transaction XDR ready to broadcast. */
  signedXdr: string;
  /** Human-readable description shown in the queue UI. */
  description: string;
  /** RPC endpoint to broadcast to when online. */
  rpcUrl: string;
  /** Network passphrase — must match the network the tx was signed for. */
  networkPassphrase: string;
  status: QueuedTxStatus;
  /** Unix timestamp (ms) when the tx was added to the queue. */
  queuedAt: number;
  /** Unix timestamp (ms) of the last broadcast attempt, if any. */
  lastAttemptAt?: number;
  /** Error message from the last failed broadcast attempt. */
  lastError?: string;
  /** Number of broadcast attempts made. */
  attempts: number;
}

export interface BroadcastResult {
  id: string;
  success: boolean;
  txHash?: string;
  error?: string;
}

const STORAGE_KEY = "esustellar_offline_tx_queue";

// ─── OfflineSigningService ────────────────────────────────────────────────────

/**
 * Manages a persistent queue of signed but un-broadcast Stellar transactions.
 *
 * @example
 * ```ts
 * const svc = OfflineSigningService.getInstance();
 *
 * // Sign a transaction offline (no network needed):
 * const id = await svc.enqueue({
 *   signedXdr: "AAAAAgAAAA...",
 *   description: "Contribute to Lagos Ajo Circle",
 *   rpcUrl: "https://soroban-testnet.stellar.org",
 *   networkPassphrase: "Test SDF Network ; September 2015",
 * });
 *
 * // On reconnect — called automatically if you call startAutoFlush():
 * await svc.flush();
 * ```
 */
export class OfflineSigningService {
  private static instance: OfflineSigningService;
  private queue: Map<string, QueuedTransaction> = new Map();
  private loaded = false;
  private unsubscribeNetInfo: (() => void) | null = null;
  private autoFlushing = false;

  private constructor() {}

  static getInstance(): OfflineSigningService {
    if (!OfflineSigningService.instance) {
      OfflineSigningService.instance = new OfflineSigningService();
    }
    return OfflineSigningService.instance;
  }

  // ── Queue management ─────────────────────────────────────────────────────

  /**
   * Adds a signed transaction XDR to the persistent queue.
   * @returns The assigned queue ID.
   */
  async enqueue(params: {
    signedXdr: string;
    description: string;
    rpcUrl: string;
    networkPassphrase: string;
  }): Promise<string> {
    await this.ensureLoaded();

    const id = this.generateId();
    const tx: QueuedTransaction = {
      id,
      signedXdr: params.signedXdr,
      description: params.description,
      rpcUrl: params.rpcUrl,
      networkPassphrase: params.networkPassphrase,
      status: "pending",
      queuedAt: Date.now(),
      attempts: 0,
    };

    this.queue.set(id, tx);
    await this.persist();
    return id;
  }

  /** Returns all queued transactions, newest first. */
  async getQueue(): Promise<QueuedTransaction[]> {
    await this.ensureLoaded();
    return Array.from(this.queue.values()).sort((a, b) => b.queuedAt - a.queuedAt);
  }

  /** Returns only transactions with `pending` or `failed` status. */
  async getPendingQueue(): Promise<QueuedTransaction[]> {
    const all = await this.getQueue();
    return all.filter((tx) => tx.status === "pending" || tx.status === "failed");
  }

  /** Removes a transaction from the queue by ID. */
  async remove(id: string): Promise<void> {
    await this.ensureLoaded();
    this.queue.delete(id);
    await this.persist();
  }

  /** Clears all confirmed and failed transactions, keeping only pending. */
  async clearCompleted(): Promise<void> {
    await this.ensureLoaded();
    for (const [id, tx] of this.queue) {
      if (tx.status === "confirmed" || tx.status === "failed") {
        this.queue.delete(id);
      }
    }
    await this.persist();
  }

  // ── Broadcast ─────────────────────────────────────────────────────────────

  /**
   * Attempts to broadcast all pending/failed transactions.
   * Skips if offline. Returns one `BroadcastResult` per transaction attempted.
   */
  async flush(): Promise<BroadcastResult[]> {
    await this.ensureLoaded();

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return [];
    }

    const pending = await this.getPendingQueue();
    const results: BroadcastResult[] = [];

    for (const tx of pending) {
      const result = await this.broadcastOne(tx);
      results.push(result);
    }

    await this.persist();
    return results;
  }

  private async broadcastOne(tx: QueuedTransaction): Promise<BroadcastResult> {
    this.queue.set(tx.id, {
      ...tx,
      status: "broadcasting",
      lastAttemptAt: Date.now(),
      attempts: tx.attempts + 1,
    });

    try {
      const response = await fetch(tx.rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "sendTransaction",
          params: { transaction: tx.signedXdr },
        }),
      });

      const json = await response.json();

      if (json.error) {
        throw new Error(JSON.stringify(json.error));
      }

      const txHash: string = json.result?.hash ?? json.result?.id ?? "";

      this.queue.set(tx.id, {
        ...this.queue.get(tx.id)!,
        status: "confirmed",
      });

      return { id: tx.id, success: true, txHash };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      this.queue.set(tx.id, {
        ...this.queue.get(tx.id)!,
        status: "failed",
        lastError: errorMessage,
      });

      return { id: tx.id, success: false, error: errorMessage };
    }
  }

  // ── Auto-flush on reconnect ───────────────────────────────────────────────

  /**
   * Subscribes to network state changes and automatically flushes the
   * queue whenever the device comes back online.
   * Safe to call multiple times — idempotent.
   */
  startAutoFlush(): void {
    if (this.autoFlushing) return;
    this.autoFlushing = true;

    this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        this.flush().catch((err) =>
          console.warn("[OfflineSigning] Auto-flush error:", err),
        );
      }
    });
  }

  /** Stops the auto-flush listener. */
  stopAutoFlush(): void {
    this.unsubscribeNetInfo?.();
    this.unsubscribeNetInfo = null;
    this.autoFlushing = false;
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const items: QueuedTransaction[] = JSON.parse(raw);
        this.queue = new Map(items.map((tx) => [tx.id, tx]));
      }
    } catch {
      // Corrupt storage — start fresh
      this.queue = new Map();
    }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    try {
      const items = Array.from(this.queue.values());
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.warn("[OfflineSigning] Failed to persist queue:", err);
    }
  }

  private generateId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  /** Resets the singleton — intended for testing only. */
  static _reset(): void {
    OfflineSigningService.instance = undefined as any;
  }
}
