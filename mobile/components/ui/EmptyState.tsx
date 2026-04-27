import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { getIllustration, type IllustrationType } from './Illustration';

interface Props {
  icon?: string;
  illustration?: IllustrationType;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, illustration, title, message, actionLabel, onAction }: Props) {
  // Support both icon prop and illustration type
  const displayIcon = icon || (illustration ? getIllustration(illustration).emoji : '📦');

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{displayIcon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && (
        <Pressable onPress={onAction} style={styles.button}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '600', color: '#F1F5F9', marginBottom: 8 },
  message: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 20 },
  button: {
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  buttonText: { color: '#F1F5F9', fontWeight: '600', fontSize: 14 },
});
