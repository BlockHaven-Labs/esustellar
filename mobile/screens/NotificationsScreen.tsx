import React, { useEffect } from 'react';
import { View, FlatList } from 'react-native';
import { useNotificationsStore } from '../stores/notificationsStore';
import { NotificationItem } from '../components/NotificationItem';

export const NotificationsScreen = () => {
  const { notifications, setNotifications } = useNotificationsStore();

  useEffect(() => {
    // Mock fetch (replace with API)
    const data = [
      {
        id: '1',
        title: 'Welcome',
        message: 'Thanks for joining!',
        read: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'Update',
        message: 'New feature released',
        read: false,
        createdAt: new Date().toISOString(),
      },
    ];

    setNotifications(data);
  }, []);

  return (
    <View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationItem item={item} />}
      />
    </View>
  );
};