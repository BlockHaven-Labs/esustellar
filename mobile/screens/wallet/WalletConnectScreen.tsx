import React, { useEffect, useState } from 'react';
import { Linking, View, Text, StyleSheet, Alert } from 'react-native';
import { Button } from '../components/Button'; // assuming you have a shared Button component

const DEEP_LINK_SCHEMES: Record<string, string> = {
  Freighter: 'freighter://wallet/connect',
  Lobstr: 'lobstr://wallet/connect',
};

export const WalletConnectScreen: React.FC = () => {
  const [connecting, setConnecting] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      const params = url.split('?')[1] ?? '';
      const account = params.match(/(?:^|&)account=([^&]+)/)?.[1];
      setConnectedAddress(account || 'GA7QNF-mobile-placeholder');
    });
    return () => sub.remove();
  }, []);

  const connectWallet = async (walletType: string) => {
    if (connecting) return; // prevent repeated taps
    setConnecting(true);

    try {
      // simulate connection delay
      await new Promise((resolve, reject) =>
        setTimeout(() => {
          // simulate random failure
          Math.random() > 0.7 ? reject(new Error('Connection failed')) : resolve(true);
        }, 2000)
      );

      Alert.alert('Success', `${walletType} connected successfully`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  };

  const connectMobileWallet = async (walletType: string) => {
    if (connecting) return;
    setConnecting(true);

    try {
      await Linking.openURL(DEEP_LINK_SCHEMES[walletType]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Unable to open wallet app');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect Your Wallet</Text>
      <Button
        title="Connect MetaMask"
        onPress={() => connectWallet('MetaMask')}
        loading={connecting}
        disabled={connecting}
      />
      <Button
        title="Connect WalletConnect"
        onPress={() => connectWallet('WalletConnect')}
        loading={connecting}
        disabled={connecting}
      />
      <Button
        title="Connect Coinbase"
        onPress={() => connectWallet('Coinbase')}
        loading={connecting}
        disabled={connecting}
      />
      <Button
        title="Connect Freighter (mobile)"
        onPress={() => connectMobileWallet('Freighter')}
        loading={connecting}
        disabled={connecting}
      />
      <Button
        title="Connect Lobstr (mobile)"
        onPress={() => connectMobileWallet('Lobstr')}
        loading={connecting}
        disabled={connecting}
      />
      {connectedAddress ? <Text style={styles.connected}>{connectedAddress}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  connected: {
    marginTop: 16,
    textAlign: 'center',
    color: '#16a34a',
  },
});