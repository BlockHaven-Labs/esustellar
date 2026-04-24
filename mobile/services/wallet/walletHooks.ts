import { useState, useCallback, useEffect } from 'react';
import { WalletConnectionService, WalletConnection, WalletConnectionError } from './connectWallet';
import { WalletConnectionState, WalletConnectionStatus, WalletConnectionProgress } from './walletTypes';

export interface UseWalletConnectionReturn {
  connection: WalletConnection | null;
  state: WalletConnectionState;
  progress: WalletConnectionProgress;
  connect: (walletId: string) => Promise<WalletConnection>;
  disconnect: () => void;
  clearError: () => void;
  isWalletAvailable: (walletId: string) => boolean;
}

export const useWalletConnection = (): UseWalletConnectionReturn => {
  const [connection, setConnection] = useState<WalletConnection | null>(null);
  const [state, setState] = useState<WalletConnectionState>({
    isLoading: false,
    isConnected: false,
    error: null,
    walletId: null,
    publicKey: null,
  });
  const [progress, setProgress] = useState<WalletConnectionProgress>({
    status: 'idle',
    message: '',
  });

  const walletService = WalletConnectionService.getInstance();

  useEffect(() => {
    const savedConnection = walletService.getCurrentConnection();
    if (savedConnection) {
      setConnection(savedConnection);
      setState({
        isLoading: false,
        isConnected: true,
        error: null,
        walletId: savedConnection.walletType,
        publicKey: savedConnection.publicKey,
      });
      setProgress({
        status: 'connected',
        message: `Connected to ${savedConnection.walletType}`,
      });
    }
  }, []);

  const updateProgress = useCallback((status: WalletConnectionStatus, message: string, progress?: number) => {
    setProgress({ status, message, progress });
  }, []);

  const updateState = useCallback((newState: Partial<WalletConnectionState>) => {
    setState(prev => ({ ...prev, ...newState }));
  }, []);

  const connect = useCallback(async (walletId: string): Promise<WalletConnection> => {
    try {
      updateState({ isLoading: true, error: null });
      updateProgress('connecting', `Connecting to ${walletId}...`, 10);

      const { getWalletProvider } = await import('./walletProviders');
      const provider = getWalletProvider(walletId);
      
      if (!provider) {
        throw new WalletConnectionError('WALLET_NOT_FOUND', `Wallet ${walletId} not found`, walletId);
      }

      updateProgress('connecting', `Opening ${provider.name}...`, 30);

      const connection = await walletService.connectWallet(provider);
      
      updateProgress('connecting', 'Finalizing connection...', 80);
      
      setConnection(connection);
      updateState({
        isLoading: false,
        isConnected: true,
        error: null,
        walletId: connection.walletType,
        publicKey: connection.publicKey,
      });
      
      updateProgress('connected', `Successfully connected to ${provider.name}`, 100);
      
      return connection;
    } catch (error) {
      const errorMessage = error instanceof WalletConnectionError 
        ? error.message 
        : 'Failed to connect wallet';
      
      updateState({
        isLoading: false,
        isConnected: false,
        error: errorMessage,
        walletId: null,
        publicKey: null,
      });
      
      updateProgress('error', errorMessage);
      
      throw error;
    }
  }, [updateProgress, updateState]);

  const disconnect = useCallback(() => {
    walletService.disconnect();
    setConnection(null);
    updateState({
      isLoading: false,
      isConnected: false,
      error: null,
      walletId: null,
      publicKey: null,
    });
    updateProgress('disconnected', 'Wallet disconnected');
  }, [updateProgress, updateState]);

  const clearError = useCallback(() => {
    updateState({ error: null });
    if (state.error) {
      updateProgress('idle', '');
    }
  }, [state.error, updateProgress, updateState]);

  const isWalletAvailable = useCallback((walletId: string): boolean => {
    if (typeof window === 'undefined') return false;
    
    switch (walletId) {
      case 'albedo':
        return !!window.albedo;
      case 'freighter':
        return !!window.freighter;
      case 'lobstr':
        return !!window.lobstr;
      default:
        return false;
    }
  }, []);

  return {
    connection,
    state,
    progress,
    connect,
    disconnect,
    clearError,
    isWalletAvailable,
  };
};
