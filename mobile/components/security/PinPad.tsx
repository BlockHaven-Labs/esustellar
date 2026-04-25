import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface PinPadProps {
  disabled?: boolean;
  error?: string | null;
  helperText?: string;
  length?: number;
  title: string;
  subtitle?: string;
  valueLength: number;
  onBackspace: () => void;
  onDigit: (digit: string) => void;
}

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'backspace'],
];

export function PinPad({
  disabled,
  error,
  helperText,
  length = 6,
  title,
  subtitle,
  valueLength,
  onBackspace,
  onDigit,
}: PinPadProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <View style={styles.dots}>
        {Array.from({ length }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index < valueLength ? styles.dotFilled : styles.dotEmpty,
            ]}
          />
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}

      <View style={styles.keypad}>
        {KEYS.map((row) => (
          <View key={row.join('-')} style={styles.row}>
            {row.map((key, index) => {
              if (!key) {
                return <View key={`empty-${index}`} style={styles.keyPlaceholder} />;
              }

              if (key === 'backspace') {
                return (
                  <Pressable
                    key={key}
                    accessibilityLabel="Delete PIN digit"
                    accessibilityRole="button"
                    disabled={disabled}
                    onPress={onBackspace}
                    style={({ pressed }) => [
                      styles.key,
                      pressed && !disabled ? styles.keyPressed : null,
                      disabled ? styles.keyDisabled : null,
                    ]}
                  >
                    <Text style={styles.keyText}>Delete</Text>
                  </Pressable>
                );
              }

              return (
                <Pressable
                  key={key}
                  accessibilityLabel={`PIN digit ${key}`}
                  accessibilityRole="button"
                  disabled={disabled}
                  onPress={() => onDigit(key)}
                  style={({ pressed }) => [
                    styles.key,
                    pressed && !disabled ? styles.keyPressed : null,
                    disabled ? styles.keyDisabled : null,
                  ]}
                >
                  <Text style={styles.keyText}>{key}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dot: {
    borderRadius: 10,
    height: 16,
    width: 16,
  },
  dotFilled: {
    backgroundColor: '#818CF8',
  },
  dotEmpty: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
  },
  error: {
    color: '#F87171',
    fontSize: 13,
    marginBottom: 8,
    minHeight: 18,
    textAlign: 'center',
  },
  helperText: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 8,
    minHeight: 18,
    textAlign: 'center',
  },
  keypad: {
    marginTop: 16,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  key: {
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 6,
    minHeight: 60,
  },
  keyPressed: {
    backgroundColor: '#312E81',
    borderColor: '#6366F1',
  },
  keyDisabled: {
    opacity: 0.5,
  },
  keyPlaceholder: {
    flex: 1,
    marginHorizontal: 6,
  },
  keyText: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '600',
  },
});
