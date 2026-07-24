import {
  registerForPushNotificationsAsync,
  scheduleLocalNotification,
} from '@/services/notifications';

describe('notifications', () => {
  it('returns push token on a device', async () => {
    const token = await registerForPushNotificationsAsync();
    expect(token).toBe('ExponentPushToken[test]');
  });

  it('schedules a local notification', async () => {
    const id = await scheduleLocalNotification('Hello', 'World');
    expect(id).toBe('notification-id');
  });
});
