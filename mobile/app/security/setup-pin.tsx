import React, { useEffect, useMemo, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PinPad } from '../../components/security/PinPad';
import { pinService } from '../../services/security/pinService';
import { saveSecurityPreferences } from '../../services/security/securityPreferences';
import { PIN_LENGTH } from '../../services/security/pinPolicy';

export default function SetupPinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const modeValue = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const isChangingExistingPin = modeValue === 'change';

  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [firstPin, setFirstPin] = useState('');
  const [confirmationPin, setConfirmationPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const activePin = step === 'enter' ? firstPin : confirmationPin;

  const helperText = useMemo(() => {
    if (step === 'enter') {
      return `Choose a ${PIN_LENGTH}-digit PIN.`;
    }

    return 'Re-enter your PIN to confirm it.';
  }, [step]);

  useEffect(() => {
    if (activePin.length !== PIN_LENGTH || saving) {
      return;
    }

    if (step === 'enter') {
      setStep('confirm');
      return;
    }

    if (firstPin !== confirmationPin) {
      setError('PINs do not match. Try again.');
      setConfirmationPin('');
      return;
    }

    let cancelled = false;

    void (async () => {
      setSaving(true);

      try {
        await pinService.setPin(firstPin);
        await saveSecurityPreferences({ pinEnabled: true });

        if (cancelled) {
          return;
        }

        Alert.alert(
          isChangingExistingPin ? 'PIN changed' : 'PIN saved',
          isChangingExistingPin
            ? 'Your new PIN is ready to use.'
            : 'Your fallback PIN has been set successfully.',
          [
            {
              text: 'Continue',
              onPress: () => router.replace('/settings'),
            },
          ]
        );
      } catch {
        if (!cancelled) {
          setError('Unable to save your PIN right now.');
          setConfirmationPin('');
        }
      } finally {
        if (!cancelled) {
          setSaving(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activePin.length,
    confirmationPin,
    firstPin,
    isChangingExistingPin,
    router,
    saving,
    step,
  ]);

  const handleDigit = (digit: string) => {
    setError(null);

    if (step === 'enter') {
      if (firstPin.length < PIN_LENGTH) {
        setFirstPin((current) => `${current}${digit}`);
      }
      return;
    }

    if (confirmationPin.length < PIN_LENGTH) {
      setConfirmationPin((current) => `${current}${digit}`);
    }
  };

  const handleBackspace = () => {
    setError(null);

    if (step === 'enter') {
      setFirstPin((current) => current.slice(0, -1));
      return;
    }

    setConfirmationPin((current) => current.slice(0, -1));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <PinPad
          disabled={saving}
          error={error}
          helperText={helperText}
          title={step === 'enter' ? 'Set up your PIN' : 'Confirm your PIN'}
          subtitle={
            isChangingExistingPin
              ? 'Create a fresh 6-digit PIN for future fallback sign-ins.'
              : 'Add a secure fallback option for this device.'
          }
          valueLength={activePin.length}
          onBackspace={handleBackspace}
          onDigit={handleDigit}
        />

        <Text style={styles.footerText}>
          Your PIN is hashed before it is stored securely on device.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  footerText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 24,
    textAlign: 'center',
  },
});
