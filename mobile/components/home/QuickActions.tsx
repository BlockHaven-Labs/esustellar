import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card } from '../ui';

interface Action {
  icon: string;
  label: string;
  onPress: () => void;
}

interface Props {
  onContribute?: () => void;
  onJoinGroup?: () => void;
  onMyGroups?: () => void;
}

export function QuickActions({ onContribute, onJoinGroup, onMyGroups }: Props) {
  const actions: Action[] = [
    {
      icon: '💸',
      label: 'Contribute',
      onPress: onContribute ?? (() => console.log('contribute')),
    },
    {
      icon: '🤝',
      label: 'Join Group',
      onPress: onJoinGroup ?? (() => console.log('join-group')),
    },
    {
      icon: '👥',
      label: 'My Groups',
      onPress: onMyGroups ?? (() => console.log('my-groups')),
    },
  ];

  return (
    <Card>
      <Text style={styles.title}>Quick Actions</Text>
      <View style={styles.row}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={styles.action}
            onPress={action.onPress}
            accessibilityLabel={action.label}
            accessibilityRole="button"
          >
            <Text style={styles.icon}>{action.icon}</Text>
            <Text style={styles.label}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 13, color: '#94A3B8', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  action: { flex: 1, alignItems: 'center', gap: 6 },
  icon: { fontSize: 28 },
  label: { fontSize: 12, color: '#CBD5E1', textAlign: 'center' },
});
