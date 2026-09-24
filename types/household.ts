export type HouseholdRole = 'owner' | 'parent' | 'teen' | 'child';
export type ChoreStatus = 'pending' | 'submitted' | 'approved' | 'rejected';
export type InventoryStatus = 'available' | 'redeemed';
export type CompletionStatus = 'submitted' | 'approved' | 'rejected';
export type LedgerKind = 'chore_award' | 'reward_purchase' | 'reward_refund' | 'fund_contribution' | 'fund_refund';

export type HouseholdMemberRecord = {
  id: string;
  household_id: string;
  auth_user_id: string | null;
  display_name: string;
  avatar: string | null;
  role: HouseholdRole;
  wallet_balance: number;
  removed_at?: string | null;
};

export type ChoreRecord = {
  id: string;
  version?: number;
  household_id: string;
  title: string;
  points: number;
  assigned_member_id: string | null;
  due_at: string | null;
  due_date?: string | null;
  notes?: string;
  archived_at?: string | null;
  recurrence_rule: string | null;
  photo_required: boolean;
  status: ChoreStatus;
  created_at: string;
  updated_at: string;
};

export type RewardRecord = {
  id: string;
  household_id: string;
  title: string;
  description: string | null;
  cost: number;
  active: boolean;
  created_at: string;
  version?: number;
  emoji?: string;
  category?: string;
  stock?: number | null;
  expires_in_days?: number | null;
  eligible_member_ids?: string[];
  curator_member_ids?: string[];
  created_by_member_id?: string | null;
  price_history?: { date: string; pts: number }[];
};

export type RewardInventoryRecord = {
  id: string;
  household_id: string;
  member_id: string;
  reward_id: string;
  status: InventoryStatus;
  purchased_at: string;
  redeemed_at: string | null;
  title_snapshot?: string;
  cost_snapshot?: number;
  emoji_snapshot?: string;
  expires_at?: string | null;
  refunded_at?: string | null;
  gifted?: boolean;
  note?: string | null;
  version?: number;
};

export type ChoreCompletionRecord = {
  id: string;
  chore_id: string;
  household_id: string;
  completed_by_member_id: string;
  occurrence_date: string;
  before_photo_path: string | null;
  after_photo_path: string | null;
  note: string | null;
  status: CompletionStatus;
  awarded_points?: number;
  review_note?: string | null;
  created_at: string;
  before_photo_url?: string | null;
  after_photo_url?: string | null;
};

export type PointLedgerRecord = {
  id: string;
  household_id: string;
  member_id: string;
  kind: LedgerKind;
  amount: number;
  completion_id: string | null;
  inventory_id: string | null;
  fund_id?: string | null;
  created_at: string;
};

export type HouseholdSnapshot = {
  householdId: string;
  members: HouseholdMemberRecord[];
  chores: ChoreRecord[];
  completions: ChoreCompletionRecord[];
  rewards: RewardRecord[];
  inventory: RewardInventoryRecord[];
  ledger: PointLedgerRecord[];
  sales?: { id: string; scope: { type: 'all' } | { type: 'categories'; categories: string[] } | { type: 'items'; itemIds: string[] }; discount_pct: number; expires_at: string }[];
  walletDaily?: { member_id: string; day: string; delta: number; earned: number; spent: number }[];
  walletEarned?: { member_id: string; earned: number }[];
  purchaseCounts?: { reward_id: string; count: number }[];
  funds?: { id: string; household_id: string; creator_id: string; assignee_id: string | null; name: string; emoji: string; target: number; funded: number; due_date: string | null; status: 'active' | 'completed' | 'cancelled'; version: number }[];
  fundContributions?: { fund_id: string; member_id: string; amount: number }[];
  shopping?: { id: string; name: string; quantity: number; unit: string; category: string; completed: boolean; created_at: string }[];
};
