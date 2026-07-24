import { AssistantMessage, SavingsTip } from './assistantTypes';

interface SuggestionContext {
  recentActivity?: string[];
  currentBalance?: number;
  upcomingGoals?: string[];
}

export function getSuggestion(context: SuggestionContext): AssistantMessage {
  const keywords = (context.recentActivity ?? []).join(' ').toLowerCase();

  if (keywords.includes('goal') || keywords.includes('target')) {
    return {
      role: 'assistant',
      content:
        'Great progress on your goals! Try setting up auto-contributions to stay on track without remembering each time.',
      timestamp: Date.now(),
    };
  }

  if (keywords.includes('balance') || keywords.includes('low')) {
    return {
      role: 'assistant',
      content:
        'Your balance looks a bit low. Consider pausing contributions for a week or reducing the amount to avoid overdrafts.',
      timestamp: Date.now(),
    };
  }

  if (keywords.includes('save') || keywords.includes('tip')) {
    return {
      role: 'assistant',
      content:
        'Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings. Even small regular contributions add up over time!',
      timestamp: Date.now(),
    };
  }

  return {
    role: 'assistant',
    content:
      'Keep up the good savings habit! Consistent small contributions build a strong financial future.',
    timestamp: Date.now(),
  };
}

export function getPersonalizedTip(userProfile: {
  contributionFrequency?: number;
  totalSaved?: number;
  activeGroups?: number;
}): SavingsTip {
  if ((userProfile.totalSaved ?? 0) === 0) {
    return {
      title: 'Start your first savings circle',
      description:
        'Join or create a group to begin your savings journey with friends and family.',
      category: 'goals',
    };
  }

  if ((userProfile.contributionFrequency ?? 0) < 1) {
    return {
      title: 'Set up recurring contributions',
      description:
        'Auto-contributions help you save consistently without having to remember each time.',
      category: 'contributions',
    };
  }

  if ((userProfile.activeGroups ?? 0) > 3) {
    return {
      title: 'Focus on fewer groups',
      description:
        'Contributing to many groups at once can stretch your finances. Consider focusing on 1-2 groups.',
      category: 'budgeting',
    };
  }

  return {
    title: 'Review your savings progress',
    description:
      'Take a moment to review your savings goals and adjust contributions if needed.',
    category: 'general',
  };
}
