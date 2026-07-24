import AsyncStorage from '@react-native-async-storage/async-storage';

export const SECURITY_PREFERENCES_KEY = 'esustellar.security.preferences';

export interface SecurityPreferences {
  biometricEnabled: boolean;
  pinEnabled: boolean;
}

const DEFAULT_SECURITY_PREFERENCES: SecurityPreferences = {
  biometricEnabled: false,
  pinEnabled: false,
};

export async function getSecurityPreferences(): Promise<SecurityPreferences> {
  try {
    const raw = await AsyncStorage.getItem(SECURITY_PREFERENCES_KEY);

    if (!raw) {
      return DEFAULT_SECURITY_PREFERENCES;
    }

    const parsed = JSON.parse(raw) as Partial<SecurityPreferences>;

    return {
      biometricEnabled: parsed.biometricEnabled ?? false,
      pinEnabled: parsed.pinEnabled ?? false,
    };
  } catch {
    return DEFAULT_SECURITY_PREFERENCES;
  }
}

export async function saveSecurityPreferences(
  updates: Partial<SecurityPreferences>
): Promise<SecurityPreferences> {
  const existing = await getSecurityPreferences();
  const next = { ...existing, ...updates };

  await AsyncStorage.setItem(SECURITY_PREFERENCES_KEY, JSON.stringify(next));

  return next;
}
