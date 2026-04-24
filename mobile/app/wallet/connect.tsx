'use client';

import React, { useState, useEffect } from 'react';
import { WalletProvider, getMobileWalletProviders } from '../../services/wallet/walletProviders';
import { WalletConnectionService, WalletConnection, WalletConnectionError } from '../../services/wallet/connectWallet';

interface WalletConnectProps {
  onConnect?: (connection: WalletConnection) => void;
  onDisconnect?: () => void;
  className?: string;
}

export const WalletConnect: React.FC<WalletConnectProps> = ({
  onConnect,
  onDisconnect,
  className = ''
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentConnection, setCurrentConnection] = useState<WalletConnection | null>(null);
  const [showWalletList, setShowWalletList] = useState(false);

  const walletService = WalletConnectionService.getInstance();
  const availableWallets = getMobileWalletProviders();

  useEffect(() => {
    const connection = walletService.getCurrentConnection();
    if (connection) {
      setCurrentConnection(connection);
    }
  }, []);

  const handleConnect = async (provider: WalletProvider) => {
    setIsConnecting(true);
    setConnectingWallet(provider.id);
    setError(null);

    try {
      const connection = await walletService.connectWallet(provider);
      setCurrentConnection(connection);
      onConnect?.(connection);
      setShowWalletList(false);
    } catch (err) {
      if (err instanceof WalletConnectionError) {
        setError(err.message);
      } else {
        setError('Failed to connect wallet');
      }
    } finally {
      setIsConnecting(false);
      setConnectingWallet(null);
    }
  };

  const handleDisconnect = () => {
    walletService.disconnect();
    setCurrentConnection(null);
    onDisconnect?.();
  };

  const handleOpenWallet = async (provider: WalletProvider) => {
    try {
      await walletService.openWallet(provider);
    } catch (err) {
      console.error('Failed to open wallet:', err);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (currentConnection) {
    return (
      <div className={`wallet-connected ${className}`}>
        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div>
              <p className="text-sm font-medium text-green-800">
                {currentConnection.walletType} Connected
              </p>
              <p className="text-xs text-green-600">
                {formatAddress(currentConnection.publicKey)}
              </p>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`wallet-connect ${className}`}>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-xs text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="relative">
        <button
          onClick={() => setShowWalletList(!showWalletList)}
          disabled={isConnecting}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center justify-center space-x-2"
        >
          {isConnecting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Connecting to {connectingWallet}...</span>
            </>
          ) : (
            <>
              <span>Connect Wallet</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </>
          )}
        </button>

        {showWalletList && (
          <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg">
            <div className="p-2">
              {availableWallets.map((provider) => (
                <div key={provider.id} className="mb-2 last:mb-0">
                  <button
                    onClick={() => handleConnect(provider)}
                    disabled={isConnecting && connectingWallet === provider.id}
                    className="w-full p-3 text-left hover:bg-gray-50 rounded-lg transition-colors flex items-center space-x-3 disabled:opacity-50"
                  >
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <img
                        src={provider.icon}
                        alt={provider.name}
                        className="w-6 h-6"
                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                          e.currentTarget.style.display = 'none';
                          const nextSibling = e.currentTarget.nextSibling as HTMLElement;
                          if (nextSibling) {
                            nextSibling.style.display = 'flex';
                          }
                        }}
                      />
                      <div className="w-4 h-4 bg-gray-400 rounded-full hidden" style={{ display: 'none' }}></div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{provider.name}</p>
                      <p className="text-xs text-gray-500">{provider.description}</p>
                    </div>
                    {isConnecting && connectingWallet === provider.id ? (
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>
                  {provider.deepLink && (
                    <button
                      onClick={() => handleOpenWallet(provider)}
                      className="w-full p-2 text-xs text-blue-600 hover:text-blue-700 text-center"
                    >
                      Open {provider.name} App
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Connect your Stellar wallet to use the app
        </p>
      </div>
    </div>
  );
};

export default WalletConnect;
