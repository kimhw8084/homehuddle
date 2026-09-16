import { supabase } from './supabase';

const unwrap = <T>({ data, error }: { data: T; error: Error | null }) => {
  if (error) throw error;
  return data;
};

export type Invite = {
  id: string;
  email: string;
  role: 'parent' | 'teen';
  token: string;
  expires_at: string;
  accepted_at: string | null;
};

export type ManagedMember = {
  id: string;
  auth_user_id: string | null;
  display_name: string;
  avatar: string | null;
  role: 'owner' | 'parent' | 'teen' | 'child';
};

export const accountApi = {
  async updateMyProfile(displayName: string, avatar?: string) {
    return unwrap(await supabase.rpc('update_my_member_profile', {
      display_name_value: displayName,
      avatar_value: avatar ?? null,
    }));
  },

  async updateHouseholdName(householdId: string, name: string) {
    return unwrap(await supabase.rpc('update_household_name', {
      target_household_id: householdId,
      household_name: name,
    }));
  },

  async createInvite(householdId: string, email: string, role: 'parent' | 'teen') {
    return unwrap(await supabase.rpc('create_household_invite', {
      target_household_id: householdId,
      invite_email: email,
      invite_role: role,
      expires_in_days: 7,
    }));
  },

  async listMembers(householdId: string) {
    return unwrap(await supabase.from('household_members')
      .select('id, auth_user_id, display_name, avatar, role')
      .eq('household_id', householdId)
      .is('removed_at', null)
      .order('created_at')) as ManagedMember[];
  },

  async changeMemberRole(memberId: string, role: 'parent' | 'teen' | 'child') {
    return unwrap(await supabase.rpc('change_household_member_role', { target_member_id: memberId, new_role: role }));
  },

  async updateChildProfile(memberId: string, displayName: string, avatar?: string) {
    return unwrap(await supabase.rpc('update_child_profile', { target_member_id: memberId, member_name: displayName, member_avatar: avatar ?? null }));
  },

  async removeMember(memberId: string) {
    return unwrap(await supabase.rpc('remove_household_member', { target_member_id: memberId }));
  },

  async transferOwnership(memberId: string) {
    return unwrap(await supabase.rpc('transfer_household_ownership', { target_member_id: memberId }));
  },

  async closeHousehold() {
    return unwrap(await supabase.rpc('close_household'));
  },

  async listInvites(householdId: string) {
    return unwrap(await supabase.from('household_invites')
      .select('id, email, role, token, expires_at, accepted_at')
      .eq('household_id', householdId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })) as Invite[];
  },

  async acceptInvite(token: string, displayName: string, avatar?: string, teenAgeConfirmed = false) {
    return unwrap(await supabase.rpc('accept_household_invite', {
      target_token: token,
      display_name: displayName,
      avatar_value: avatar ?? null,
      teen_age_confirmed: teenAgeConfirmed,
    }));
  },

  async saveNotificationPreferences(push: boolean, chores: boolean, rewards: boolean) {
    return unwrap(await supabase.rpc('save_notification_preferences', {
      push_value: push,
      chore_value: chores,
      reward_value: rewards,
    }));
  },

  async notificationPreferences() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    const user = data.user;
    if (!user) throw new Error('Authentication required');
    return unwrap(await supabase.from('notification_preferences')
      .select('push_enabled, chore_events, reward_events')
      .eq('user_id', user.id)
      .maybeSingle());
  },

  async registerDeviceToken(token: string, platform: 'ios' | 'android') {
    return unwrap(await supabase.rpc('register_device_token', { token_value: token, platform_value: platform }));
  },

  async exportMine() {
    return unwrap(await supabase.rpc('export_my_data'));
  },

  async exportHousehold() {
    return unwrap(await supabase.rpc('export_household_data'));
  },

  async deleteMyAccount() {
    return unwrap(await supabase.rpc('delete_my_account'));
  },
};
