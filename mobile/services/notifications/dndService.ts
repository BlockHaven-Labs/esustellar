/**
 * Do-Not-Disturb (DND) Service
 *
 * Persists quiet-hours settings to AsyncStorage and provides a runtime
 * check (`isInDndWindow`) that the notification handler uses to decide
 * whether to suppress a notification.
 *
 * Storage key: esustellar.notifications.dnd
 *
 * Time values are stored as "HH:MM" strings (24-hour) so they are
 * timezone-agnostic and trivially serialisable.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../logger';

// ─── Storage key ──────────────────────────────────────────────────────────────

export const DND_SETTINGS_KEY = 'esustellar.notifications.dnd';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DndSettings = {
  /** Whether DND mode is active. */
  enabled: boolean;
  /**
   * Start of the quiet window, 24-hour "HH:MM".
   * e.g. "22:00" means 10 PM.
   */
  startTime: string;
  /**
   * End of the quiet window, 24-hour "HH:MM".
   * e.g. "07:00" means 7 AM.
   * May be numerically less than startTime when the window crosses midnight.
   */
  endTime: string;
};

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_DND_SETTINGS: DndSettings = {
  enabled: false,
  startTime: '22:00',
  endTime: '07:00',
};

// ─── Validation ───────────────────────────────────────────────────────────────

/** Returns true when the string matches "HH:MM" in the range 00:00–23:59. */
export function isValidTimeString(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [h, m] = value.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

/** Load persisted DND settings, falling back to defaults on any error. */
export async function loadDndSettings(): Promise<DndSettings> {
  try {
    const raw = await AsyncStorage.getItem(DND_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_DND_SETTINGS };

    const parsed = JSON.parse(raw) as Partial<DndSettings>;

    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_DND_SETTINGS.enabled,
      startTime:
        typeof parsed.startTime === 'string' && isValidTimeString(parsed.startTime)
          ? parsed.startTime
          : DEFAULT_DND_SETTINGS.startTime,
      endTime:
        typeof parsed.endTime === 'string' && isValidTimeString(parsed.endTime)
          ? parsed.endTime
          : DEFAULT_DND_SETTINGS.endTime,
    };
  } catch (error) {
    logger.warn('[dnd] Failed to load DND settings, using defaults', { error });
    return { ...DEFAULT_DND_SETTINGS };
  }
}

/** Persist DND settings to AsyncStorage. */
export async function saveDndSettings(settings: DndSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(DND_SETTINGS_KEY, JSON.stringify(settings));
    logger.debug('[dnd] Settings saved', {
      enabled: settings.enabled,
      startTime: settings.startTime,
      endTime: settings.endTime,
    });
  } catch (error) {
    logger.warn('[dnd] Failed to save DND settings', { error });
  }
}

// ─── Runtime check ────────────────────────────────────────────────────────────

/**
 * Convert an "HH:MM" string to minutes-since-midnight.
 * @internal
 */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Returns true if the current local time falls inside the quiet window
 * defined by `settings`.
 *
 * Handles overnight windows (e.g. 22:00 → 07:00) correctly.
 */
export function isTimeInDndWindow(
  settings: DndSettings,
  now: Date = new Date(),
): boolean {
  if (!settings.enabled) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = toMinutes(settings.startTime);
  const endMinutes = toMinutes(settings.endTime);

  if (startMinutes <= endMinutes) {
    // Same-day window (e.g. 09:00 → 17:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Overnight window (e.g. 22:00 → 07:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

/**
 * Async convenience wrapper — loads settings from storage then evaluates
 * whether the current time is inside the quiet window.
 *
 * Use this in notification handlers where you only need a boolean answer.
 */
export async function isInDndWindow(): Promise<boolean> {
  const settings = await loadDndSettings();
  return isTimeInDndWindow(settings);
}
