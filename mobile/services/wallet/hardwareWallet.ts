/**
 * Hardware Wallet Support Service
 *
 * Provides an abstraction layer for connecting to Ledger hardware wallets
 * via Bluetooth (React Native BLE) or USB and signing Stellar/Soroban
 * transactions with the Stellar app installed on the device.
 *
 * This is an experimental/future feature. The implementation uses the
 * Ledger device transport libraries; install the peer dependency when
 * enabling this feature:
 *
 *   npm install @ledgerhq/react-native-hw-transport-ble
 *   # or for USB:
 *   npm install @ledgerhq/react-native-hid
 *   npm install @ledgerhq/hw-app-str
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type HardwareWalletTransport = "ble" | "usb";

export type HardwareWalletStatus =
  | "idle"
  | "scanning"
  | "connecting"
  | "connected"
  | "signing"
  | "disconnected"
  | "error";

export interface HardwareWalletDevice {
  id: string;
  name: string;
  transport: HardwareWalletTransport;
}

export interface HardwareWalletState {
  status: HardwareWalletStatus;
  device: HardwareWalletDevice | null;
  publicKey: string | null;
  error: string | null;
}

export type HardwareWalletStateListener = (state: HardwareWalletState) => void;

// ─── Error class ─────────────────────────────────────────────────────────────

export class HardwareWalletError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "TRANSPORT_NOT_AVAILABLE"
      | "SCAN_FAILED"
      | "CONNECTION_FAILED"
      | "DEVICE_LOCKED"
      | "STELLAR_APP_NOT_OPEN"
      | "UNSUPPORTED_DEVICE"
      | "SIGNING_FAILED"
      | "DISCONNECTED",
  ) {
    super(message);
    this.name = "HardwareWalletError";
  }
}

// ─── HardwareWalletService ────────────────────────────────────────────────────

/**
 * Manages the full hardware wallet lifecycle: scanning, connection,
 * public key retrieval, and transaction signing.
 *
 * @example
 * ```ts
 * const hw = HardwareWalletService.getInstance();
 *
 * // Listen for state changes (use in a React component via useEffect)
 * const unsub = hw.onStateChange((state) => {
 *   if (state.status === 'connected') setPublicKey(state.publicKey);
 *   if (state.status === 'error') showError(state.error);
 * });
 *
 * // Scan for BLE devices
 * const devices = await hw.scan('ble');
 *
 * // Connect and get the Stellar public key
 * await hw.connect(devices[0]);
 *
 * // Sign a transaction XDR
 * const signedXdr = await hw.signTransaction(unsignedXdr, "Test SDF Network ; September 2015");
 *
 * // Clean up
 * unsub();
 * await hw.disconnect();
 * ```
 */
export class HardwareWalletService {
  private static instance: HardwareWalletService;

  private state: HardwareWalletState = {
    status: "idle",
    device: null,
    publicKey: null,
    error: null,
  };

  private listeners: Set<HardwareWalletStateListener> = new Set();

  private constructor() {}

  static getInstance(): HardwareWalletService {
    if (!HardwareWalletService.instance) {
      HardwareWalletService.instance = new HardwareWalletService();
    }
    return HardwareWalletService.instance;
  }

  // ── State ─────────────────────────────────────────────────────────────────

  getState(): HardwareWalletState {
    return { ...this.state };
  }

  onStateChange(listener: HardwareWalletStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(patch: Partial<HardwareWalletState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l(this.state));
  }

  // ── Scanning ──────────────────────────────────────────────────────────────

  /**
   * Scans for available hardware wallet devices over BLE or USB.
   * BLE scanning times out after `timeoutMs` (default 10 s).
   *
   * @throws {HardwareWalletError} When the transport is unavailable or scanning fails.
   */
  async scan(
    transport: HardwareWalletTransport = "ble",
    timeoutMs = 10_000,
  ): Promise<HardwareWalletDevice[]> {
    this.setState({ status: "scanning", error: null });

    try {
      const devices = await this.discoverDevices(transport, timeoutMs);
      this.setState({ status: "idle" });
      return devices;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.setState({ status: "error", error: message });
      throw new HardwareWalletError(message, "SCAN_FAILED");
    }
  }

  // ── Connection ────────────────────────────────────────────────────────────

  /**
   * Connects to a hardware wallet device and retrieves the first Stellar
   * account public key (derivation path 44'/148'/0').
   *
   * @throws {HardwareWalletError} When connection fails, device is locked,
   *   or the Stellar app is not open on the device.
   */
  async connect(device: HardwareWalletDevice): Promise<string> {
    this.setState({ status: "connecting", device, error: null });

    try {
      const publicKey = await this.openTransportAndGetKey(device);
      this.setState({ status: "connected", publicKey });
      return publicKey;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const code = this.classifyConnectionError(message);
      this.setState({ status: "error", error: message });
      throw new HardwareWalletError(message, code);
    }
  }

