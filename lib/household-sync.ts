import { useHuddleStore } from '../store/huddleStore';
import { HouseholdSnapshot } from '../types/household';
import { toChore, toFamilyMember, toPendingApproval, toWalletBagItem, toWalletTransaction } from './household-adapters';
import { toMarketReward } from './reward-adapters';

export function applyHouseholdSnapshot(snapshot: HouseholdSnapshot, userId: string) {
  const currentMember = snapshot.members.find(member => member.auth_user_id === userId && !member.removed_at);
  if (!currentMember) throw new Error('Your household membership is no longer available.');

  // Notify once: all household domains must describe the same snapshot.
  useHuddleStore.setState({
    householdId: snapshot.householdId,
    currentMemberId: currentMember.id,
    currentUser: currentMember.display_name,
    restockItems: (snapshot.shopping ?? []).map(item => ({ id: item.id, name: item.name, category: item.category,
      qty: item.quantity, unit: item.unit, isCompleted: item.completed, isUrgent: false, isStaple: false,
      addedAt: new Date(item.created_at).getTime(), addedBy: { name: 'Household', avatar: '🏠' } })),
    familyMembers: snapshot.members.filter(member => !member.removed_at).map(toFamilyMember),
    chores: snapshot.chores.filter(chore => !chore.archived_at).map(chore => toChore(chore, snapshot.members)),
    pendingApprovals: snapshot.completions.filter(completion => completion.status === 'submitted')
      .map(completion => toPendingApproval(completion, snapshot.chores, snapshot.members)),
    marketItems: snapshot.rewards.filter(reward => reward.active).map(toMarketReward),
    walletBag: snapshot.inventory.map(item => toWalletBagItem(item, snapshot.rewards, snapshot.members))
      .filter((item): item is NonNullable<typeof item> => item !== null),
    walletTransactions: snapshot.ledger.map(entry => toWalletTransaction(entry, snapshot.members, snapshot.chores, snapshot.completions, snapshot.inventory, snapshot.rewards))
      .filter((item): item is NonNullable<typeof item> => item !== null),
  });
}
