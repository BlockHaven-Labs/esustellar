import { ContributionRecommendation } from './recommendationTypes';

interface PastContribution {
  amount: number;
  date: string;
}

interface GroupContext {
  averageContribution: number;
  memberCount: number;
}

interface WalletContext {
  balance: number;
}

interface FrequencyContext {
  weeklyFrequency: number;
}

export async function getRecommendations(
  userId: string,
  groupId: string,
): Promise<ContributionRecommendation[]> {
  const pastContributions = await fetchPastContributions(userId, groupId);
  const group = await fetchGroupContext(groupId);
  const wallet = await fetchWalletBalance(userId);
  const frequency = await fetchContributionFrequency(userId, groupId);

  const recommendations: ContributionRecommendation[] = [];

  const avgPast =
    pastContributions.length > 0
      ? pastContributions.reduce((s, c) => s + c.amount, 0) /
        pastContributions.length
      : 0;

  if (avgPast > 0) {
    recommendations.push({
      amount: Math.round(avgPast * 1.1),
      rationale: `Based on your past contributions, increasing by 10% keeps you growing steadily.`,
      confidence: 'high',
    });
  }

  if (group.averageContribution > 0) {
    const matchedAmount = Math.round(group.averageContribution);
    recommendations.push({
      amount: matchedAmount,
      rationale: `Match the group average of ${group.averageContribution} to stay aligned with your savings circle.`,
      confidence: group.memberCount > 5 ? 'high' : 'medium',
    });
  }

  const walletSafeAmount = Math.min(
    Math.round(wallet.balance * 0.15),
    Math.round((group.averageContribution || avgPast || 100) * 1.5),
  );
  recommendations.push({
    amount: Math.max(10, walletSafeAmount),
    rationale: `Based on your wallet balance, contributing ${walletSafeAmount} keeps your account healthy.`,
    confidence: 'medium',
  });

  if (frequency.weeklyFrequency > 2) {
    const freqAmount = Math.round(
      (avgPast || group.averageContribution || 100) * 0.5,
    );
    recommendations.push({
      amount: Math.max(5, freqAmount),
      rationale: `You contribute frequently. Consider smaller, more frequent contributions of ${freqAmount} to ease the load.`,
      confidence: 'medium',
    });
  }

  return recommendations.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.confidence] - order[b.confidence];
  });
}

async function fetchPastContributions(
  _userId: string,
  _groupId: string,
): Promise<PastContribution[]> {
  return [
    { amount: 500, date: '2026-05-01' },
    { amount: 450, date: '2026-05-08' },
    { amount: 550, date: '2026-05-15' },
  ];
}

async function fetchGroupContext(_groupId: string): Promise<GroupContext> {
  return { averageContribution: 480, memberCount: 8 };
}

async function fetchWalletBalance(_userId: string): Promise<WalletContext> {
  return { balance: 10000 };
}

async function fetchContributionFrequency(
  _userId: string,
  _groupId: string,
): Promise<FrequencyContext> {
  return { weeklyFrequency: 1 };
}
