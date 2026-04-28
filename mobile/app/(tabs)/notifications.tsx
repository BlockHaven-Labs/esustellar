import React, { useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import Button from '../../components/ui/Button';
import { scheduleLocalNotification } from '../../services/notifications/notificationService';
import { useTheme } from '../../context/ThemeContext';
import { logger } from '../../utils/logger';

export default function NotificationsScreen() {
  const [scheduling, setScheduling] = useState(false);
  const { colors } = useTheme();

  const scheduleGroupNotification = async () => {
    setScheduling(true);
    logger.info('NotificationsScreen', 'Scheduling group notification');

    try {
      await scheduleLocalNotification({
        body: 'Tap to open the group detail screen.',
        data: {
          params: { groupId: '1' },
          screen: 'groups/detail',
        },
        seconds: 2,
        title: 'Contribution due',
      });

      Alert.alert(
        'Notification scheduled',
        'A test notification will appear in 2 seconds.'
      );
    } catch (err) {
      logger.error('NotificationsScreen', 'Failed to schedule notification', err);
      Alert.alert('Unable to schedule notification', 'Please try again.');
    } finally {
      setScheduling(false);
    }
  };

  const scheduleUnknownRouteNotification = async () => {
    setScheduling(true);
    logger.info('NotificationsScreen', 'Scheduling fallback notification');

    try {
      await scheduleLocalNotification({
        body: 'Tap to test the home-screen fallback route.',
        data: {
          screen: 'unsupported-screen',
        },
        seconds: 2,
        title: 'Unknown destination',
      });

      Alert.alert(
        'Fallback notification scheduled',
        'A test notification with an unknown route will appear in 2 seconds.'
      );
    } catch (err) {
      logger.error('NotificationsScreen', 'Failed to schedule fallback notification', err);
      Alert.alert('Unable to schedule notification', 'Please try again.');
    } finally {
      setScheduling(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>
          Trigger a local notification to verify foreground banners and tap
          navigation.
        </Text>

        <Button
          disabled={scheduling}
          onPress={scheduleGroupNotification}
          style={styles.button}
        >
          Schedule Group Detail Notification
        </Button>
        <Button
          disabled={scheduling}
          onPress={scheduleUnknownRouteNotification}
          style={styles.button}
          variant="outline"
        >
          Schedule Fallback Notification
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    marginBottom: 12,
  },
});
