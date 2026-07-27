'use client';

import React, { Suspense, lazy } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const ProfileScreenContent = lazy(() => import('../../components/screens/ProfileScreenContent'));

function ProfileFallback() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: colors.text }}>Loading profile…</Text>
    </View>
  );
}

export default function ProfileScreen() {
  return (
    <Suspense fallback={<ProfileFallback />}>
      <ProfileScreenContent />
    </Suspense>
  );
}
