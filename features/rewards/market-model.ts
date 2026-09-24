import type { HouseholdSnapshot } from '../../types/household';
import type { MarketFlashSale, MarketItem } from '../../store/huddleStore';

export type MarketMember = { id: string; name: string; avatar: string; color: string; balance: number; canAct: boolean; adult: boolean };
export type RewardDraft = Pick<MarketItem, 'name' | 'emoji' | 'pts' | 'category' | 'desc' | 'stock' | 'expiresInDays' | 'eligibleMembers' | 'curators'>;
const colors = ['#4F46E5', '#DB2777', '#047857', '#B45309', '#7C3AED'];

export function marketMembers(snapshot: HouseholdSnapshot | null, actorId: string | null): MarketMember[] {
  const actor = snapshot?.members.find(member => member.id === actorId && !member.removed_at);
  const adult = actor?.role === 'owner' || actor?.role === 'parent';
  return (snapshot?.members ?? []).filter(member => !member.removed_at).map((member, index) => ({
    id: member.id, name: member.display_name, avatar: member.avatar ?? '👤', color: colors[index % colors.length], balance: member.wallet_balance,
    canAct: member.id === actorId || (adult && member.role === 'child' && !member.auth_user_id),
    adult: member.role === 'owner' || member.role === 'parent',
  }));
}

export function saleForItem(item: Pick<MarketItem, 'id' | 'category' | 'pts'>, sales: MarketFlashSale[], now = Date.now()) {
  const sale = sales.filter(s => s.expiresAt > now && (s.scope.type === 'all' ||
    (s.scope.type === 'categories' && s.scope.categories.includes(item.category)) ||
    (s.scope.type === 'items' && s.scope.itemIds.includes(item.id))))
    .sort((a, b) => b.discountPct - a.discountPct || a.expiresAt - b.expiresAt)[0];
  return sale ? { price: Math.max(1, Math.round(item.pts * (100 - sale.discountPct) / 100)), expiresAt: sale.expiresAt } : undefined;
}

/** UTC calendar buckets from the server, anchored to the authoritative balance.
 * Uses the full aggregated month, not the truncated activity-feed page. */
export function walletSeries(snapshot: HouseholdSnapshot | null, memberId: string, now = new Date()) {
  const member = snapshot?.members.find(row => row.id === memberId);
  let balance = member?.wallet_balance ?? 0;
  const rows = new Map((snapshot?.walletDaily ?? []).filter(row => row.member_id === memberId).map(row => [row.day, row]));
  const days: { day: string; balance: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    const day = date.toISOString().slice(0, 10);
    days.unshift({ day, balance });
    balance -= Number(rows.get(day)?.delta ?? 0);
  }
  return days;
}

export function validateRewardDraft(draft: RewardDraft): string | null {
  if (!draft.name.trim() || draft.name.trim().length > 100) return 'Enter a name between 1 and 100 characters.';
  if (!Number.isInteger(draft.pts) || draft.pts < 1 || draft.pts > 100000) return 'Price must be a whole number between 1 and 100,000.';
  if (!draft.category?.trim() || draft.category.trim().length > 40) return 'Enter a category between 1 and 40 characters.';
  if (draft.desc.length > 2000) return 'Description must be 2,000 characters or fewer.';
  if (draft.stock !== null && (!Number.isInteger(draft.stock) || draft.stock < 0 || draft.stock > 100000)) return 'Stock must be a whole number between 0 and 100,000.';
  if (draft.expiresInDays !== null && (!Number.isInteger(draft.expiresInDays) || draft.expiresInDays < 1 || draft.expiresInDays > 3650)) return 'Expiration must be a whole number between 1 and 3,650 days.';
  return null;
}
