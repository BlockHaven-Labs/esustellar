export interface Group {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'pending' | 'completed';
  contributionAmount: number;
  memberCount: number;
  maxMembers?: number;
  payoutFrequency?: string;
  creatorAddress?: string;
}
