import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const SIZES = { sm: 32, md: 40, lg: 56 };
const COLORS = ['#6366F1','#8B5CF6','#EC4899','#F59E0B','#10B981','#3B82F6','#EF4444'];

function getInitials(name: string) {
  const words = name.trim().split(/\s+/);
  return (words[0]?.[0] ?? '') + (words[1]?.[0] ?? '');
}

function getBgColor(name: string) {
  const hash = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return COLORS[hash % COLORS.length];
}

interface Props {
  uri?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Avatar({ uri, name, size = 'md' }: Props) {
  const px = SIZES[size];
  const style = { width: px, height: px, borderRadius: px / 2 };

  if (uri) {
    return <Image source={{ uri }} style={style} />;
  }

  return (
    <View style={[style, styles.fallback, { backgroundColor: getBgColor(name) }]}>
      <Text style={[styles.initials, { fontSize: px * 0.35 }]}>{getInitials(name).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#fff', fontWeight: '600' },
});
