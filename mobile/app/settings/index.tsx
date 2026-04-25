import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Switch,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { biometricService, SecurityStatus } from '../../services/security';

const BIOMETRIC_LOCK_KEY = 'biometricLockEnabled';

export default function SettingsScreen() {
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const cap = await biometricService.getCapability();
      setBiometricAvailable(cap.status === SecurityStatus.AVAILABLE);
      const stored = await AsyncStorage.getItem(BIOMETRIC_LOCK_KEY);
      setBiometricEnabled(stored === 'true');
      setLoading(false);
    };
    init();
  }, []);

  const handleToggle = async (value: boolean) => {
    if (value) {
      const result = await biometricService.authenticate('Enable biometric lock');
      if (!result.success) return;
    }
    setBiometricEnabled(value);
    await AsyncStorage.setItem(BIOMETRIC_LOCK_KEY, value ? 'true' : 'false');
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Security</Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Biometric Lock</Text>
            <Text style={styles.rowSub}>
              {biometricAvailable
                ? 'Require biometrics when resuming the app'
                : 'Not available on this device'}
            </Text>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={handleToggle}
            disabled={!biometricAvailable}
            trackColor={{ false: '#334155', true: '#6C63FF' }}
            thumbColor="#fff"
            accessibilityLabel="Enable biometric lock"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  content: { padding: 24 },
  heading: { fontSize: 22, fontWeight: '800', color: '#F8FAFC', marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1E293B', borderRadius: 12, padding: 16 },
  rowText: { flex: 1, marginRight: 12 },
  rowLabel: { fontSize: 16, fontWeight: '600', color: '#F8FAFC' },
  rowSub: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
});
