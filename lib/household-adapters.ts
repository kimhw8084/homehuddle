import { Chore } from '../types/chores';
import { ChoreCompletionRecord, ChoreRecord, HouseholdMemberRecord, PointLedgerRecord, RewardInventoryRecord, RewardRecord } from '../types/household';
import { FamilyMember, WalletBagItem, WalletTransaction } from '../store/huddleStore';

const toLocalDate = (value: string | null) => {
  const date = value ? new Date(value) : new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export function toFamilyMember(member: HouseholdMemberRecord): FamilyMember {
  return {
    id: member.id,
    authUserId: member.auth_user_id,
    householdRole: member.role,
    name: member.display_name,
    avatar: member.avatar || (member.role === 'child' ? '🧒' : '👤'),
    role: member.role === 'child' ? 'Child' : member.role === 'teen' ? 'Teen' : 'Parent',
    pool: member.role === 'child' || member.role === 'teen' ? 'Kids' : 'Parents',
    stats: { choresCompleted: 0, pointsEarned: member.wallet_balance, streak: 0 },
  };
}

export function toChore(chore: ChoreRecord, members: HouseholdMemberRecord[]): Chore {
  const assignee = members.find((member) => member.id === chore.assigned_member_id);
  const dueDate = chore.due_date ?? toLocalDate(chore.due_at);
  const isOverdue = chore.status === 'pending' && Boolean(chore.due_at && new Date(chore.due_at).getTime() < Date.now());

  return {
    id: chore.id,
    version: chore.version,
    reviewStatus: chore.status,
    title: chore.title,
    notes: chore.notes,
    assignee: assignee?.display_name ?? null,
    avatar: assignee?.avatar ?? '👤',
    pool: assignee?.role === 'child' || assignee?.role === 'teen' ? 'Kids' : 'Parents',
    points: chore.points,
    estMinutes: 15,
    dueDate,
    due: dueDate,
    isOverdue,
    isRecurring: Boolean(chore.recurrence_rule),
    status: chore.status === 'submitted' || chore.status === 'approved' ? 'completed' : 'pending',
    photoRequired: chore.photo_required,
    photoMode: chore.photo_required ? 'after' : undefined,
    photoProvided: { before: false, after: false },
    isNudged: false,
    priorityIndex: 0,
    sectionId: null,
    assigned_to: chore.assigned_member_id ?? undefined,
    recurrenceRule: chore.recurrence_rule ?? undefined,
  };
}

export function toPendingApproval(completion: ChoreCompletionRecord, chores: ChoreRecord[], members: HouseholdMemberRecord[]) {
  const chore = chores.find((item) => item.id === completion.chore_id);
  const member = members.find((item) => item.id === completion.completed_by_member_id);

  return {
    id: completion.id,
    title: chore?.title ?? 'Completed chore',
    kid: member?.display_name ?? 'Household member',
    avatar: member?.avatar ?? undefined,
    points: completion.awarded_points ?? chore?.points ?? 0,
    submittedAt: new Date(completion.created_at).getTime(),
    photoRequired: chore?.photo_required ?? false,
    photos: [completion.after_photo_url, completion.before_photo_url].filter((url): url is string => Boolean(url)),
    comments: completion.note ? [{ author: member?.display_name ?? 'Household member', text: completion.note, time: new Date(completion.created_at).getTime() }] : [],
  };
}

export function toWalletBagItem(
  inventory: { id: string; member_id: string; reward_id: string; status: 'available' | 'redeemed'; purchased_at: string; redeemed_at: string | null; title_snapshot?: string; cost_snapshot?: number },
  rewards: { id: string; title: string; cost: number }[],
  members: HouseholdMemberRecord[],
): WalletBagItem | null {
  const reward = rewards.find((candidate) => candidate.id === inventory.reward_id);
  const member = members.find((candidate) => candidate.id === inventory.member_id);
  if ((!reward && !inventory.title_snapshot) || !member) return null;

  return {
    id: inventory.id,
    memberId: member.id,
    member: member.display_name,
    name: inventory.title_snapshot ?? reward!.title,
    emoji: '🎁',
    pts: inventory.cost_snapshot ?? reward!.cost,
    claimedDate: new Date(inventory.purchased_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    usedDate: inventory.redeemed_at ? new Date(inventory.redeemed_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : null,
    expiresDate: null,
    status: inventory.status === 'available' ? 'active' : 'used',
    note: null,
    gifted: false,
  };
}

export function toWalletTransaction(
  entry: PointLedgerRecord,
  members: HouseholdMemberRecord[],
  chores: ChoreRecord[],
  completions: ChoreCompletionRecord[],
  inventory: RewardInventoryRecord[],
  rewards: RewardRecord[],
): WalletTransaction | null {
  const member = members.find((candidate) => candidate.id === entry.member_id);
  if (!member) return null;
  const completion = completions.find((candidate) => candidate.id === entry.completion_id);
  const chore = completion ? chores.find((candidate) => candidate.id === completion.chore_id) : undefined;
  const inventoryItem = inventory.find((candidate) => candidate.id === entry.inventory_id);
  const reward = inventoryItem ? rewards.find((candidate) => candidate.id === inventoryItem.reward_id) : undefined;
  const rewardLabel = inventoryItem?.title_snapshot ?? reward?.title ?? 'Reward';

  return {
    id: entry.id,
    memberId: member.id,
    member: member.display_name,
    label: entry.kind === 'chore_award' ? (chore?.title ?? 'Chore completed') : entry.kind === 'reward_purchase' ? `Purchased: ${rewardLabel}` : entry.kind === 'fund_contribution' ? 'Goal contribution' : entry.kind === 'fund_refund' ? 'Goal refund' : `Refund: ${rewardLabel}`,
    pts: entry.amount,
    date: new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    icon: entry.kind === 'chore_award' ? '✅' : entry.kind === 'reward_purchase' ? '🎁' : '↩️',
  };
}
