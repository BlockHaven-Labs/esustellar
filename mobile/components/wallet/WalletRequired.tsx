import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';

interface Props {
  children: React.ReactNode;
}

export function WalletRequired({ children }: Props) {
  const wallet = useAuthStore((s) => s.wallet);
  const router = useRouter();

  if (!wallet) {
    return (
      <View style={styles.container} accessibilityLabel="Wallet Not Connected">
        <Text style={styles.icon}>🔗</Text>
        <Text style={styles.title}>Wallet Not Connected</Text>
        <Text style={styles.message}>
          Connect your Stellar wallet to access this screen.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/wallet/connect')}
          accessibilityRole="button"
          accessibilityLabel="Connect Wallet"
        >
          <Text style={styles.buttonText}>Connect Wallet</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#F8FAFC', marginBottom: 8 },
  message: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 24 },
  button: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: { color: '#F8FAFC', fontWeight: '600', fontSize: 15 },
});
