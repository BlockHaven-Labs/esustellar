import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { getIllustration, IllustrationType } from './Illustration';

type Tone = 'light' | 'dark' | 'auto';

interface Props {
  title: string;
  message: string;
  illustration?: IllustrationType;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: Tone;
}

export function EmptyState({
  title,
  message,
  illustration,
  icon,
  actionLabel,
  onAction,
  tone = 'auto',
}: Props) {
  const { resolvedColorScheme, colors } = useTheme();
  const effectiveTone = tone === 'auto' ? resolvedColorScheme : tone;
  const titleColor = effectiveTone === 'dark' ? '#F1F5F9' : '#0F172A';
  const messageColor = effectiveTone === 'dark' ? '#94A3B8' : '#64748B';
  const buttonBg = effectiveTone === 'dark' ? '#334155' : colors.accent;
  const buttonText = effectiveTone === 'dark' ? '#F1F5F9' : '#FFFFFF';
  const illustrationType = illustration ?? 'default';

  return (
    <View style={styles.container}>
      <View style={styles.illustration}>
        {illustration ? getIllustration(illustrationType).render() : icon ? <Text style={styles.icon}>{icon}</Text> : getIllustration('default').render()}
      </View>
      <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
      <Text style={[styles.message, { color: messageColor }]}>{message}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction} style={[styles.button, { backgroundColor: buttonBg }]} disabled={!onAction}>
          <Text style={[styles.buttonText, { color: buttonText }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  illustration: { marginBottom: 18, opacity: 0.98 },
  icon: { fontSize: 48 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 14, textAlign: 'center', marginBottom: 18, lineHeight: 20 },
  button: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 18 },
  buttonText: { fontWeight: '700', fontSize: 14 },
});

