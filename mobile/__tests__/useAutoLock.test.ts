import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAutoLockTimeout,
  setAutoLockTimeout,
  DEFAULT_TIMEOUT,
  AUTO_LOCK_OPTIONS,
} from '@/hooks/useAutoLock';

describe('useAutoLock helpers', () => {
  beforeEach(() => AsyncStorage.clear());

  it('returns default timeout when nothing stored', async () => {
    const t = await getAutoLockTimeout();
    expect(t).toBe(DEFAULT_TIMEOUT);
  });

  it('persists and retrieves timeout', async () => {
    await setAutoLockTimeout(60);
    const t = await getAutoLockTimeout();
    expect(t).toBe(60);
  });

  it('supports Never (0)', async () => {
    await setAutoLockTimeout(0);
    expect(await getAutoLockTimeout()).toBe(0);
  });

  it('has 4 options including Never', () => {
    expect(AUTO_LOCK_OPTIONS).toHaveLength(4);
    expect(AUTO_LOCK_OPTIONS.some((o) => o.value === 0)).toBe(true);
  });
});
