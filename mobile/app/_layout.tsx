import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  Image,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { Slot, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { biometricService } from '../services/security';
import { useAutoLock } from '../hooks/useAutoLock';

const ONBOARDING_KEY = 'onboardingComplete';
const BIOMETRIC_LOCK_KEY = 'biometricLockEnabled';

export default function RootLayout() {
  const [checking, setChecking] = useState(true);
  const [masked, setMasked] = useState(false);
  const [locked, setLocked] = useState(false);
  const router = useRouter();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // ── Biometric unlock ────────────────────────────────────────────────────

  const promptBiometric = async () => {
    const enabled = await AsyncStorage.getItem(BIOMETRIC_LOCK_KEY);
    if (enabled !== 'true') return;

    const result = await biometricService.authenticate('Unlock EsuStellar');
    if (result.success) {
      setLocked(false);
    }
    // If failed/cancelled, stay locked — user can retry by foregrounding again
  };

  // ── AppState listener ───────────────────────────────────────────────────

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async (nextState: AppStateStatus) => {
        const prev = appState.current;
        appState.current = nextState;

        // Show overlay when going to background/inactive (#168)
        if (nextState === 'background' || nextState === 'inactive') {
          setMasked(true);
        }

        // On foreground resume: remove overlay and trigger biometric lock (#165)
        if (nextState === 'active' && (prev === 'background' || prev === 'inactive')) {
          setMasked(false);
          const enabled = await AsyncStorage.getItem(BIOMETRIC_LOCK_KEY);
          if (enabled === 'true') {
            setLocked(true);
            await promptBiometric();
          }
        }
      }
    );

    return () => subscription.remove();
  }, []);

  // ── Initial routing ─────────────────────────────────────────────────────

  useAutoLock(() => {
    router.replace('/wallet/connect');
  });

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      if (value === 'true') {
        router.replace('/wallet/connect');
      } else {
        router.replace('/onboarding');
      }
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Slot />

      {/* App-switcher mask overlay (#168) */}
      {masked && (
        <View style={styles.overlay} pointerEvents="none">
          <Text style={styles.overlayText}>EsuStellar</Text>
        </View>
      )}

      {/* Biometric lock screen (#165) */}
      {locked && (
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>EsuStellar</Text>
          <Text style={styles.lockHint} onPress={promptBiometric}>
            Tap to unlock
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  overlayText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 1,
  },
  lockHint: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    marginTop: 16,
  },
});
