import { useWalletStore } from '@/stores/walletStore';

beforeEach(() => {
  useWalletStore.setState({ address: null, isConnecting: false });
});

describe('walletStore', () => {
  it('connects with address', () => {
    useWalletStore.getState().connect('GABC123');
    expect(useWalletStore.getState().address).toBe('GABC123');
    expect(useWalletStore.getState().isConnecting).toBe(false);
  });

  it('disconnects and clears address', () => {
    useWalletStore.getState().connect('GABC123');
    useWalletStore.getState().disconnect();
    expect(useWalletStore.getState().address).toBeNull();
  });

  it('setConnecting updates flag', () => {
    useWalletStore.getState().setConnecting(true);
    expect(useWalletStore.getState().isConnecting).toBe(true);
  });
});
