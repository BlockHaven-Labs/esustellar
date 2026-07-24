import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui';
import Button from '../ui/Button';
import { triggerHapticFeedback } from '../../utils/haptics';

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

const QuickActions = React.memo<Props>(({ onContribute, onJoinGroup, onMyGroups }) => {
  const handleContribute = useCallback(() => {
    const contributeAction = onContribute ?? (() => console.log('contribute'));

    // Simulate contribution confirmation with success feedback
    setTimeout(() => {
      triggerHapticFeedback.success();
    }, 1000); // Simulate transaction completion

    contributeAction();
  }, [onContribute]);

  const handleJoinGroup = useCallback(() => {
    onJoinGroup?.() ?? console.log('join-group');
  }, [onJoinGroup]);

  const handleMyGroups = useCallback(() => {
    onMyGroups?.() ?? console.log('my-groups');
  }, [onMyGroups]);

  const actions: Action[] = useMemo(() => [
    {
      icon: '💸',
      label: 'Contribute',
      onPress: handleContribute,
    },
    {
      icon: '🤝',
      label: 'Join Group',
      onPress: handleJoinGroup,
    },
    {
      icon: '👥',
      label: 'My Groups',
      onPress: handleMyGroups,
    },
  ], [handleContribute, handleJoinGroup, handleMyGroups]);

  return (
    <Card>
      <Text style={styles.title}>Quick Actions</Text>
      <View style={styles.row}>
        {actions.map((action) => (
          <View key={action.label} style={styles.action}>
            <Button
              variant="ghost"
              onPress={action.onPress}
              style={styles.button}
            >
              <Text style={styles.icon}>{action.icon}</Text>
              <Text style={styles.label}>{action.label}</Text>
            </Button>
          </View>
        ))}
      </View>
    </Card>
  );
});

QuickActions.displayName = 'QuickActions';

export default QuickActions;

const styles = StyleSheet.create({
  title: { fontSize: 13, color: '#94A3B8', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  action: { flex: 1, alignItems: 'center', gap: 6 },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  icon: { fontSize: 28 },
  label: { fontSize: 12, color: '#CBD5E1', textAlign: 'center' },
});
