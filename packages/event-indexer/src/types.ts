export interface ContractEvent {
  id: string;
  ledger: number;
  timestamp: number;
  contract_id: string;
  event_type: string;
  topics: string[];
  data: string;
}

export interface GroupRecord {
  group_id: string;
  name: string;
  admin: string;
  is_public: boolean;
  total_members: number;
  status: string;
  created_at: number;
  contract_address: string;
}

export interface MemberRecord {
  id: string;
  group_id: string;
  address: string;
  join_order: number;
  status: string;
  joined_at: number;
}

export interface ContributionRecord {
  id: string;
  group_id: string;
  member: string;
  amount: number;
  round: number;
  timestamp: number;
}

export interface PayoutRecord {
  id: string;
  group_id: string;
  recipient: string;
  amount: number;
  round: number;
  timestamp: number;
}
