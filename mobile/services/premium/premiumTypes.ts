export type UserTier = 'free' | 'premium' | 'enterprise';

export interface PremiumFeature {
  key: string;
  tier: UserTier;
  description: string;
}
