import { WalletProvider } from './walletProviders';

export interface WalletConnection {
  publicKey: string;
  walletType: string;
  isConnected: boolean;
}

export interface WalletError {
  code: string;
  message: string;
  walletId?: string;
}

export class WalletConnectionError extends Error {
  constructor(
    public code: string,
    message: string,
    public walletId?: string
  ) {
    super(message);
    this.name = 'WalletConnectionError';
  }
}

export class WalletConnectionService {
  private static instance: WalletConnectionService;
  private currentConnection: WalletConnection | null = null;

  private constructor() {}

  static getInstance(): WalletConnectionService {
    if (!WalletConnectionService.instance) {
      WalletConnectionService.instance = new WalletConnectionService();
    }
    return WalletConnectionService.instance;
  }

  async connectWallet(provider: WalletProvider): Promise<WalletConnection> {
    try {
      if (provider.id === 'albedo') {
        return await this.connectAlbedo(provider);
      } else if (provider.id === 'freighter') {
        return await this.connectFreighter(provider);
      } else if (provider.id === 'lobstr') {
        return await this.connectLobstr(provider);
      } else {
        throw new WalletConnectionError(
          'UNSUPPORTED_WALLET',
          `Wallet ${provider.name} is not supported`,
          provider.id
        );
      }
    } catch (error) {
      if (error instanceof WalletConnectionError) {
        throw error;
      }
      throw new WalletConnectionError(
        'CONNECTION_FAILED',
        `Failed to connect to ${provider.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider.id
      );
    }
  }

  private async connectAlbedo(provider: WalletProvider): Promise<WalletConnection> {
    if (typeof window === 'undefined') {
      throw new WalletConnectionError('ENVIRONMENT_ERROR', 'Albedo requires browser environment', provider.id);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new WalletConnectionError('TIMEOUT', 'Connection timeout', provider.id));
      }, 30000);

      try {
        window.albedo?.publicKey({
          onResult: (result: { publicKey: string }) => {
            clearTimeout(timeout);
            const connection: WalletConnection = {
              publicKey: result.publicKey,
              walletType: provider.id,
              isConnected: true
            };
            this.currentConnection = connection;
            this.saveConnection(connection);
            resolve(connection);
          },
          onError: (error: { message: string }) => {
            clearTimeout(timeout);
            reject(new WalletConnectionError('ALBEDO_ERROR', error.message, provider.id));
          }
        });
      } catch (error) {
        clearTimeout(timeout);
        reject(new WalletConnectionError('ALBEDO_INIT', 'Failed to initialize Albedo', provider.id));
      }
    });
  }

  private async connectFreighter(provider: WalletProvider): Promise<WalletConnection> {
    if (typeof window === 'undefined') {
      throw new WalletConnectionError('ENVIRONMENT_ERROR', 'Freighter requires browser environment', provider.id);
    }

    try {
      const freighter = window.freighter;
      if (!freighter) {
        throw new WalletConnectionError('FREIGHTER_NOT_FOUND', 'Freighter wallet not found', provider.id);
      }

      const isConnected = await freighter.isConnected();
      if (!isConnected) {
        throw new WalletConnectionError('FREIGHTER_NOT_CONNECTED', 'Freighter wallet is not connected', provider.id);
      }

      const publicKey = await freighter.getPublicKey();
      if (!publicKey) {
        throw new WalletConnectionError('FREIGHTER_NO_PUBLIC_KEY', 'Unable to get public key from Freighter', provider.id);
      }

      const connection: WalletConnection = {
        publicKey,
        walletType: provider.id,
        isConnected: true
      };

      this.currentConnection = connection;
      this.saveConnection(connection);
      return connection;
    } catch (error) {
      if (error instanceof WalletConnectionError) {
        throw error;
      }
      throw new WalletConnectionError('FREIGHTER_ERROR', `Freighter connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`, provider.id);
    }
  }

  private async connectLobstr(provider: WalletProvider): Promise<WalletConnection> {
    if (typeof window === 'undefined') {
      throw new WalletConnectionError('ENVIRONMENT_ERROR', 'Lobstr requires browser environment', provider.id);
    }

    try {
      const lobstr = window.lobstr;
      if (!lobstr) {
        throw new WalletConnectionError('LOBSTR_NOT_FOUND', 'Lobstr wallet not found', provider.id);
      }

      const publicKey = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 30000);

        lobstr.getPublicKey()
          .then((key: string) => {
            clearTimeout(timeout);
            resolve(key);
          })
          .catch((error: Error) => {
            clearTimeout(timeout);
            reject(error);
          });
      });

      const connection: WalletConnection = {
        publicKey,
        walletType: provider.id,
        isConnected: true
      };

      this.currentConnection = connection;
      this.saveConnection(connection);
      return connection;
    } catch (error) {
      if (error instanceof WalletConnectionError) {
        throw error;
      }
      throw new WalletConnectionError('LOBSTR_ERROR', `Lobstr connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`, provider.id);
    }
  }

  disconnect(): void {
    this.currentConnection = null;
    this.clearConnection();
  }

  getCurrentConnection(): WalletConnection | null {
    const saved = this.getSavedConnection();
    if (saved) {
      this.currentConnection = saved;
    }
    return this.currentConnection;
  }

  private saveConnection(connection: WalletConnection): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem('stellar_wallet_connection', JSON.stringify(connection));
      } catch (error) {
        console.warn('Failed to save wallet connection:', error);
      }
    }
  }

  private getSavedConnection(): WalletConnection | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = localStorage.getItem('stellar_wallet_connection');
        return saved ? JSON.parse(saved) : null;
      } catch (error) {
        console.warn('Failed to load saved wallet connection:', error);
        return null;
      }
    }
    return null;
  }

  private clearConnection(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem('stellar_wallet_connection');
      } catch (error) {
        console.warn('Failed to clear wallet connection:', error);
      }
    }
  }

  async openWallet(provider: WalletProvider): Promise<void> {
    if (typeof window === 'undefined') return;

    const { deepLink, universalLink } = provider;
    
    if (deepLink) {
      try {
        window.location.href = deepLink;
        setTimeout(() => {
          if (universalLink) {
            window.open(universalLink, '_blank');
          }
        }, 2000);
      } catch (error) {
        if (universalLink) {
          window.open(universalLink, '_blank');
        }
      }
    } else if (universalLink) {
      window.open(universalLink, '_blank');
    }
  }
}

declare global {
  interface Window {
    albedo?: {
      publicKey: (options: {
        onResult: (result: { publicKey: string }) => void;
        onError: (error: { message: string }) => void;
      }) => void;
    };
    freighter?: {
      isConnected: () => Promise<boolean>;
      getPublicKey: () => Promise<string>;
    };
    lobstr?: {
      getPublicKey: () => Promise<string>;
    };
  }
}
