import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Status = 'active' | 'pending' | 'completed';

interface Props {
  name: string;
  status: Status;
  contributionAmount: string;
  dueDate?: string;
  onPress?: () => void;
}

const STATUS_COLORS: Record<Status, string> = {
  active: '#10B981',
  pending: '#F59E0B',
  completed: '#6366F1',
};

export function GroupCard({ name, status, contributionAmount, dueDate, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} testID="group-card">
      <View style={styles.row}>
        <Text style={styles.name}>{name}</Text>
        <View style={[styles.badge, { backgroundColor: STATUS_COLORS[status] }]}>
          <Text style={styles.badgeText}>{status}</Text>
        </View>
      </View>
      <Text style={styles.amount}>{contributionAmount}</Text>
      {dueDate && (
        <View style={styles.dueBadge}>
          <Text style={styles.dueText}>Due: {dueDate}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  name: { color: '#fff', fontSize: 16, fontWeight: '600' },
  badge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  amount: { color: '#94A3B8', fontSize: 14 },
  dueBadge: { marginTop: 8, backgroundColor: '#0F172A', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  dueText: { color: '#F59E0B', fontSize: 12 },
});
