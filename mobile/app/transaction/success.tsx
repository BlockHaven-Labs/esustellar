import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import Button from '../../components/ui/Button';
import { txExplorerLink } from '../../utils/explorerLink';

export default function TransactionSuccessScreen() {
  const router = useRouter();
  const { txHash } = useLocalSearchParams<{ txHash?: string }>();
  const hash = txHash ?? '';

  const explorerUrl = txExplorerLink(hash, 'testnet');

  const handleViewExplorer = () => {
    Linking.openURL(explorerUrl);
  };

  const handleDone = () => {
    router.replace('/(tabs)');
  };

  return (
    <>
      {/* Disable back gesture */}
      <Stack.Screen options={{ gestureEnabled: false, headerShown: false }} />

      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Success icon */}
          <View style={styles.iconWrap}>
            <View style={styles.iconCircle}>
              <Text style={styles.checkmark}>✓</Text>
            </View>
          </View>

          <Text style={styles.title}>Transaction Sent!</Text>
          <Text style={styles.subtitle}>Your transaction was submitted to the Stellar network.</Text>

          {/* Hash display */}
          {hash ? (
            <View style={styles.hashCard}>
              <Text style={styles.hashLabel}>Transaction Hash</Text>
              <Text style={styles.hashValue} numberOfLines={1} ellipsizeMode="middle">
                {hash}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Button variant="outline" size="lg" onPress={handleViewExplorer} style={styles.btn}>
            View on Stellar Expert
          </Button>
          <Button variant="primary" size="lg" onPress={handleDone} style={styles.btn}>
            Done
          </Button>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  iconWrap: { marginBottom: 28 },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#14532D',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#14532D',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  checkmark: { fontSize: 64, fontWeight: '800', color: '#4ADE80', lineHeight: 64 },
  title: { fontSize: 26, fontWeight: '800', color: '#F8FAFC', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 32 },
  hashCard: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  hashLabel: { fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  hashValue: { fontSize: 13, color: '#94A3B8', fontFamily: 'monospace', width: '100%', textAlign: 'center' },
  actions: { padding: 24, gap: 12 },
  btn: { width: '100%' },
});
