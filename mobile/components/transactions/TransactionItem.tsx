import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatXLM } from '../../utils/stellar';

export type TransactionType = 'contribution' | 'payout' | 'fee';

interface Props {
  type: TransactionType;
  description: string;
  amount: number;
  date: string;
}

const ICON: Record<TransactionType, string> = {
  contribution: '↑',
  payout: '↓',
  fee: '−',
};

const COLOR: Record<TransactionType, string> = {
  contribution: '#EF4444',
  payout: '#22C55E',
  fee: '#94A3B8',
};

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// Before: plain function — re-renders on every parent update
// After: React.memo — only re-renders when own props change
export const TransactionItem = React.memo(function TransactionItem({ type, description, amount, date }: Props) {
  const color = COLOR[type];
  return (
    <View style={styles.row} accessibilityRole="text">
      <View style={[styles.icon, { backgroundColor: color + '20' }]}>
        <Text style={[styles.iconText, { color }]}>{ICON[type]}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.desc} numberOfLines={1}>{description}</Text>
        <Text style={styles.date}>{relativeDate(date)}</Text>
      </View>
      <Text style={[styles.amount, { color }]}>{formatXLM(amount)}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: { fontSize: 16, fontWeight: '700' },
  info: { flex: 1 },
  desc: { fontSize: 14, color: '#1E293B', fontWeight: '500' },
  date: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '600' },
});
