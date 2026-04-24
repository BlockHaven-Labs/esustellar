import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuthStore } from '../../store/authStore';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function HomeHeader() {
  const wallet = useAuthStore((s) => s.wallet);
  const displayName = wallet ? truncateAddress(wallet.publicKey) : 'EsuStellar User';

  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.address}>{displayName}</Text>
      </View>
      <TouchableOpacity
        accessibilityLabel="Notifications"
        accessibilityRole="button"
        onPress={() => console.log('notifications')}
        style={styles.bell}
      >
        <Text style={styles.bellIcon}>🔔</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <HomeHeader />
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Total Balance</Text>
        <Text style={styles.sectionValue}>— XLM</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Quick Actions</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: { fontSize: 22, fontWeight: '700', color: '#F8FAFC' },
  address: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  bell: { padding: 8 },
  bellIcon: { fontSize: 22 },
  section: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionLabel: { fontSize: 13, color: '#94A3B8', marginBottom: 4 },
  sectionValue: { fontSize: 24, fontWeight: '700', color: '#F8FAFC' },
});
