export interface WalletConnectionState {
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  walletId: string | null;
  publicKey: string | null;
}

export interface WalletUIState {
  showWalletList: boolean;
  selectedWallet: string | null;
  connectingWallet: string | null;
}

export type WalletConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected';

export interface WalletConnectionProgress {
  status: WalletConnectionStatus;
  message: string;
  progress?: number;
}
