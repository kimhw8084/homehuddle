import { supabase } from './supabase';
import { randomUUID } from 'expo-crypto';

type MutationError = { error: Error | null };

const assertSuccess = ({ error }: MutationError) => {
  if (error) throw error;
};

export const householdApi = {
  async getMyHouseholdId(userId: string) {
    const result = await supabase
      .from('household_members')
      .select('household_id')
      .eq('auth_user_id', userId)
      .is('removed_at', null)
      .limit(1)
      .maybeSingle();
    assertSuccess(result);
    return result.data?.household_id ?? null;
  },

  async createHousehold(name: string, ownerName: string, ownerAvatar?: string) {
    const result = await supabase.rpc('create_household', {
      household_name: name,
      owner_name: ownerName,
      owner_avatar: ownerAvatar ?? null,
    });
    assertSuccess(result);
    return result.data as string;
  },

  async addMember(input: { householdId: string; name: string; role: 'child'; avatar?: string }) {
    const result = await supabase.rpc('add_household_member', {
      target_household_id: input.householdId,
      member_name: input.name,
      member_role: input.role,
      member_avatar: input.avatar ?? null,
    });
    assertSuccess(result);
    return result.data as string;
  },

  async getHousehold(householdId: string) {
    const result = await supabase.from('households').select('id, name, owner_id, created_at').eq('id', householdId).single();
    assertSuccess(result);
    return result.data;
  },

  async createChore(input: {
    householdId: string; title: string; points: number; assigneeId?: string; dueAt?: string; recurrenceRule?: string; photoRequired?: boolean;
  }) {
    const result = await supabase.rpc('create_chore', {
      target_household_id: input.householdId,
      chore_title: input.title,
      chore_points: input.points,
      assignee_id: input.assigneeId ?? null,
      due_at_value: input.dueAt ?? null,
      recurrence_value: input.recurrenceRule ?? null,
      requires_photo: input.photoRequired ?? false,
    });
    assertSuccess(result);
    return result.data as string;
  },

  async createReward(input: { householdId: string; title: string; cost: number; description?: string }) {
    const result = await supabase.rpc('create_reward', {
      target_household_id: input.householdId,
      reward_title: input.title,
      reward_cost: input.cost,
      reward_description: input.description ?? null,
    });
    assertSuccess(result);
    return result.data as string;
  },

  async submitCompletion(input: {
    choreId: string; memberId: string; occurrenceDate: string; beforePath?: string; afterPath?: string; note?: string;
  }) {
    const result = await supabase.rpc('submit_chore_completion', {
      target_chore_id: input.choreId,
      completed_by: input.memberId,
      completion_date: input.occurrenceDate,
      before_path: input.beforePath ?? null,
      after_path: input.afterPath ?? null,
      completion_note: input.note ?? null,
    });
    assertSuccess(result);
    return result.data as string;
  },

  async approveCompletion(completionId: string) {
    assertSuccess(await supabase.rpc('approve_chore_completion', { target_completion_id: completionId }));
  },

  async rejectCompletion(completionId: string, feedback: string) {
    assertSuccess(await supabase.rpc('reject_chore_completion', {
      target_completion_id: completionId,
      feedback: feedback.trim() || null,
    }));
  },

  async createChoreV2(input: { householdId: string; requestId: string; title: string; points: number; assigneeId?: string; dueDate?: string; notes?: string; photoRequired?: boolean }) {
    const result = await supabase.rpc('create_chore_v2', { target_household_id: input.householdId, request_id: input.requestId, chore_title: input.title, chore_points: input.points,
      assignee_id: input.assigneeId ?? null, due_date_value: input.dueDate ?? null, notes_value: input.notes ?? '', requires_photo: input.photoRequired ?? false });
    assertSuccess(result);
    return result.data as string;
  },

  async updateChore(input: { id: string; title: string; points: number; assigneeId?: string; dueDate?: string; notes?: string; photoRequired?: boolean; version?: number }) {
    assertSuccess(await supabase.rpc('update_chore_v2', { target_chore_id: input.id, chore_title: input.title, chore_points: input.points,
      assignee_id: input.assigneeId ?? null, due_date_value: input.dueDate ?? null, notes_value: input.notes ?? '', requires_photo: input.photoRequired ?? false, expected_version: input.version ?? 1 }));
  },

  async archiveChore(id: string) {
    assertSuccess(await supabase.rpc('archive_chore', { target_chore_id: id }));
  },

  async updateReward(input: { id: string; title: string; cost: number; description?: string; active?: boolean }) {
    assertSuccess(await supabase.rpc('update_reward', { target_reward_id: input.id, reward_title: input.title, reward_cost: input.cost,
      reward_description: input.description ?? null, is_active: input.active ?? true }));
  },

  async purchaseReward(rewardId: string, memberId: string, requestId = randomUUID(), expectedCost?: number) {
    const result = await supabase.rpc(expectedCost === undefined ? 'purchase_reward_once' : 'purchase_reward_v2', { target_reward_id: rewardId, target_member_id: memberId, request_id: requestId, ...(expectedCost === undefined ? {} : { expected_cost: expectedCost }) });
    assertSuccess(result);
    return result.data as string;
  },

  async redeemReward(inventoryId: string) {
    assertSuccess(await supabase.rpc('redeem_reward', { target_inventory_id: inventoryId }));
  },
};
