import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadLanguage } from '../constants/i18n';

const ONBOARDING_KEY = 'onboardingComplete';

export default function RootLayout() {
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const startTime = Date.now();

    async function initialize() {
      await loadLanguage();

      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (value === 'true') {
        router.replace('/wallet/connect');
      } else {
        router.replace('/onboarding');
      }
      setChecking(false);

      const endTime = Date.now();
      const startupTime = endTime - startTime;
      console.log(`App startup time: ${startupTime}ms`);
      // Optionally send to analytics
    }

    initialize();
  }, []);

  if (checking) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
