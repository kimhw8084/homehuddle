import { toWalletBagItem, toWalletTransaction } from '../lib/household-adapters';

describe('toWalletBagItem', () => {
  it('uses the inventory UUID and maps redeemed items to history', () => {
    const item = toWalletBagItem(
      { id: 'inventory-id', member_id: 'member-id', reward_id: 'reward-id', status: 'redeemed', purchased_at: '2026-08-13T12:00:00.000Z', redeemed_at: '2026-08-14T12:00:00.000Z' },
      [{ id: 'reward-id', title: 'Movie night', cost: 120 }],
      [{ id: 'member-id', household_id: 'household-id', auth_user_id: 'user-id', display_name: 'Alex', avatar: null, role: 'child', wallet_balance: 50 }],
    );

    expect(item).toMatchObject({ id: 'inventory-id', member: 'Alex', name: 'Movie night', pts: 120, status: 'used' });
    expect(item?.usedDate).not.toBeNull();
  });
});

describe('toWalletTransaction', () => {
  it('keeps the server ledger amount and resolves its chore label', () => {
    expect(toWalletTransaction(
      { id: 'ledger-id', household_id: 'household-id', member_id: 'member-id', kind: 'chore_award', amount: 25, completion_id: 'completion-id', inventory_id: null, created_at: '2026-08-13T12:00:00.000Z' },
      [{ id: 'member-id', household_id: 'household-id', auth_user_id: 'user-id', display_name: 'Alex', avatar: null, role: 'child', wallet_balance: 25 }],
      [{ id: 'chore-id', household_id: 'household-id', title: 'Tidy room', points: 25, assigned_member_id: 'member-id', due_at: null, recurrence_rule: null, photo_required: false, status: 'approved', created_at: '2026-08-13T00:00:00.000Z', updated_at: '2026-08-13T00:00:00.000Z' }],
      [{ id: 'completion-id', chore_id: 'chore-id', household_id: 'household-id', completed_by_member_id: 'member-id', occurrence_date: '2026-08-13', before_photo_path: null, after_photo_path: null, note: null, status: 'approved', created_at: '2026-08-13T12:00:00.000Z' }],
      [],
      [],
    )).toMatchObject({ id: 'ledger-id', member: 'Alex', label: 'Tidy room', pts: 25, icon: '✅' });
  });
});
