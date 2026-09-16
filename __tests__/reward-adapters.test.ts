import { toMarketReward } from '../lib/reward-adapters';

describe('toMarketReward', () => {
  it('maps a server reward without inventing a purchasable stock limit', () => {
    expect(toMarketReward({
      id: 'reward-id', household_id: 'household-id', title: 'Movie night', description: null,
      cost: 120, active: true, created_at: '2026-08-13T12:00:00.000Z',
    })).toMatchObject({
      id: 'reward-id', name: 'Movie night', emoji: '🎁', pts: 120, desc: '', stock: null,
      eligibleMembers: [], priceHistory: [{ pts: 120 }],
    });
  });
});
