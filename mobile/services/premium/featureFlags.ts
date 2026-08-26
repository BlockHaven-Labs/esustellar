import { PremiumFeature, UserTier } from './premiumTypes';

export type FeatureFlag = PremiumFeature & {
  enabled: boolean;
};

const TIER_HIERARCHY: Record<UserTier, number> = {
  free: 0,
  premium: 1,
  enterprise: 2,
};

export const FEATURE_FLAGS: FeatureFlag[] = [
  { key: 'advanced_analytics', tier: 'premium', enabled: true, description: 'Advanced analytics and insights' },
  { key: 'priority_support', tier: 'premium', enabled: true, description: 'Priority customer support' },
  { key: 'multi_sig_wallets', tier: 'premium', enabled: true, description: 'Multi-signature wallet support' },
  { key: 'custom_branding', tier: 'enterprise', enabled: true, description: 'Custom branding options' },
  { key: 'bulk_transactions', tier: 'enterprise', enabled: true, description: 'Bulk transaction processing' },
  { key: 'audit_logs', tier: 'enterprise', enabled: true, description: 'Audit log export' },
  { key: 'api_access', tier: 'enterprise', enabled: true, description: 'API access for automation' },
  { key: 'real_time_sync', tier: 'free', enabled: true, description: 'Real-time data synchronization' },
  { key: 'basic_support', tier: 'free', enabled: true, description: 'Basic support access' },
];

export function isFeatureEnabled(featureKey: string, userTier: UserTier): boolean {
  const flag = FEATURE_FLAGS.find((f) => f.key === featureKey);
  if (!flag) return false;
  if (!flag.enabled) return false;
  return TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[flag.tier];
}

export function getEnabledFeatures(userTier: UserTier): FeatureFlag[] {
  return FEATURE_FLAGS.filter(
    (flag) => flag.enabled && TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[flag.tier],
  );
}
