'use client';

import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { DisconnectModal } from '../../components/wallet/DisconnectModal';
import { useAuthStore } from '../../store/authStore';
import { shallow } from 'zustand/shallow';

// Truncate wallet address
function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function ProfileScreenContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const [wallet, logout] = useAuthStore((state) => [state.wallet, state.logout], shallow);
  const [disconnectModalVisible, setDisconnectModalVisible] = useState(false);

  const displayName = wallet ? truncateAddress(wallet.publicKey) : t('home.defaultUser');
  const walletAddress = wallet?.publicKey || 'GABCD1234EFGH5678IJKL9012MNOP';

  const handleDisconnect = () => {
    logout();
    setDisconnectModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header: Avatar, Name, Address */}
        <View style={styles.header}>
          <Avatar name={displayName} size="lg" />
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.walletAddress}>{truncateAddress(walletAddress)}</Text>
        </View>

        {/* Action Button */}
        <View style={styles.section}>
          <Button variant="outline" size="lg" onPress={() => router.push('/profile/edit')}>
            {t('profile.editProfile')}
          </Button>
        </View>

        {/* Settings Rows */}
        <View style={styles.section}>
          <Pressable
            style={styles.settingsRow}
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
          >
            <Text style={styles.settingsLabel}>{t('profile.settings')}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <View style={styles.separator} />

          <Pressable
            style={styles.settingsRow}
            onPress={() => setDisconnectModalVisible(true)}
            accessibilityRole="button"
          >
            <Text style={[styles.settingsLabel, { color: '#EF4444' }]}> 
              {t('profile.disconnectWallet')}
            </Text>
            <Text style={[styles.chevron, { color: '#EF4444' }]}>›</Text>
          </Pressable>
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      <DisconnectModal
        visible={disconnectModalVisible}
        onConfirm={handleDisconnect}
        onCancel={() => setDisconnectModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 24,
    paddingTop: 32,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  displayName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 16,
    marginBottom: 4,
  },
  walletAddress: {
    fontSize: 15,
    color: '#94A3B8',
  },
  section: {
    width: '100%',
    marginBottom: 16,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    backgroundColor: '#1E293B',
    borderRadius: 12,
  },
  settingsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  chevron: {
    fontSize: 24,
    color: '#64748B',
    lineHeight: 24,
  },
  separator: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 4,
  },
  spacer: {
    height: 20,
  },
});
