import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

import Button from '../../components/ui/Button';

const RECOVERY_ACK_KEY = 'walletRecoveryAcknowledgedAt';

const backupChecklist = [
  'Write your recovery phrase on paper and store it offline.',
  'Keep two copies in separate secure locations.',
  'Never share your phrase in chat, email, or screenshots.',
];

const edgeCases = [
  'Lost device: restore wallet using your recovery phrase on a new phone.',
  'Forgot PIN only: use recovery phrase to re-import wallet, then set a new PIN.',
  'Phrase mismatch: stop and verify each word order before retrying.',
];

export default function WalletRecoveryScreen() {
  const router = useRouter();
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const existing = await AsyncStorage.getItem(RECOVERY_ACK_KEY);
      if (!mounted) return;
      setAcknowledged(Boolean(existing));
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const canComplete = useMemo(
    () => confirmText.trim().toUpperCase() === 'RECOVER',
    [confirmText],
  );

  const saveAcknowledgement = async () => {
    if (!canComplete) return;

    await AsyncStorage.setItem(RECOVERY_ACK_KEY, new Date().toISOString());
    setAcknowledged(true);
    setConfirmText('');
    Alert.alert(
      'Recovery ready',
      'Backup instructions confirmed successfully.',
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading recovery options...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Wallet Recovery</Text>
        <Text style={styles.subtitle}>
          Protect access to your wallet before anything goes wrong.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Backup Instructions</Text>
          {backupChecklist.map((item) => (
            <Text key={item} style={styles.bullet}>
              • {item}
            </Text>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recovery Flow</Text>
          <Text style={styles.body}>1. Open the app on a trusted device.</Text>
          <Text style={styles.body}>2. Choose “Recover Existing Wallet”.</Text>
          <Text style={styles.body}>3. Enter your phrase in exact order.</Text>
          <Text style={styles.body}>
            4. Set a new PIN and re-enable biometrics.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Edge Cases & Safety Checks</Text>
          {edgeCases.map((item) => (
            <Text key={item} style={styles.bullet}>
              • {item}
            </Text>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Secure Confirmation</Text>
          <Text style={styles.body}>
            Type RECOVER to confirm you have secured your backup.
          </Text>
          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
            placeholder="Type RECOVER"
            placeholderTextColor="#64748B"
            style={styles.input}
          />
          <Button onPress={saveAcknowledgement} disabled={!canComplete}>
            Confirm Backup Readiness
          </Button>
          {acknowledged ? (
            <Text style={styles.success}>
              Backup instructions acknowledged.
            </Text>
          ) : null}
        </View>

        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>Back to Settings</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { padding: 20, gap: 14, paddingBottom: 30 },
  loadingText: { color: '#E2E8F0', padding: 20 },
  title: { color: '#F8FAFC', fontSize: 24, fontWeight: '800' },
  subtitle: { color: '#94A3B8', fontSize: 14, marginBottom: 6 },
  card: { backgroundColor: '#1E293B', borderRadius: 14, padding: 14, gap: 8 },
  cardTitle: { color: '#E2E8F0', fontSize: 16, fontWeight: '700' },
  bullet: { color: '#CBD5E1', fontSize: 14, lineHeight: 20 },
  body: { color: '#CBD5E1', fontSize: 14, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 10,
    color: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 2,
  },
  success: { color: '#4ADE80', fontSize: 13, fontWeight: '600' },
  back: { color: '#93C5FD', textAlign: 'center', marginTop: 4 },
});
