import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Variant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

const VARIANT_COLORS: Record<Variant, { bg: string; text: string }> = {
  success: { bg: '#14532D', text: '#4ADE80' },
  warning: { bg: '#78350F', text: '#FCD34D' },
  error:   { bg: '#7F1D1D', text: '#FCA5A5' },
  info:    { bg: '#1E3A5F', text: '#60A5FA' },
  neutral: { bg: '#1E293B', text: '#94A3B8' },
};

interface Props {
  label: string;
  variant: Variant;
}

export function Badge({ label, variant }: Props) {
  const { bg, text } = VARIANT_COLORS[variant];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  text: { fontSize: 12, fontWeight: '600' },
});
