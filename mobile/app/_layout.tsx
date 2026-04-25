import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { NotificationBanner } from '../components/notifications/NotificationBanner';
import { getRouteFromNotificationData } from '../services/notifications/notificationRouting';

const ONBOARDING_KEY = 'onboardingComplete';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowAlert: true,
  }),
});

export default function RootLayout() {
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [checking, setChecking] = useState(true);
  const [banner, setBanner] = useState<{
    body?: string;
    data?: Record<string, unknown>;
    title: string;
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      if (!active) {
        return;
      }

      if (value === 'true') {
        router.replace('/wallet/connect');
      } else {
        router.replace('/onboarding');
      }

      setChecking(false);
    });

    return () => {
      active = false;
    };
  }, [router]);

  const dismissBanner = useCallback(() => {
    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = null;
    }

    setBanner(null);
  }, []);

  const navigateFromNotification = useCallback(
    (data?: Record<string, unknown>) => {
      dismissBanner();
      router.push(getRouteFromNotificationData(data) as never);
    },
    [dismissBanner, router]
  );

  const showBanner = useCallback((notification: Notifications.Notification) => {
    const content = notification.request.content;

    setBanner({
      body: content.body ?? undefined,
      data: (content.data ?? {}) as Record<string, unknown>,
      title: content.title ?? 'New notification',
    });

    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current);
    }

    bannerTimerRef.current = setTimeout(() => {
      setBanner(null);
      bannerTimerRef.current = null;
    }, 3000);
  }, []);

  useEffect(() => {
    const receivedSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        showBanner(notification);
      }
    );
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        navigateFromNotification(
          response.notification.request.content.data as Record<string, unknown>
        );
      });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) {
        return;
      }

      navigateFromNotification(
        response.notification.request.content.data as Record<string, unknown>
      );
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();

      if (bannerTimerRef.current) {
        clearTimeout(bannerTimerRef.current);
      }
    };
  }, [navigateFromNotification, showBanner]);

  if (checking) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <View style={styles.appShell}>
      <Slot />
      <NotificationBanner
        body={banner?.body}
        title={banner?.title ?? ''}
        visible={Boolean(banner)}
        onDismiss={dismissBanner}
        onPress={() => navigateFromNotification(banner?.data)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
