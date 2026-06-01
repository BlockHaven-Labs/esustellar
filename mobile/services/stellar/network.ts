/**
 * Stellar Network Switching Service
 *
 * Provides runtime switching between Testnet and Mainnet with
 * configuration for all network-dependent endpoints.
 */

export type StellarNetwork = "testnet" | "mainnet";

export interface NetworkConfig {
  network: StellarNetwork;
  rpcUrl: string;
  horizonUrl: string;
  networkPassphrase: string;
  /** Human-readable label shown in the UI. */
  label: string;
}

export const NETWORK_CONFIGS: Record<StellarNetwork, NetworkConfig> = {
  testnet: {
    network: "testnet",
    rpcUrl: "https://soroban-testnet.stellar.org",
    horizonUrl: "https://horizon-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
    label: "Testnet",
  },
  mainnet: {
    network: "mainnet",
    rpcUrl: "https://soroban.stellar.org",
    horizonUrl: "https://horizon.stellar.org",
    networkPassphrase: "Public Global Stellar Network ; September 2015",
    label: "Mainnet",
  },
};

export type NetworkSwitchListener = (config: NetworkConfig) => void;

/**
 * Singleton service that holds the active network configuration and
 * notifies registered listeners when the network changes.
 *
 * Use `NetworkService.getInstance()` to get the shared instance.
 * Persist the choice via `useNetworkStore` (Zustand + AsyncStorage).
 */
export class NetworkService {
  private static instance: NetworkService;
  private activeConfig: NetworkConfig;
  private listeners: Set<NetworkSwitchListener> = new Set();

  private constructor(initialNetwork: StellarNetwork = "testnet") {
    this.activeConfig = NETWORK_CONFIGS[initialNetwork];
  }

  static getInstance(initialNetwork?: StellarNetwork): NetworkService {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService(initialNetwork);
    }
    return NetworkService.instance;
  }

  /** Returns the full configuration for the currently active network. */
  getActiveConfig(): NetworkConfig {
    return this.activeConfig;
  }

  /** Returns the currently active network name. */
  getActiveNetwork(): StellarNetwork {
    return this.activeConfig.network;
  }

  /** Returns true when the app is connected to Testnet. */
  isTestnet(): boolean {
    return this.activeConfig.network === "testnet";
  }

  /** Returns true when the app is connected to Mainnet. */
  isMainnet(): boolean {
    return this.activeConfig.network === "mainnet";
  }

  /**
   * Switches the active network and notifies all listeners.
   * @returns The new active `NetworkConfig`.
   */
  switchNetwork(network: StellarNetwork): NetworkConfig {
    if (network === this.activeConfig.network) {
      return this.activeConfig;
    }

    this.activeConfig = NETWORK_CONFIGS[network];
    this.notifyListeners();
    return this.activeConfig;
  }

  /**
   * Registers a callback that fires whenever the network changes.
   * @returns An unsubscribe function.
   */
  onNetworkChange(listener: NetworkSwitchListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) => l(this.activeConfig));
  }

  /** Resets the singleton — intended for testing only. */
  static _reset(): void {
    NetworkService.instance = undefined as any;
  }
}

/** Convenience accessor for the current RPC URL. */
export function getActiveRpcUrl(): string {
  return NetworkService.getInstance().getActiveConfig().rpcUrl;
}

/** Convenience accessor for the current Horizon URL. */
export function getActiveHorizonUrl(): string {
  return NetworkService.getInstance().getActiveConfig().horizonUrl;
}

/** Convenience accessor for the current network passphrase. */
export function getActiveNetworkPassphrase(): string {
  return NetworkService.getInstance().getActiveConfig().networkPassphrase;
}
