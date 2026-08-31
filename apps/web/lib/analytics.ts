export type FunnelEvent =
  | 'connect_attempt'
  | 'connect_success'
  | 'group_create_submit'
  | 'group_join'
  | 'contribute';

type EventRecord = {
  event: FunnelEvent;
  at: number;
  props: Record<string, string | number | boolean>;
};

const pendingEvents: EventRecord[] = [];

/**
 * Record a product funnel event.
 *
 * Privacy-conscious: never forwards wallet addresses or any PII.
 */
export function track(
  event: FunnelEvent,
  props: Record<string, string | number | boolean> = {}
): void {
  if (typeof window === 'undefined') {
    return;
  }
  pendingEvents.push({ event, at: Date.now(), props });
}