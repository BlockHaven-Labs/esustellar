import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Rect, Ellipse, G, Line } from 'react-native-svg';

// ─── Illustration variants ────────────────────────────────────────────────────

function NoGroupsIllustration() {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120">
      {/* People silhouettes */}
      <Circle cx="40" cy="38" r="14" fill="#C7D9F5" />
      <Path d="M16 80 Q40 58 64 80" fill="#C7D9F5" />
      <Circle cx="80" cy="38" r="14" fill="#A5C4EE" />
      <Path d="M56 80 Q80 58 104 80" fill="#A5C4EE" />
      {/* Plus icon in centre */}
      <Circle cx="60" cy="90" r="14" fill="#3B82F6" />
      <Rect x="54" y="84" width="12" height="12" rx="1" fill="#3B82F6" />
      <Line x1="60" y1="86" x2="60" y2="98" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="54" y1="92" x2="66" y2="92" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}

function NoTransactionsIllustration() {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120">
      {/* Receipt shape */}
      <Rect x="25" y="15" width="70" height="85" rx="6" fill="#EEF2FF" />
      <Rect x="25" y="15" width="70" height="85" rx="6" stroke="#C7D2FE" strokeWidth="1.5" fill="none" />
      {/* Zigzag bottom */}
      <Path d="M25 85 L30 90 L35 85 L40 90 L45 85 L50 90 L55 85 L60 90 L65 85 L70 90 L75 85 L80 90 L85 85 L90 90 L95 85" stroke="#C7D2FE" strokeWidth="1.5" fill="none" />
      {/* Lines */}
      <Rect x="35" y="35" width="50" height="5" rx="2.5" fill="#C7D2FE" />
      <Rect x="35" y="48" width="35" height="5" rx="2.5" fill="#DDE3FB" />
      <Rect x="35" y="61" width="42" height="5" rx="2.5" fill="#DDE3FB" />
      {/* Empty circle */}
      <Circle cx="60" cy="108" r="8" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="1.5" />
      <Line x1="57" y1="105" x2="63" y2="111" stroke="#A5B4FC" strokeWidth="2" strokeLinecap="round" />
      <Line x1="63" y1="105" x2="57" y2="111" stroke="#A5B4FC" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function NoWalletsIllustration() {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120">
      {/* Wallet body */}
      <Rect x="15" y="35" width="90" height="60" rx="10" fill="#D1FAE5" />
      <Rect x="15" y="35" width="90" height="60" rx="10" stroke="#6EE7B7" strokeWidth="1.5" fill="none" />
      {/* Flap */}
      <Path d="M15 55 Q15 35 35 35 L85 35 Q105 35 105 55" fill="#A7F3D0" />
      {/* Coin slot */}
      <Rect x="70" y="57" width="30" height="20" rx="8" fill="#ECFDF5" stroke="#6EE7B7" strokeWidth="1.5" />
      <Circle cx="85" cy="67" r="5" fill="#6EE7B7" />
      {/* Plus */}
      <Circle cx="42" cy="78" r="12" fill="#10B981" />
      <Line x1="42" y1="72" x2="42" y2="84" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="36" y1="78" x2="48" y2="78" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}

function NoSearchResultsIllustration() {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120">
      {/* Magnifier */}
      <Circle cx="52" cy="52" r="30" fill="#FEF3C7" stroke="#FCD34D" strokeWidth="2" />
      <Circle cx="52" cy="52" r="22" fill="#FFFBEB" />
      <Line x1="74" y1="74" x2="100" y2="100" stroke="#FCD34D" strokeWidth="6" strokeLinecap="round" />
      {/* X inside */}
      <Line x1="44" y1="44" x2="60" y2="60" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
      <Line x1="60" y1="44" x2="44" y2="60" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

function NoNotificationsIllustration() {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120">
      {/* Bell */}
      <Path d="M60 15 C42 15 30 30 30 48 L30 75 L20 85 L100 85 L90 75 L90 48 C90 30 78 15 60 15Z" fill="#E0E7FF" stroke="#A5B4FC" strokeWidth="1.5" />
      {/* Clapper */}
      <Ellipse cx="60" cy="90" rx="10" ry="5" fill="#C7D2FE" />
      {/* ZZZ floating */}
      <Text style={{ fontSize: 10 }} />
      <Path d="M78 25 L86 25 L78 33 L86 33" stroke="#A5B4FC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M88 18 L93 18 L88 23 L93 23" stroke="#C7D2FE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

// ─── Illustration map ─────────────────────────────────────────────────────────

export type EmptyStateVariant =
  | 'no-groups'
  | 'no-transactions'
  | 'no-wallets'
  | 'no-results'
  | 'no-notifications';

const illustrations: Record<EmptyStateVariant, React.ReactNode> = {
  'no-groups': <NoGroupsIllustration />,
  'no-transactions': <NoTransactionsIllustration />,
  'no-wallets': <NoWalletsIllustration />,
  'no-results': <NoSearchResultsIllustration />,
  'no-notifications': <NoNotificationsIllustration />,
};

const defaultMessages: Record<EmptyStateVariant, { title: string; subtitle: string }> = {
  'no-groups': {
    title: 'No savings groups yet',
    subtitle: 'Create or join a group to start saving with your community.',
  },
  'no-transactions': {
    title: 'No transactions yet',
    subtitle: 'Your contribution history will appear here.',
  },
  'no-wallets': {
    title: 'No wallets added',
    subtitle: 'Add a Stellar wallet to get started.',
  },
  'no-results': {
    title: 'No results found',
    subtitle: 'Try adjusting your search or filters.',
  },
  'no-notifications': {
    title: 'All caught up',
    subtitle: 'You have no new notifications.',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  variant: EmptyStateVariant;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function EmptyState({ variant, title, subtitle, action }: EmptyStateProps) {
  const { title: defaultTitle, subtitle: defaultSubtitle } = defaultMessages[variant];

  return (
    <View style={styles.container}>
      <View style={styles.illustration}>{illustrations[variant]}</View>
      <Text style={styles.title}>{title ?? defaultTitle}</Text>
      <Text style={styles.subtitle}>{subtitle ?? defaultSubtitle}</Text>
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  illustration: {
    marginBottom: 24,
    opacity: 0.95,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  action: {
    marginTop: 24,
  },
});