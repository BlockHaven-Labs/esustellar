/**
 * Empty State Illustrations
 * Visual assets for empty state components
 */

export type IllustrationType = 
  | 'groups' 
  | 'transactions' 
  | 'notifications' 
  | 'search' 
  | 'wallet' 
  | 'error'
  | 'success'
  | 'default';

interface IllustrationConfig {
  emoji: string;
  description: string;
}

// Map of illustration types to their visual representation
export const illustrations: Record<IllustrationType, IllustrationConfig> = {
  groups: {
    emoji: '👥',
    description: 'No groups yet',
  },
  transactions: {
    emoji: '💳',
    description: 'No transactions yet',
  },
  notifications: {
    emoji: '🔔',
    description: 'No notifications',
  },
  search: {
    emoji: '🔍',
    description: 'No results found',
  },
  wallet: {
    emoji: '💼',
    description: 'No wallet connected',
  },
  error: {
    emoji: '⚠️',
    description: 'Something went wrong',
  },
  success: {
    emoji: '✅',
    description: 'Success',
  },
  default: {
    emoji: '📦',
    description: 'Nothing here',
  },
};

/**
 * Get illustration config by type
 */
export function getIllustration(type: IllustrationType): IllustrationConfig {
  return illustrations[type] || illustrations.default;
}

/**
 * Get illustration emoji by type
 */
export function getIllustrationEmoji(type: IllustrationType): string {
  return getIllustration(type).emoji;
}