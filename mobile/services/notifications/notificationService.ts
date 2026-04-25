import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const NOTIFICATION_PROMPT_HANDLED_KEY =
  'esustellar.notifications.promptHandled';
export const NOTIFICATION_PERMISSION_STATUS_KEY =
  'esustellar.notifications.permissionStatus';

export async function hasHandledNotificationPrompt(): Promise<boolean> {
  return (await AsyncStorage.getItem(NOTIFICATION_PROMPT_HANDLED_KEY)) === 'true';
}

export async function markNotificationPromptHandled(
  status: string
): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(NOTIFICATION_PROMPT_HANDLED_KEY, 'true'),
    AsyncStorage.setItem(NOTIFICATION_PERMISSION_STATUS_KEY, status),
  ]);
}

export async function registerForPushNotificationsAsync(): Promise<{
  status: Notifications.PermissionStatus;
  token?: string;
}> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  let { status } = await Notifications.getPermissionsAsync();

  if (status !== 'granted') {
    const permissionResponse = await Notifications.requestPermissionsAsync();
    status = permissionResponse.status;
  }

  await markNotificationPromptHandled(status);

  if (status !== 'granted') {
    return { status };
  }

  try {
    const maybeExtra = Constants.expoConfig?.extra as
      | { eas?: { projectId?: string } }
      | undefined;
    const projectId = maybeExtra?.eas?.projectId ?? Constants.easConfig?.projectId;

    if (!projectId) {
      return { status };
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    return { status, token };
  } catch {
    return { status };
  }
}

export async function scheduleLocalNotification(options?: {
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  seconds?: number;
}): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: options?.title ?? 'EsuStellar update',
      body:
        options?.body ?? 'Tap to open the latest update in your savings group.',
      data: options?.data ?? {},
    },
    trigger: {
      seconds: options?.seconds ?? 2,
    } as Notifications.TimeIntervalTriggerInput,
  });
}
