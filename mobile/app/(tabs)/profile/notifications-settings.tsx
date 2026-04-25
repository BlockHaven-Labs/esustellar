import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';

// Fallback storage implementation since AsyncStorage isn't available
const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      // Try to use localStorage as fallback (works in Expo Go)
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Silent fail for demo purposes
    }
  }
};

const STORAGE_KEY = 'notification_settings';

interface NotificationSettings {
  contributionReminders: boolean;
  payoutReceived: boolean;
  newMemberJoined: boolean;
  groupStatusChanges: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  contributionReminders: true,
  payoutReceived: true,
  newMemberJoined: false,
  groupStatusChanges: true,
};

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await storage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await storage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  };

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notification Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.description}>
            Choose which push notifications you want to receive
          </Text>

          <View style={styles.settingsList}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Contribution Reminders</Text>
                <Text style={styles.settingDescription}>
                  Get notified when your contributions are due
                </Text>
              </View>
              <Switch
                value={settings.contributionReminders}
                onValueChange={(value: boolean) => updateSetting('contributionReminders', value)}
                trackColor={{ false: '#767577', true: '#4CAF50' }}
                thumbColor={settings.contributionReminders ? '#ffffff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Payout Received</Text>
                <Text style={styles.settingDescription}>
                  Notifications when you receive payouts
                </Text>
              </View>
              <Switch
                value={settings.payoutReceived}
                onValueChange={(value: boolean) => updateSetting('payoutReceived', value)}
                trackColor={{ false: '#767577', true: '#4CAF50' }}
                thumbColor={settings.payoutReceived ? '#ffffff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>New Member Joined</Text>
                <Text style={styles.settingDescription}>
                  When new members join your groups
                </Text>
              </View>
              <Switch
                value={settings.newMemberJoined}
                onValueChange={(value: boolean) => updateSetting('newMemberJoined', value)}
                trackColor={{ false: '#767577', true: '#4CAF50' }}
                thumbColor={settings.newMemberJoined ? '#ffffff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Group Status Changes</Text>
                <Text style={styles.settingDescription}>
                  Updates when group status changes
                </Text>
              </View>
              <Switch
                value={settings.groupStatusChanges}
                onValueChange={(value: boolean) => updateSetting('groupStatusChanges', value)}
                trackColor={{ false: '#767577', true: '#4CAF50' }}
                thumbColor={settings.groupStatusChanges ? '#ffffff' : '#f4f3f4'}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  description: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  settingsList: {
    gap: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
  },
});