  // ── Signing ───────────────────────────────────────────────────────────────

  /**
   * Signs a Stellar transaction XDR with the connected hardware wallet.
   * The user must confirm the transaction on the device screen.
   *
   * @param unsignedXdr - Base64-encoded transaction XDR.
   * @param networkPassphrase - Must match the network the transaction targets.
   * @returns Signed transaction XDR ready to broadcast.
   *
   * @throws {HardwareWalletError} When no device is connected, device is locked,
   *   or signing is rejected.
   */
  async signTransaction(
    unsignedXdr: string,
    networkPassphrase: string,
  ): Promise<string> {
    if (this.state.status !== "connected" || !this.state.device) {
      throw new HardwareWalletError(
        "No hardware wallet connected. Call connect() first.",
        "DISCONNECTED",
      );
    }

    this.setState({ status: "signing" });

    try {
      const signedXdr = await this.signWithDevice(
        this.state.device,
        unsignedXdr,
        networkPassphrase,
      );
      this.setState({ status: "connected" });
      return signedXdr;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.setState({ status: "error", error: message });
      throw new HardwareWalletError(message, "SIGNING_FAILED");
    }
  }

  // ── Disconnect ────────────────────────────────────────────────────────────

  /** Closes the transport connection and resets state. */
  async disconnect(): Promise<void> {
    this.setState({
      status: "disconnected",
      device: null,
      publicKey: null,
      error: null,
    });
  }

  // ── Private transport helpers ─────────────────────────────────────────────

  /**
   * Platform-specific device discovery.
   *
   * To enable real BLE scanning install:
   *   @ledgerhq/react-native-hw-transport-ble
   * and replace this stub with:
   *   import TransportBLE from '@ledgerhq/react-native-hw-transport-ble';
   *   const sub = TransportBLE.listen({ ... });
   */
  private async discoverDevices(
    transport: HardwareWalletTransport,
    timeoutMs: number,
  ): Promise<HardwareWalletDevice[]> {
    // Stub — replace with real BLE/USB transport scanning.
    await new Promise((r) => setTimeout(r, Math.min(timeoutMs, 500)));

    if (transport === "usb") {
      // USB enumeration is synchronous on most platforms.
      return [
        { id: "usb-001", name: "Ledger Nano X (USB)", transport: "usb" },
      ];
    }

    // BLE stub — in production this would stream discovered devices.
    return [
      { id: "ble-001", name: "Ledger Nano X", transport: "ble" },
      { id: "ble-002", name: "Ledger Nano S Plus", transport: "ble" },
    ];
  }

  /**
   * Opens a transport to the device and reads the Stellar public key.
   *
   * Replace the stub with:
   *   import Str from '@ledgerhq/hw-app-str';
   *   const transport = await TransportBLE.open(device.id);
   *   const str = new Str(transport);
   *   const { publicKey } = await str.getPublicKey("44'/148'/0'");
   */
  private async openTransportAndGetKey(
    device: HardwareWalletDevice,
  ): Promise<string> {
    // Stub — opens the transport and returns the Stellar public key.
    await new Promise((r) => setTimeout(r, 300));

    if (device.id.startsWith("unsupported")) {
      throw new Error("Stellar app not found on device");
    }

    // Return a placeholder public key for the stub.
    return "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGKFYQDXGZJPMDCQOBD4TK";
  }

  private async signWithDevice(
    device: HardwareWalletDevice,
    unsignedXdr: string,
    _networkPassphrase: string,
  ): Promise<string> {
    // Stub — replace with real Ledger Stellar app signing:
    //   const str = new Str(transport);
    //   const { signature } = await str.signTransaction("44'/148'/0'", Buffer.from(unsignedXdr, 'base64'));
    //   Then re-attach the signature to the transaction envelope.
    await new Promise((r) => setTimeout(r, 500));
    // Return the XDR unchanged in the stub (signing adds an envelope signature in production).
    return unsignedXdr;
  }

  private classifyConnectionError(
    message: string,
  ): HardwareWalletError["code"] {
    const lc = message.toLowerCase();
    if (lc.includes("locked")) return "DEVICE_LOCKED";
    if (lc.includes("stellar app") || lc.includes("not found")) return "STELLAR_APP_NOT_OPEN";
    if (lc.includes("unsupported")) return "UNSUPPORTED_DEVICE";
    if (lc.includes("transport")) return "TRANSPORT_NOT_AVAILABLE";
    return "CONNECTION_FAILED";
  }

  /** Resets the singleton — intended for testing only. */
  static _reset(): void {
    HardwareWalletService.instance = undefined as any;
  }
}
