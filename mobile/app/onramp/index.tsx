import React from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { ONRAMP_PROVIDERS, OnRampProvider } from '../../services/onramp/providers';

export default function OnRampScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const handleSelectProvider = (provider: OnRampProvider) => {
    router.push(`/onramp/purchase?provider=${provider.id}`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={[styles.backText, { color: colors.accent }]}>← Back</Text>
        </Pressable>

        <Text style={[styles.title, { color: colors.text }]}>Buy Crypto</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>
          Purchase XLM directly into your Stellar wallet using a fiat on-ramp provider.
          KYC verification is handled securely by the provider.
        </Text>

        <View style={styles.providers}>
          {ONRAMP_PROVIDERS.map((provider) => (
            <Pressable
              key={provider.id}
              style={[styles.providerCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => handleSelectProvider(provider)}
            >
              <Text style={styles.providerIcon}>{provider.icon}</Text>
              <View style={styles.providerInfo}>
                <Text style={[styles.providerName, { color: colors.text }]}>
                  {provider.name}
                </Text>
                <Text style={[styles.providerDesc, { color: colors.subtext }]}>
                  {provider.description}
                </Text>
                <Text style={[styles.providerFiat, { color: colors.subtext }]}>
                  {provider.supportedFiat.join(', ')}
                </Text>
              </View>
              <Text style={[styles.arrow, { color: colors.subtext }]}>›</Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.noticeTitle, { color: colors.text }]}>How it works</Text>
          <Text style={[styles.noticeBody, { color: colors.subtext }]}>
            1. Select a provider above{'\n'}
            2. Complete identity verification (first time only){'\n'}
            3. Enter payment details and amount{'\n'}
            4. XLM is sent directly to your connected wallet
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  back: { marginBottom: 12 },
  backText: { fontSize: 15, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 24 },
  providers: { gap: 12, marginBottom: 24 },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  providerIcon: { fontSize: 32, marginRight: 14 },
  providerInfo: { flex: 1 },
  providerName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  providerDesc: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  providerFiat: { fontSize: 12 },
  arrow: { fontSize: 24, fontWeight: '300' },
  notice: { borderWidth: 1, borderRadius: 16, padding: 16 },
  noticeTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  noticeBody: { fontSize: 14, lineHeight: 22 },
});
