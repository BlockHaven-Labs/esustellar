'use client';

import React, { Suspense, lazy } from 'react';
import { View, Text } from 'react-native';

const ProfileScreenContent = lazy(() => import('../../components/screens/ProfileScreenContent'));

export default function ProfileScreen() {
  return (
    <Suspense
      fallback={
        <View style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#fff' }}>Loading profile…</Text>
        </View>
      }
    >
      <ProfileScreenContent />
    </Suspense>
  );
}
