export interface ContributionRecommendation {
  amount: number;
  rationale: string;
  confidence: 'low' | 'medium' | 'high';
}
