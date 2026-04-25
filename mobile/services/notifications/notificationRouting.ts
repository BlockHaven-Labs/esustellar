export type NotificationTarget =
  | string
  | {
      pathname: string;
      params?: Record<string, string>;
    };

function toStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<
    Record<string, string>
  >((accumulator, [key, entryValue]) => {
    if (entryValue === undefined || entryValue === null) {
      return accumulator;
    }

    accumulator[key] = String(entryValue);
    return accumulator;
  }, {});
}

export function getRouteFromNotificationData(data: unknown): NotificationTarget {
  const payload =
    data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const screen =
    typeof payload.screen === 'string'
      ? payload.screen.replace(/^\//, '')
      : '';
  const params = toStringRecord(payload.params);

  switch (screen) {
    case '(tabs)':
    case 'home':
    case 'index':
      return '/(tabs)';
    case 'notifications':
      return '/notifications';
    case 'contributions/success':
      return '/contributions/success';
    case 'groups/detail':
    case 'group/detail':
    case 'groups/[groupId]': {
      const groupId = params.groupId ?? params.id;

      if (!groupId) {
        return '/(tabs)';
      }

      return {
        pathname: '/groups/[groupId]',
        params: { groupId },
      };
    }
    default:
      return '/(tabs)';
  }
}
