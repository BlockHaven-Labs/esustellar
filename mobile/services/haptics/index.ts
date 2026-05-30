import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

type ImpactLevel = 'light' | 'medium' | 'heavy';

function runImpact(level: ImpactLevel) {
  if (Platform.OS === 'web') return;
  try {
    const styleMap = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    };
    Haptics.impactAsync(styleMap[level]);
  } catch {
    // Silently fail if haptics aren't supported (e.g., simulators).
  }
}

function runNotification(type: Haptics.NotificationFeedbackType) {
  if (Platform.OS === 'web') return;
  try {
    Haptics.notificationAsync(type);
  } catch {
    // Silently fail if haptics aren't supported (e.g., simulators).
  }
}

export const triggerHapticFeedback = {
  light: () => runImpact('light'),
  medium: () => runImpact('medium'),
  heavy: () => runImpact('heavy'),
  selection: () => {
    if (Platform.OS === 'web') return;
    try {
      Haptics.selectionAsync();
    } catch {
      // Silently fail if haptics aren't supported (e.g., simulators).
    }
  },
  success: () => runNotification(Haptics.NotificationFeedbackType.Success),
  warning: () => runNotification(Haptics.NotificationFeedbackType.Warning),
  error: () => runNotification(Haptics.NotificationFeedbackType.Error),
};
