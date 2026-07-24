/**
 * Notification Analytics Service
 * Tracks notification engagement metrics: opens, clicks/actions, and aggregated stats.
 *
 * All data is persisted locally via AsyncStorage following the same pattern
 * used by services/performance/index.ts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationType } from '../../types/notification';
import { logger } from '../logger';

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const ANALYTICS_EVENTS_KEY = 'esustellar_notification_analytics_events';
const ANALYTICS_AGGREGATES_KEY = 'esustellar_notification_analytics_aggregates';

// ─── Types ────────────────────────────────────────────────────────────────────

/** The kind of interaction being recorded. */
export type NotificationEventType = 'open' | 'click' | 'dismiss' | 'action';

/** A single raw analytics event stored locally. */
export type NotificationAnalyticsEvent = {
  /** Unique event identifier. */
  eventId: string;
  /** The notification that was interacted with. */
  notificationId: string;
  /** High-level category of the notification (contribution, payout, member, status). */
  notificationType: NotificationType | 'unknown';
  /** What the user did. */
  eventType: NotificationEventType;
  /** Optional action label, e.g. "view_group" or "pay_now". */
  actionLabel?: string;
  /** ISO-8601 timestamp when the event was recorded. */
  recordedAt: string;
};

/**
 * Aggregated totals per notification type.
 * Stored as a flat record so it can be serialised/deserialised easily.
 */
export type NotificationTypeAggregates = {
  opens: number;
  clicks: number;
  dismissals: number;
  actions: number;
};

