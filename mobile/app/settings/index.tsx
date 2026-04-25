import React, { useCallback, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Button from '../../components/ui/Button';
import {
  biometricService,
  BiometricCapability,
  BiometricType,
  SecurityStatus,
} from '../../services/security';
import { pinService } from '../../services/security/pinService';
import {
  getSecurityPreferences,
  saveSecurityPreferences,
  SecurityPreferences,
} from '../../services/security/securityPreferences';

export default function SettingsScreen() {
  const router = useRouter();
  const [biometricCap, setBiometricCap] = useState<BiometricCapability>({
    status: SecurityStatus.UNKNOWN,
    supportedTypes: [],
  });
  const [securityPreferences, setSecurityPreferences] =
    useState<SecurityPreferences>({
      biometricEnabled: false,
      pinEnabled: false,
    });
  const [pinSet, setPinSet] = useState(false);
  const [pinLockoutRemainingMs, setPinLockoutRemainingMs] = useState(0);
  const [authenticating, setAuthenticating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const loadSecurityState = useCallback(() => {
    let active = true;

    void (async () => {
      const [capability, preferences, pinStatus] = await Promise.all([
        biometricService.getCapability(),
        getSecurityPreferences(),
        pinService.getStatus(),
      ]);

      if (!active) {
        return;
      }

      setBiometricCap(capability);
      setSecurityPreferences(preferences);
      setPinSet(pinStatus.isPinSet);
      setPinLockoutRemainingMs(pinStatus.remainingLockoutMs);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(loadSecurityState);

  const getSupportedBiometricLabel = () => {
    if (
      biometricCap.supportedTypes.length === 0 ||
      biometricCap.supportedTypes.includes(BiometricType.NONE)
    ) {
      return 'Unavailable';
    }

    return biometricCap.supportedTypes
      .map((type) => {
        switch (type) {
          case BiometricType.FINGERPRINT:
            return 'Fingerprint';
          case BiometricType.FACIAL_RECOGNITION:
            return 'Face ID';
          case BiometricType.IRIS:
            return 'Iris';
          default:
            return 'Biometrics';
        }
      })
      .join(' / ');
  };

  const handleBiometricToggle = async () => {
    if (biometricCap.status !== SecurityStatus.AVAILABLE) {
      Alert.alert(
        'Biometrics unavailable',
        'Set up a device biometric first before enabling this option.'
      );
      return;
    }

    setAuthenticating(true);
    const result = await biometricService.authenticate(
      securityPreferences.biometricEnabled
        ? 'Disable biometric authentication'
        : 'Enable biometric authentication'
    );
    setAuthenticating(false);

    if (!result.success) {
      setMessage(result.error ?? 'Biometric authentication failed');
      return;
    }

    const nextPreferences = await saveSecurityPreferences({
      biometricEnabled: !securityPreferences.biometricEnabled,
    });

    setSecurityPreferences(nextPreferences);
    setMessage(
      nextPreferences.biometricEnabled
        ? 'Biometric authentication enabled'
        : 'Biometric authentication disabled'
    );
  };

  const handleRemovePin = () => {
    Alert.alert('Remove PIN', 'This will remove your fallback PIN from this device.', [
      { style: 'cancel', text: 'Cancel' },
      {
        style: 'destructive',
        text: 'Remove',
        onPress: () => {
          void (async () => {
            await pinService.removePin();
            const nextPreferences = await saveSecurityPreferences({
              pinEnabled: false,
            });

            setSecurityPreferences(nextPreferences);
            setPinSet(false);
            setPinLockoutRemainingMs(0);
            setMessage('PIN removed');
          })();
        },
      },
    ]);
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
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredState}>
          <Text style={styles.stateText}>Loading security settings...</Text>
        </View>
      </SafeAreaView>
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Security Settings</Text>
        <Text style={styles.subtitle}>
          Manage biometric access and your fallback PIN from one place.
        </Text>

        {message ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Biometric Authentication</Text>
          <Text style={styles.cardBody}>
            Supported: {getSupportedBiometricLabel()}
          </Text>
          <Text style={styles.cardBody}>
            Status:{' '}
            {biometricCap.status === SecurityStatus.AVAILABLE
              ? 'Ready'
              : biometricCap.status === SecurityStatus.NOT_ENROLLED
                ? 'Not enrolled'
                : biometricCap.status === SecurityStatus.UNSUPPORTED
                  ? 'Unsupported'
                  : 'Checking'}
          </Text>
          <Button
            disabled={
              authenticating || biometricCap.status !== SecurityStatus.AVAILABLE
            }
            onPress={handleBiometricToggle}
            style={styles.buttonSpacing}
            variant={securityPreferences.biometricEnabled ? 'outline' : 'primary'}
          >
            {securityPreferences.biometricEnabled
              ? 'Disable Biometrics'
              : 'Enable Biometrics'}
          </Button>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>PIN Fallback</Text>
          <Text style={styles.cardBody}>
            Use a secure 6-digit PIN when biometrics are unavailable or fail.
          </Text>
          {pinSet ? (
            <Text style={styles.cardBody}>
              PIN is set. Change PIN requires entering your current PIN first.
            </Text>
          ) : (
            <Text style={styles.cardBody}>No PIN set on this device yet.</Text>
          )}
          {pinLockoutRemainingMs > 0 ? (
            <Text style={styles.warningText}>
              PIN entry is locked for {Math.ceil(pinLockoutRemainingMs / 1000)}s.
            </Text>
          ) : null}

          {!pinSet ? (
            <Button
              onPress={() => router.push('/security/setup-pin')}
              style={styles.buttonSpacing}
            >
              Set Up PIN
            </Button>
          ) : (
            <>
              <Button
                onPress={() => router.push('/security/enter-pin?mode=change')}
                style={styles.buttonSpacing}
                variant="outline"
              >
                Change PIN
              </Button>
              <Button
                destructive
                onPress={handleRemovePin}
                style={styles.buttonSpacing}
                variant="ghost"
              >
                Remove PIN
              </Button>
            </>
          )}
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
  container: {
    backgroundColor: '#0F172A',
    flex: 1,
  },
  content: {
    padding: 24,
  },
  centeredState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  stateText: {
    color: '#CBD5E1',
    fontSize: 15,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  messageCard: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    padding: 14,
  },
  messageText: {
    color: '#E2E8F0',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#111827',
    borderColor: '#1F2937',
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },
  cardBody: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 6,
  },
  buttonSpacing: {
    marginTop: 12,
  },
  warningText: {
    color: '#FBBF24',
    fontSize: 13,
    marginTop: 8,
  },
  container: { flex: 1, backgroundColor: '#0F172A' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  content: { padding: 24 },
  heading: { fontSize: 22, fontWeight: '800', color: '#F8FAFC', marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1E293B', borderRadius: 12, padding: 16 },
  rowText: { flex: 1, marginRight: 12 },
  rowLabel: { fontSize: 16, fontWeight: '600', color: '#F8FAFC' },
  rowSub: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
});
