/**
 * Contract Event Listener
 *
 * Polls the Soroban RPC for ledger events emitted by the savings and
 * registry contracts, then dispatches typed events to registered
 * subscribers so the UI can update in real-time.
 *
 * Soroban does not expose a WebSocket push channel; polling is the
 * standard approach on the current protocol version.
 */

import { NETWORK_CONFIGS } from "../stellar/network";

// ─── Event types ────────────────────────────────────────────────────────────

export type ContractEventType =
  | "group_created"
  | "member_joined"
  | "contribution_made"
  | "payout_distributed"
  | "round_ended"
  | "group_registered";

export interface ContractEvent {
  type: ContractEventType;
  contractId: string;
  ledger: number;
  timestamp: number;
  /** Raw payload decoded from the event's topic/value XDR. */
  data: Record<string, unknown>;
}

export type EventHandler = (event: ContractEvent) => void;

// Internal mapping from on-chain symbol names to SDK event types.
const TOPIC_MAP: Record<string, ContractEventType> = {
  created: "group_created",
  joined: "member_joined",
  contrib: "contribution_made",
  payout: "payout_distributed",
  round_end: "round_ended",
  reg_group: "group_registered",
};

// ─── Listener config ────────────────────────────────────────────────────────

export interface EventListenerConfig {
  /** RPC endpoint, e.g. "https://soroban-testnet.stellar.org". */
  rpcUrl: string;
  /** Network passphrase — needed to build filter queries. */
  networkPassphrase: string;
  /** Contract IDs to watch (savings and/or registry). */
  contractIds: string[];
  /** How often to poll for new events, in milliseconds. Default: 5000. */
  pollIntervalMs?: number;
  /** Maximum number of consecutive fetch failures before the listener pauses. Default: 5. */
  maxRetries?: number;
}

// ─── ContractEventListener ──────────────────────────────────────────────────

/**
 * Polls Soroban RPC for contract events and dispatches them to subscribers.
 *
 * @example
 * ```ts
 * const listener = new ContractEventListener({
 *   rpcUrl: "https://soroban-testnet.stellar.org",
 *   networkPassphrase: "Test SDF Network ; September 2015",
 *   contractIds: [SAVINGS_CONTRACT_ID],
 * });
 *
 * const unsub = listener.on("contribution_made", (event) => {
 *   console.log("New contribution:", event.data);
 *   // Update UI state here
 * });
 *
 * listener.start();
 *
 * // When the screen unmounts:
 * unsub();
 * listener.stop();
 * ```
 */
export class ContractEventListener {
  private config: Required<EventListenerConfig>;
  private handlers: Map<ContractEventType, Set<EventHandler>> = new Map();
  private wildcardHandlers: Set<EventHandler> = new Set();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastSeenLedger: number = 0;
  private consecutiveFailures: number = 0;
  private running: boolean = false;

  constructor(config: EventListenerConfig) {
    this.config = {
      pollIntervalMs: 5_000,
      maxRetries: 5,
      ...config,
    };
  }

  // ── Subscription ────────────────────────────────────────────────────────

  /**
   * Subscribe to a specific event type.
   * @returns An unsubscribe function — call it to remove the handler.
   */
  on(eventType: ContractEventType, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
    return () => this.handlers.get(eventType)?.delete(handler);
  }

  /**
   * Subscribe to **all** event types from the watched contracts.
   * @returns An unsubscribe function.
   */
  onAny(handler: EventHandler): () => void {
    this.wildcardHandlers.add(handler);
    return () => this.wildcardHandlers.delete(handler);
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────

  /** Starts polling. Safe to call multiple times — idempotent. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.consecutiveFailures = 0;
    // Immediate first fetch, then recurring interval.
    this.poll();
    this.pollTimer = setInterval(() => this.poll(), this.config.pollIntervalMs);
  }

  /** Stops polling and clears the interval. */
  stop(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.running = false;
  }

  /** Returns true if the listener is currently polling. */
  isRunning(): boolean {
    return this.running;
  }

  // ── Polling ─────────────────────────────────────────────────────────────

  private async poll(): Promise<void> {
    try {
      const events = await this.fetchEvents();
      this.consecutiveFailures = 0;
      events.forEach((e) => this.dispatch(e));
    } catch (err) {
      this.consecutiveFailures++;
      console.warn(
        `[EventListener] Fetch failed (${this.consecutiveFailures}/${this.config.maxRetries}):`,
        err,
      );
      if (this.consecutiveFailures >= this.config.maxRetries) {
        console.error(
          "[EventListener] Max retries reached — pausing. Call start() to resume.",
        );
        this.stop();
      }
    }
  }

  /**
   * Fetches new contract events since `lastSeenLedger` from the RPC.
   * Returns a parsed array of `ContractEvent` objects.
   */
  private async fetchEvents(): Promise<ContractEvent[]> {
    const body = {
      jsonrpc: "2.0",
      id: 1,
      method: "getEvents",
      params: {
        startLedger: this.lastSeenLedger > 0 ? this.lastSeenLedger + 1 : undefined,
        filters: this.config.contractIds.map((id) => ({
          type: "contract",
          contractIds: [id],
        })),
        pagination: { limit: 100 },
      },
    };

    const response = await fetch(this.config.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`RPC HTTP error ${response.status}`);
    }

    const json = await response.json();

    if (json.error) {
      throw new Error(`RPC error: ${JSON.stringify(json.error)}`);
    }

    const rawEvents: any[] = json.result?.events ?? [];
    if (rawEvents.length === 0) return [];

    const parsed = rawEvents.map((e) => this.parseEvent(e)).filter(Boolean) as ContractEvent[];

    // Advance the ledger cursor so the next poll only fetches new events.
    const maxLedger = Math.max(...rawEvents.map((e) => Number(e.ledger ?? 0)));
    if (maxLedger > this.lastSeenLedger) {
      this.lastSeenLedger = maxLedger;
    }

    return parsed;
  }

  private parseEvent(raw: any): ContractEvent | null {
    try {
      // The first topic element is a symbol — maps to our event type.
      const topicSymbol: string = raw.topic?.[0]?.sym ?? raw.topic?.[0] ?? "";
      const eventType = TOPIC_MAP[topicSymbol];
      if (!eventType) return null;

      return {
        type: eventType,
        contractId: raw.contractId ?? raw.contract_id ?? "",
        ledger: Number(raw.ledger ?? 0),
        timestamp: Number(raw.ledgerClosedAt ?? raw.timestamp ?? Date.now() / 1000),
        data: raw.value ?? {},
      };
    } catch {
      return null;
    }
  }

  // ── Dispatch ────────────────────────────────────────────────────────────

  private dispatch(event: ContractEvent): void {
    this.handlers.get(event.type)?.forEach((h) => h(event));
    this.wildcardHandlers.forEach((h) => h(event));
  }
}

// ─── Factory helper ─────────────────────────────────────────────────────────

/**
 * Creates a `ContractEventListener` pre-configured for the given network.
 *
 * @example
 * ```ts
 * const listener = createEventListener("testnet", [SAVINGS_CONTRACT_ID]);
 * listener.on("contribution_made", updateContributionUI);
 * listener.start();
 * ```
 */
export function createEventListener(
  network: "testnet" | "mainnet",
  contractIds: string[],
  options: Partial<Pick<EventListenerConfig, "pollIntervalMs" | "maxRetries">> = {},
): ContractEventListener {
  const { rpcUrl, networkPassphrase } = NETWORK_CONFIGS[network];
  return new ContractEventListener({
    rpcUrl,
    networkPassphrase,
    contractIds,
    ...options,
  });
}
