import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../context/ThemeContext';
import { useRefresh } from '../../hooks/useRefresh';
import { useInvalidateGroups } from '../../hooks/useGroups';
import { useInvalidateTransactions } from '../../hooks/useTransactions';
import { useInvalidateNotifications } from '../../hooks/useNotifications';
import { triggerHapticFeedback } from '../../utils/haptics';
import { logger } from '../../services/logger';
import WalletSwitcher from '../../components/wallet/WalletSwitcher';
import { getActiveWallet, WalletEntry } from '../../services/wallet/multiWallet';
import { useKillSwitchStore } from '../../stores/killSwitchStore';
import { useKillSwitch } from '../../hooks/useKillSwitch';

function getGreeting(hour: number, t: any): string {
  if (hour < 12) return t('home.goodMorning');
  if (hour < 18) return t('home.goodAfternoon');
  return t('home.goodEvening');
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const HomeHeader = React.memo(() => {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const wallet = useAuthStore((s) => s.wallet);
  const setWallet = useAuthStore((s) => s.setWallet);
  const [switcherVisible, setSwitcherVisible] = useState(false);

  const displayName = useMemo(
    () => (wallet ? truncateAddress(wallet.publicKey) : t('home.defaultUser')),
    [wallet, t],
  );
  const greeting = useMemo(
    () => getGreeting(new Date().getHours(), t),
    [t],
  );

  const handleWalletChanged = useCallback(
    (walletEntry: WalletEntry) => {
      setWallet({ publicKey: walletEntry.publicKey, walletType: 'multiWallet' });
    },
    [setWallet],
  );

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.accountInfo}
          aria-label="Switch wallet"
          role="button"
          onPress={() => setSwitcherVisible(true)}
        >
          <Text style={[styles.greeting, { color: colors.text }]}>{greeting}</Text>
          <Text style={[styles.address, { color: colors.subtext }]}>{displayName}</Text>
          <Text style={[styles.switchHint, { color: colors.subtext }]}>Tap to switch wallets</Text>
        </TouchableOpacity>

        <TouchableOpacity
          aria-label={t('home.notifications')}
          role="button"
          onPress={() => {
            triggerHapticFeedback.selection();
            router.push('/notifications');
          }}
          style={styles.bell}
        >
          <Text style={styles.bellIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      <WalletSwitcher
        visible={switcherVisible}
        onClose={() => setSwitcherVisible(false)}
        onWalletChanged={handleWalletChanged}
        onAddWallet={() => router.push('/wallet/add')}
      />
    </>
  );
});

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const wallet = useAuthStore((s) => s.wallet);
  const setWallet = useAuthStore((s) => s.setWallet);

  const invalidateGroups = useInvalidateGroups();
  const invalidateTransactions = useInvalidateTransactions();
  const invalidateNotifications = useInvalidateNotifications();

  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (wallet) return;

    let active = true;

    void (async () => {
      const activeWallet = await getActiveWallet();
      if (!active || !activeWallet) return;
      setWallet({ publicKey: activeWallet.publicKey, walletType: 'multiWallet' });
    })();

    return () => {
      active = false;
    };
  }, [wallet, setWallet]);

  useEffect(() => {
    void (async () => {
      try {
        const complete = await AsyncStorage.getItem('tutorialComplete');
        if (complete !== 'true') {
          setShowTutorial(true);
        }
      } catch (e) {
        logger.error('HomeScreen', 'Failed to read tutorial status', e as Error);
      }
    })();
  }, []);

  const fetchData = useMemo(
    () => async () => {
      logger.info('Refreshing home data', { component: 'HomeScreen' });
      await Promise.all([
        invalidateGroups(),
        invalidateTransactions(),
        invalidateNotifications(),
      ]);
    },
    [invalidateGroups, invalidateTransactions, invalidateNotifications],
  );

  const { refreshing, onRefresh } = useRefresh(fetchData);

  const startPolling = useKillSwitchStore((s) => s.startPolling);
  const stopPolling = useKillSwitchStore((s) => s.stopPolling);
  const contributions = useKillSwitch('contributions');
  const groupCreation = useKillSwitch('group-creation');

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >
      <HomeHeader />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.subtext }]}>{t('home.totalBalance')}</Text>
        <Text style={[styles.sectionValue, { color: colors.text }]}>{t('home.balanceValue')}</Text>
      </View>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.subtext }]}>{t('home.quickActions')}</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[
              styles.quickActionButton,
              { backgroundColor: contributions.isEnabled ? colors.accent : colors.border },
            ]}
            disabled={!contributions.isEnabled}
            onPress={() => {
              triggerHapticFeedback.selection();
              router.push('/contributions/wallet');
            }}
            accessibilityRole="button"
            accessibilityLabel="Contribute"
            accessibilityState={{ disabled: !contributions.isEnabled }}
          >
            <Text style={[styles.quickActionLabel, { color: contributions.isEnabled ? '#fff' : colors.subtext }]}>
              Contribute
            </Text>
          </TouchableOpacity>
          {!contributions.isEnabled && (
            <Text style={[styles.killSwitchMessage, { color: colors.subtext }]}>
              {contributions.disabledMessage}
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.quickActionButton,
              { backgroundColor: groupCreation.isEnabled ? colors.accent : colors.border },
            ]}
            disabled={!groupCreation.isEnabled}
            onPress={() => {
              triggerHapticFeedback.selection();
              router.push('/groups/create');
            }}
            accessibilityRole="button"
            accessibilityLabel="Create group"
            accessibilityState={{ disabled: !groupCreation.isEnabled }}
          >
            <Text style={[styles.quickActionLabel, { color: groupCreation.isEnabled ? '#fff' : colors.subtext }]}>
              New Group
            </Text>
          </TouchableOpacity>
          {!groupCreation.isEnabled && (
            <Text style={[styles.killSwitchMessage, { color: colors.subtext }]}>
              {groupCreation.disabledMessage}
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  accountInfo: {
    flex: 1,
  },
  greeting: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  address: { fontSize: 14, fontWeight: '500', opacity: 0.9 },
  switchHint: { fontSize: 12, marginTop: 6, opacity: 0.7 },
  bell: { padding: 10, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 20 },
  bellIcon: { fontSize: 20 },
  section: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  sectionLabel: { fontSize: 13, marginBottom: 4 },
  sectionValue: { fontSize: 24, fontWeight: '700' },
  actionButton: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  quickActions: {
    marginTop: 12,
    gap: 10,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 10,
  },
  quickActionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  killSwitchMessage: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
