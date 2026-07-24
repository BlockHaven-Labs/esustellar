import React, { Suspense } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// Lazy load the actual screen implementation
const SettingsContent = React.lazy(() => import('./index'));

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});