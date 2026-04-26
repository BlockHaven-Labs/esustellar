import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

type NotificationType = 'contribution' | 'payout' | 'member' | 'status';

interface NotificationItemProps {
  type: NotificationType;
  title: string;
  message: string;
  date: Date;
  read: boolean;
  onPress?: () => void;
}

const typeToEmoji: Record<NotificationType, string> = {
  contribution: '💰',
  payout: '💸',
  member: '👥',
  status: '📢',
};

// Before: plain FC — re-renders on every parent update
// After: React.memo — only re-renders when own props change
export const NotificationItem = React.memo<NotificationItemProps>(function NotificationItem({
  type,
  title,
  message,
  date,
  read,
  onPress,
}) {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.left}>
        {!read && <View style={styles.unreadDot} />}
        <Text style={styles.icon}>{typeToEmoji[type]}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message} numberOfLines={1}>
          {message}
        </Text>
      </View>
      <Text style={styles.date}>{dayjs(date).fromNow()}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF', // iOS blue
    marginRight: 6,
  },
  icon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  title: {
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 2,
  },
  message: {
    color: '#555',
    fontSize: 13,
  },
  date: {
    marginLeft: 8,
    fontSize: 12,
    color: '#999',
  },
});
