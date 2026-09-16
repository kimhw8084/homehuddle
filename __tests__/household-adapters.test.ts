import { toChore, toFamilyMember, toPendingApproval } from '../lib/household-adapters';
import { ChoreCompletionRecord, ChoreRecord, HouseholdMemberRecord } from '../types/household';

const member: HouseholdMemberRecord = {
  id: 'member-1',
  household_id: 'household-1',
  auth_user_id: 'user-1',
  display_name: 'Alex',
  avatar: '🧒',
  role: 'child',
  wallet_balance: 45,
};

const chore: ChoreRecord = {
  id: 'chore-1',
  household_id: 'household-1',
  title: 'Unload dishwasher',
  points: 20,
  assigned_member_id: 'member-1',
  due_at: '2030-01-15T18:00:00.000Z',
  recurrence_rule: null,
  photo_required: true,
  status: 'submitted',
  created_at: '2030-01-15T00:00:00.000Z',
  updated_at: '2030-01-15T00:00:00.000Z',
};

const completion: ChoreCompletionRecord = {
  id: 'completion-1',
  chore_id: 'chore-1',
  household_id: 'household-1',
  completed_by_member_id: 'member-1',
  occurrence_date: '2030-01-15',
  before_photo_path: null,
  after_photo_path: 'proofs/after.jpg',
  note: 'All done.',
  status: 'submitted',
  created_at: '2030-01-15T18:30:00.000Z',
};

describe('household adapters', () => {
  it('maps child members into the existing family UI contract', () => {
    expect(toFamilyMember(member)).toMatchObject({
      name: 'Alex',
      role: 'Child',
      pool: 'Kids',
      stats: { pointsEarned: 45 },
    });
  });

  it('maps submitted backend chores into the existing completion UI contract', () => {
    expect(toChore(chore, [member])).toMatchObject({
      id: 'chore-1',
      assignee: 'Alex',
      points: 20,
      status: 'completed',
      photoRequired: true,
      photoMode: 'after',
    });
  });

  it('maps a submitted server completion into the parent approval inbox contract', () => {
    expect(toPendingApproval({ ...completion, after_photo_url: 'https://proof.example/after' }, [chore], [member])).toMatchObject({
      id: 'completion-1',
      title: 'Unload dishwasher',
      kid: 'Alex',
      points: 20,
      photoRequired: true,
      comments: [{ author: 'Alex', text: 'All done.' }],
      photos: ['https://proof.example/after'],
    });
  });
});
