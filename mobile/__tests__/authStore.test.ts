jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('authStore colorScheme persistence', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await useAuthStore.persist.clearStorage();
    useAuthStore.setState({
      wallet: null,
      session: {
        isActive: false,
        connectedAt: null,
      },
      colorScheme: 'system',
    });
  });

  it('persists selected colorScheme', async () => {
    useAuthStore.getState().setColorScheme('dark');
    await flush();

    const raw = await AsyncStorage.getItem('esustellar-auth');

    expect(raw).toContain('"colorScheme":"dark"');
  });

  it('rehydrates colorScheme after restart', async () => {
    useAuthStore.getState().setColorScheme('light');
    await flush();

    useAuthStore.setState({ colorScheme: 'system' });
    expect(useAuthStore.getState().colorScheme).toBe('system');

    await useAuthStore.persist.rehydrate();

    expect(useAuthStore.getState().colorScheme).toBe('light');
  });
});
