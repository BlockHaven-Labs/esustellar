import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import {
  buildWidgetUrl,
  ONRAMP_PROVIDERS,
} from '../../services/onramp/providers';

export default function OnRampPurchaseScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { provider: providerId } = useLocalSearchParams<{ provider: string }>();
  const wallet = useAuthStore((s) => s.wallet);
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const provider = useMemo(
    () => ONRAMP_PROVIDERS.find((p) => p.id === providerId),
    [providerId],
  );

  const widgetUrl = useMemo(() => {
    if (!provider || !wallet?.publicKey) return null;
    return buildWidgetUrl(provider, { walletAddress: wallet.publicKey });
  }, [provider, wallet?.publicKey]);

  useEffect(() => {
    if (!provider) {
      setError('Unknown provider. Please go back and try again.');
    } else if (!wallet?.publicKey) {
      setError('No wallet connected. Please connect a wallet first.');
    }
  }, [provider, wallet?.publicKey]);

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    // Detect completion URLs (provider-specific success callbacks)
    const url = navState.url.toLowerCase();
    if (
      url.includes('transak.com/order-successful') ||
      url.includes('success') ||
      url.includes('complete')
    ) {
      // Could trigger a sync or show success UI
    }
  };

  const handleShouldStartLoadWithRequest = (request: { url: string }) => {
    // Open external links (e.g. support, T&C) in system browser
    const url = request.url;
    if (
      url.startsWith('http') &&
      !url.includes('transak.com') &&
      !url.includes('moonpay.com') &&
      !url.includes('buy.moonpay')
    ) {
      Linking.openURL(url);
      return false;
    }
    return true;
  };

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          <Pressable style={[styles.backButton, { borderColor: colors.border }]} onPress={() => router.back()}>
            <Text style={[styles.backButtonText, { color: colors.accent }]}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!widgetUrl) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.headerBack, { color: colors.accent }]}>← Close</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {provider?.name ?? 'Buy Crypto'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.subtext }]}>
            Loading {provider?.name}...
          </Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: widgetUrl }}
        style={styles.webview}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError('Failed to load the purchase widget. Please check your connection.');
        }}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        allowsInlineMediaPlayback
        startInLoadingState={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBack: { fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerSpacer: { width: 60 },
  webview: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: { fontSize: 16, textAlign: 'center', marginBottom: 20 },
  backButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: { fontSize: 15, fontWeight: '600' },
});
