import { marketMembers, saleForItem, validateRewardDraft, walletSeries } from '../features/rewards/market-model';
import type { HouseholdSnapshot } from '../types/household';

const snapshot: HouseholdSnapshot = { householdId: 'h', members: [
  { id: 'owner', household_id: 'h', auth_user_id: 'a', role: 'owner', display_name: 'Alex', avatar: null, wallet_balance: 100 },
  { id: 'teen', household_id: 'h', auth_user_id: 'b', role: 'teen', display_name: 'Alex', avatar: null, wallet_balance: 200 },
  { id: 'child', household_id: 'h', auth_user_id: null, role: 'child', display_name: 'Alex', avatar: null, wallet_balance: 30 },
], chores: [], completions: [], rewards: [], inventory: [], ledger: [] };

it('does not infer spending authority from a duplicate display name or parenthood alone', () => {
  expect(marketMembers(snapshot, 'owner').map(m => [m.id, m.canAct])).toEqual([['owner', true], ['teen', false], ['child', true]]);
  expect(marketMembers(snapshot, 'teen').map(m => m.canAct)).toEqual([false, true, false]);
});
it('uses the greatest applicable active discount, with a one-point floor', () => {
  const item = { id: 'r', category: 'Food', pts: 101 };
  const sales = [
    { id: 'a', scope: { type: 'all' as const }, discountPct: 10, expiresAt: 100 },
    { id: 'b', scope: { type: 'categories' as const, categories: ['Food'] }, discountPct: 50, expiresAt: 200 },
    { id: 'c', scope: { type: 'items' as const, itemIds: ['other'] }, discountPct: 99, expiresAt: 100 },
  ];
  expect(saleForItem(item, sales, 50)).toEqual({ price: 51, expiresAt: 200 });
  expect(saleForItem(item, sales, 201)).toBeUndefined();
  expect(saleForItem(item, [{ id: 'free', scope: { type: 'all' }, discountPct: 100, expiresAt: 100 }], 50)?.price).toBe(1);
});
it('builds all 30 chart days from real balance and aggregate ledger movements', () => {
  const rows = walletSeries({ ...snapshot, walletDaily: [
    { member_id: 'owner', day: '2026-09-23', delta: -20, earned: 0, spent: 20 },
    { member_id: 'owner', day: '2026-09-22', delta: 30, earned: 30, spent: 0 },
    { member_id: 'teen', day: '2026-09-23', delta: 99, earned: 99, spent: 0 },
  ] }, 'owner', new Date('2026-09-23T01:00:00Z'));
  expect(rows).toHaveLength(30);
  expect(rows.slice(-3)).toEqual([{ day: '2026-09-21', balance: 90 }, { day: '2026-09-22', balance: 120 }, { day: '2026-09-23', balance: 100 }]);
});
it('rejects silently truncated prices, invalid stock and missing expiry', () => {
  const valid = { name: 'Movie', emoji: '🎬', pts: 50, category: 'Fun', desc: '', stock: null, expiresInDays: null, eligibleMembers: [], curators: [] };
  expect(validateRewardDraft(valid)).toBeNull();
  expect(validateRewardDraft({ ...valid, pts: 12.5 })).toMatch(/whole number/);
  expect(validateRewardDraft({ ...valid, stock: NaN })).toMatch(/Stock/);
  expect(validateRewardDraft({ ...valid, expiresInDays: 0 })).toMatch(/Expiration/);
});
