# Stellar Mobile Wallet Integration

This directory contains the mobile wallet connection flow for the esustellar project.

## Structure

```
mobile/
├── app/
│   └── wallet/
│       └── connect.tsx          # React component for wallet connection UI
├── services/
│   └── wallet/
│       ├── walletProviders.ts   # Wallet provider configurations
│       ├── connectWallet.ts     # Core wallet connection logic
│       ├── walletTypes.ts       # TypeScript type definitions
│       └── walletHooks.ts      # React hooks for wallet state management
└── README.md                    # This file
```

## Supported Wallets

- **Freighter** - Stellar's flagship non-custodial wallet (mobile & desktop)
- **Lobstr** - Simple and secure Stellar wallet (mobile)
- **Albedo** - Browser-based wallet with mobile support

## Features

- ✅ Multi-wallet support
- ✅ Local storage for wallet connections
- ✅ Loading states and progress indicators
- ✅ Error handling and recovery
- ✅ Deep linking for mobile wallet apps
- ✅ TypeScript support
- ✅ React hooks for state management

## Usage

### Basic Integration

```tsx
import { WalletConnect } from '../app/wallet/connect';

function MyComponent() {
  const handleConnect = (connection) => {
    console.log('Wallet connected:', connection);
  };

  const handleDisconnect = () => {
    console.log('Wallet disconnected');
  };

  return (
    <WalletConnect
      onConnect={handleConnect}
      onDisconnect={handleDisconnect}
    />
  );
}
```

### Advanced Usage with Hooks

```tsx
import { useWalletConnection } from '../services/wallet/walletHooks';

function MyComponent() {
  const { 
    connection, 
    state, 
    progress, 
    connect, 
    disconnect, 
    clearError 
  } = useWalletConnection();

  const handleConnect = async () => {
    try {
      await connect('freighter');
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  return (
    <div>
      {state.isConnected ? (
        <div>
          <p>Connected: {connection?.publicKey}</p>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      ) : (
        <div>
          <button onClick={handleConnect} disabled={state.isLoading}>
            {state.isLoading ? 'Connecting...' : 'Connect Wallet'}
          </button>
          {state.error && (
            <div>
              <p>Error: {state.error}</p>
              <button onClick={clearError}>Clear Error</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## Wallet Connection Flow

1. **Wallet Selection**: User chooses from available wallets
2. **Deep Link**: Mobile wallet app is opened via deep link
3. **Authorization**: User approves connection in wallet app
4. **Connection**: Public key is retrieved and stored locally
5. **Ready**: App can now interact with Stellar network

## Error Handling

The system includes comprehensive error handling:

- **Wallet Not Found**: When a wallet isn't installed
- **Connection Timeout**: When wallet doesn't respond
- **User Rejected**: When user cancels connection
- **Network Errors**: When there are connectivity issues

## Local Storage

Wallet connections are automatically persisted in localStorage:

```typescript
interface StoredConnection {
  publicKey: string;
  walletType: string;
  isConnected: boolean;
}
```

## Mobile Deep Links

Each wallet supports deep linking:

- Freighter: `freighter://`
- Lobstr: `lobstr://`
- Albedo: Universal link only

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

- `WalletProvider` - Wallet configuration
- `WalletConnection` - Connection state
- `WalletConnectionState` - UI state
- `WalletConnectionError` - Error types

## Development Notes

- The implementation is framework-agnostic but includes React examples
- All wallet interactions are handled through a singleton service
- Error states are automatically cleared on successful connection
- Progress indicators provide user feedback during connection

## Dependencies

The wallet integration requires:

- `stellar-sdk` - For Stellar network interactions
- React (for UI components and hooks)
- TypeScript (for type safety)

## Security Notes

- Private keys are never stored or accessed
- Only public keys are stored locally
- All sensitive operations happen in the wallet app
- Connections are read-only by default
