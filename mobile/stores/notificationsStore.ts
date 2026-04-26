import { create } from 'zustand';
import { Notification } from '../types/notification';

type NotificationsState = {
  notifications: Notification[];
  unreadCount: number;

  setNotifications: (items: Notification[]) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [],
  unreadCount: 0,

  setNotifications: (items) =>
    set(() => ({
      notifications: items,
      unreadCount: items.filter((n) => !n.read).length,
    })),

  markRead: (id) =>
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );

      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    }),

  markAllRead: () =>
    set((state) => {
      const updated = state.notifications.map((n) => ({
        ...n,
        read: true,
      }));

      return {
        notifications: updated,
        unreadCount: 0,
      };
    }),
}));