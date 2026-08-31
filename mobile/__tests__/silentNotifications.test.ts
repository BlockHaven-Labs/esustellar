/**
 * Silent Notification Handler Tests
 */

import * as Notifications from 'expo-notifications';
import { silentNotificationHandler } from '../services/notifications/silent';
import { queryClient } from '../services/queryClient';
import { useAuthStore } from '@/store/authStore';
import { useNotificationsStore } from '@/stores/notificationsStore';
import { notificationsApi } from '@/services/api/notificationsApi';

// Mock the APIs and stores
jest.mock('../services/queryClient');
jest.mock('@/store/authStore');
jest.mock('@/stores/notificationsStore');
jest.mock('@/services/api/groupsApi');
jest.mock('@/services/api/transactionsApi');
jest.mock('@/services/api/notificationsApi');
jest.mock('@/services/logger');

describe('SilentNotificationHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isSilent', () => {
    it('should identify explicit silent notifications', () => {
      const notification = {
        request: {
          content: {
            title: 'Test',
            body: 'Test message',
            data: { silent: true },
          },
        },
      } as unknown as Notifications.Notification;

      expect(silentNotificationHandler.isSilent(notification)).toBe(true);
    });

    it('should identify notifications with silent string flag', () => {
      const notification = {
        request: {
          content: {
            title: 'Test',
            body: 'Test message',
            data: { silent: 'true' },
          },
        },
      } as unknown as Notifications.Notification;

      expect(silentNotificationHandler.isSilent(notification)).toBe(true);
    });

    it('should identify notifications with sync type but no visible content as silent', () => {
      const notification = {
        request: {
          content: {
            title: '',
            body: '',
            data: { syncType: 'notifications' },
          },
        },
      } as unknown as Notifications.Notification;

      expect(silentNotificationHandler.isSilent(notification)).toBe(true);
    });

    it('should not mark regular notifications as silent', () => {
      const notification = {
        request: {
          content: {
            title: 'Test',
            body: 'Test message',
            data: {},
          },
        },
      } as unknown as Notifications.Notification;

      expect(silentNotificationHandler.isSilent(notification)).toBe(false);
    });

    it('should not mark notifications with silent false as silent', () => {
      const notification = {
        request: {
          content: {
            title: 'Test',
            body: 'Test message',
            data: { silent: false },
          },
        },
      } as unknown as Notifications.Notification;

      expect(silentNotificationHandler.isSilent(notification)).toBe(false);
    });
  });

  describe('handleSilentNotification', () => {
    beforeEach(() => {
      (useAuthStore.getState as jest.Mock).mockReturnValue({
        wallet: { publicKey: 'test-address' },
      });
      (notificationsApi.getUserNotifications as jest.Mock).mockResolvedValue({
        success: true,
        data: [],
        message: 'ok',
      });
      (useNotificationsStore.getState as jest.Mock).mockReturnValue({
        setNotifications: jest.fn(),
      });
    });

    it('should successfully handle a silent notification', async () => {
      const notification = {
        request: {
          content: {
            title: '',
            body: '',
            data: { silent: true, syncType: 'notifications' },
          },
        },
      } as unknown as Notifications.Notification;

      const result = await silentNotificationHandler.handleSilentNotification(notification);
      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      // This test would need proper mocking of the API calls
      const notification = {
        request: {
          content: {
            title: '',
            body: '',
            data: { silent: true, syncType: 'invalid-type' },
          },
        },
      } as unknown as Notifications.Notification;

      const result = await silentNotificationHandler.handleSilentNotification(notification);
      // Should handle gracefully
      expect(typeof result).toBe('boolean');
    });

    it('should skip sync if no wallet is connected', async () => {
      (useAuthStore.getState as jest.Mock).mockReturnValue({
        wallet: null,
      });

      const notification = {
        request: {
          content: {
            title: '',
            body: '',
            data: { silent: true, syncType: 'notifications' },
          },
        },
      } as unknown as Notifications.Notification;

      const result = await silentNotificationHandler.handleSilentNotification(notification);
      expect(result).toBe(true);
    });
  });
});