/** Full aggregates shape saved to AsyncStorage. */
export type NotificationAnalyticsAggregates = {
  /** Total events across every notification type. */
  totals: NotificationTypeAggregates;
  /** Per-type breakdown. */
  byType: Record<string, NotificationTypeAggregates>;
  /** ISO-8601 timestamp of the most recent update. */
  lastUpdatedAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateEventId(): string {
  return `notif_evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function emptyAggregates(): NotificationTypeAggregates {
  return { opens: 0, clicks: 0, dismissals: 0, actions: 0 };
}

function incrementAggregates(
  agg: NotificationTypeAggregates,
  eventType: NotificationEventType,
): NotificationTypeAggregates {
  return {
    opens: agg.opens + (eventType === 'open' ? 1 : 0),
    clicks: agg.clicks + (eventType === 'click' ? 1 : 0),
    dismissals: agg.dismissals + (eventType === 'dismiss' ? 1 : 0),
    actions: agg.actions + (eventType === 'action' ? 1 : 0),
  };
}

// ─── Core: read / write raw events ───────────────────────────────────────────

async function readEvents(): Promise<NotificationAnalyticsEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(ANALYTICS_EVENTS_KEY);
    return raw ? (JSON.parse(raw) as NotificationAnalyticsEvent[]) : [];
  } catch (error) {
    logger.warn('[analytics/notifications] Failed to read events', { error });
    return [];
  }
}

async function appendEvent(event: NotificationAnalyticsEvent): Promise<void> {
  try {
    const existing = await readEvents();
    await AsyncStorage.setItem(
      ANALYTICS_EVENTS_KEY,
      JSON.stringify([...existing, event]),
    );
  } catch (error) {
    logger.warn('[analytics/notifications] Failed to persist event', { error });
  }
}

// ─── Core: read / write aggregates ───────────────────────────────────────────

async function readAggregates(): Promise<NotificationAnalyticsAggregates> {
  try {
    const raw = await AsyncStorage.getItem(ANALYTICS_AGGREGATES_KEY);
    if (raw) {
      return JSON.parse(raw) as NotificationAnalyticsAggregates;
    }
  } catch (error) {
    logger.warn('[analytics/notifications] Failed to read aggregates', { error });
  }

  return {
    totals: emptyAggregates(),
    byType: {},
    lastUpdatedAt: new Date().toISOString(),
  };
}

async function updateAggregates(
  notificationType: string,
  eventType: NotificationEventType,
): Promise<void> {
  try {
    const current = await readAggregates();

    const updatedTotals = incrementAggregates(current.totals, eventType);
    const existingByType = current.byType[notificationType] ?? emptyAggregates();
    const updatedByType = incrementAggregates(existingByType, eventType);

    const updated: NotificationAnalyticsAggregates = {
      totals: updatedTotals,
      byType: {
        ...current.byType,
        [notificationType]: updatedByType,
      },
      lastUpdatedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(ANALYTICS_AGGREGATES_KEY, JSON.stringify(updated));
  } catch (error) {
    logger.warn('[analytics/notifications] Failed to update aggregates', { error });
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Log a raw analytics event and update the running aggregates.
 * This is the lowest-level function; prefer the typed helpers below.
 */
export async function logNotificationEvent(
  event: Omit<NotificationAnalyticsEvent, 'eventId' | 'recordedAt'>,
): Promise<void> {
  const fullEvent: NotificationAnalyticsEvent = {
    ...event,
    eventId: generateEventId(),
    recordedAt: new Date().toISOString(),
  };

  logger.debug('[analytics/notifications] Event logged', {
    eventType: fullEvent.eventType,
    notificationId: fullEvent.notificationId,
    notificationType: fullEvent.notificationType,
    actionLabel: fullEvent.actionLabel,
  });

  await Promise.all([
    appendEvent(fullEvent),
    updateAggregates(fullEvent.notificationType, fullEvent.eventType),
  ]);
}

/**
 * Track a notification open — fired when the user taps a push/local notification
 * and the app becomes active.
 */
export async function trackNotificationOpen(
  notificationId: string,
  notificationType: NotificationType | 'unknown' = 'unknown',
): Promise<void> {
  await logNotificationEvent({
    notificationId,
    notificationType,
    eventType: 'open',
  });
}

/**
 * Track a notification click or CTA action inside the app (e.g. "Pay Now").
 *
 * @param actionLabel  Short label identifying which action was taken.
 */
export async function trackNotificationClick(
  notificationId: string,
  notificationType: NotificationType | 'unknown' = 'unknown',
  actionLabel?: string,
): Promise<void> {
  await logNotificationEvent({
    notificationId,
    notificationType,
    eventType: actionLabel ? 'action' : 'click',
    actionLabel,
  });
}

/**
 * Track when the user explicitly dismisses a notification without acting on it.
 */
export async function trackNotificationDismiss(
  notificationId: string,
  notificationType: NotificationType | 'unknown' = 'unknown',
): Promise<void> {
  await logNotificationEvent({
    notificationId,
    notificationType,
    eventType: 'dismiss',
  });
}

// ─── Aggregate Queries ────────────────────────────────────────────────────────

/**
 * Returns the full aggregated metrics snapshot.
 * Suitable for a dashboard or debug screen.
 */
export async function getNotificationAnalyticsAggregates(): Promise<NotificationAnalyticsAggregates> {
  return readAggregates();
}

/**
 * Returns per-type aggregates for a given notification type.
 */
export async function getAggregatesByType(
  notificationType: NotificationType | 'unknown',
): Promise<NotificationTypeAggregates> {
  const aggregates = await readAggregates();
  return aggregates.byType[notificationType] ?? emptyAggregates();
}

/**
 * Computes an engagement rate (opens / total delivered) for a given type.
 * Returns 0 if no events have been recorded yet.
 *
 * Note: "delivered" is approximated as opens + dismissals since we do not
 * track delivery separately at this layer.
 */
export async function getEngagementRate(
  notificationType?: NotificationType | 'unknown',
): Promise<number> {
  const agg = notificationType
    ? await getAggregatesByType(notificationType)
    : (await readAggregates()).totals;

  const delivered = agg.opens + agg.dismissals;
  if (delivered === 0) return 0;

  return Number((agg.opens / delivered).toFixed(4));
}

// ─── Raw Event Access ─────────────────────────────────────────────────────────

/**
 * Returns all raw analytics events, optionally filtered by notification type.
 * Useful for debugging or exporting data.
 */
export async function getNotificationEvents(filter?: {
  notificationType?: NotificationType | 'unknown';
  eventType?: NotificationEventType;
  since?: string; // ISO-8601
}): Promise<NotificationAnalyticsEvent[]> {
  const events = await readEvents();

  if (!filter) return events;

  return events.filter((e) => {
    if (filter.notificationType && e.notificationType !== filter.notificationType)
      return false;
    if (filter.eventType && e.eventType !== filter.eventType) return false;
    if (filter.since && e.recordedAt < filter.since) return false;
    return true;
  });
}

// ─── Maintenance ──────────────────────────────────────────────────────────────

/**
 * Removes raw events older than `maxAgeDays` (default 90 days).
 * Aggregates are NOT affected — they are cumulative by design.
 * Call this periodically, e.g. on app startup.
 */
export async function pruneOldEvents(maxAgeDays = 90): Promise<void> {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - maxAgeDays);
    const cutoffIso = cutoff.toISOString();

    const events = await readEvents();
    const pruned = events.filter((e) => e.recordedAt >= cutoffIso);

    await AsyncStorage.setItem(ANALYTICS_EVENTS_KEY, JSON.stringify(pruned));

    logger.debug('[analytics/notifications] Pruned old events', {
      removed: events.length - pruned.length,
      remaining: pruned.length,
    });
  } catch (error) {
    logger.warn('[analytics/notifications] Failed to prune events', { error });
  }
}

/**
 * Clears all analytics data. Intended for testing or user-initiated data reset.
 */
export async function clearNotificationAnalytics(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(ANALYTICS_EVENTS_KEY),
    AsyncStorage.removeItem(ANALYTICS_AGGREGATES_KEY),
  ]);
  logger.info('[analytics/notifications] Analytics data cleared');
}
