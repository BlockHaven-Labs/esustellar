import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { Notification } from '../types/notification';
import { useNotificationsStore } from '../stores/notificationsStore';

type Props = {
  item: Notification;
};

export const NotificationItem: React.FC<Props> = ({ item }) => {
  const markRead = useNotificationsStore((s) => s.markRead);

  const handlePress = () => {
    if (!item.read) {
      markRead(item.id);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      <View
        style={{
          padding: 12,
          backgroundColor: item.read ? '#fff' : '#eef6ff',
        }}
      >
        <Text style={{ fontWeight: item.read ? 'normal' : 'bold' }}>
          {item.title}
        </Text>
        <Text>{item.message}</Text>
      </View>
    </TouchableOpacity>
  );
};