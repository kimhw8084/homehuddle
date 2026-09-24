import { RewardRecord } from '../types/household';

export type MarketReward = {
  id: string;
  version?: number;
  name: string;
  emoji: string;
  pts: number;
  category: string;
  desc: string;
  purchaseCount: number;
  stock: number | null;
  expiresInDays: number | null;
  eligibleMembers: string[];
  curators: string[];
  createdBy: string;
  priceHistory: { date: string; pts: number }[];
};

export function toMarketReward(reward: RewardRecord): MarketReward {
  return {
    id: reward.id,
    version: reward.version,
    name: reward.title,
    emoji: reward.emoji ?? '🎁',
    pts: reward.cost,
    category: reward.category ?? 'Rewards',
    desc: reward.description ?? '',
    purchaseCount: 0,
    stock: reward.stock ?? null,
    expiresInDays: reward.expires_in_days ?? null,
    eligibleMembers: reward.eligible_member_ids ?? [],
    curators: reward.curator_member_ids ?? [],
    createdBy: reward.created_by_member_id ?? '',
    priceHistory: (reward.price_history?.length ? reward.price_history : [{
      date: new Date(reward.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      pts: reward.cost,
    }]).map(row => ({ ...row, date: new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) })),
  };
}
