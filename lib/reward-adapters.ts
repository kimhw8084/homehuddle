import { RewardRecord } from '../types/household';

export type MarketReward = {
  id: string;
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
    name: reward.title,
    emoji: '🎁',
    pts: reward.cost,
    category: 'Rewards',
    desc: reward.description ?? '',
    purchaseCount: 0,
    stock: null,
    expiresInDays: null,
    eligibleMembers: [],
    curators: [],
    createdBy: 'Household',
    priceHistory: [{
      date: new Date(reward.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      pts: reward.cost,
    }],
  };
}
