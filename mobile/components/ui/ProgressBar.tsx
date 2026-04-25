import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  progress: number;
  label?: string;
}

export function ProgressBar({ progress, label }: Props) {
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.track} testID="progress-track">
        <View style={[styles.fill, { width: `${clamped * 100}%` }]} testID="progress-fill" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: '#fff', fontSize: 12, marginBottom: 4 },
  track: { height: 6, backgroundColor: '#1E293B', borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#6366F1', borderRadius: 3 },
});
