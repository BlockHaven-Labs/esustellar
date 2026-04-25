import { getRouteFromNotificationData } from '../../services/notifications/notificationRouting';

describe('getRouteFromNotificationData', () => {
  it('maps a group detail notification to the group route', () => {
    expect(
      getRouteFromNotificationData({
        params: { groupId: 42 },
        screen: 'groups/detail',
      })
    ).toEqual({
      pathname: '/groups/[groupId]',
      params: { groupId: '42' },
    });
  });

  it('falls back to the home route for unknown screens', () => {
    expect(
      getRouteFromNotificationData({
        screen: 'something-else',
      })
    ).toBe('/(tabs)');
  });

  it('falls back to home when group detail params are missing', () => {
    expect(
      getRouteFromNotificationData({
        screen: 'groups/detail',
      })
    ).toBe('/(tabs)');
  });
});
