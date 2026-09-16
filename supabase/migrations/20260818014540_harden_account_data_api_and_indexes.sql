-- Keep household data unavailable to anonymous Data API / GraphQL callers.
revoke all on table public.households, public.household_members, public.chores,
  public.chore_completions, public.rewards, public.reward_inventory,
  public.point_ledger, public.household_invites, public.notification_preferences,
  public.device_tokens, public.notification_events, public.household_entitlements from anon;

grant select on table public.households, public.household_members, public.chores,
  public.chore_completions, public.rewards, public.reward_inventory,
  public.point_ledger, public.household_invites, public.notification_preferences,
  public.device_tokens, public.notification_events, public.household_entitlements to authenticated;

-- Consolidate equivalent member read rules and avoid per-row auth initialization.
drop policy if exists "users read own membership" on public.household_members;
drop policy if exists "members read member profiles" on public.household_members;
create policy "members read member profiles" on public.household_members for select to authenticated
  using (auth_user_id = (select auth.uid()) or public.is_household_member(household_id));

-- Match the selective-sync and bounded-history access patterns.
create index if not exists household_members_auth_user_id_idx on public.household_members (auth_user_id);
create index if not exists chores_household_due_at_idx on public.chores (household_id, due_at);
create index if not exists chore_completions_household_created_at_idx on public.chore_completions (household_id, created_at desc);
create index if not exists reward_inventory_household_purchased_at_idx on public.reward_inventory (household_id, purchased_at desc);
create index if not exists point_ledger_household_created_at_idx on public.point_ledger (household_id, created_at desc);
create index if not exists household_invites_accepted_by_idx on public.household_invites (accepted_by);
create index if not exists notification_events_household_created_at_idx on public.notification_events (household_id, created_at desc);
create index if not exists notification_events_recipient_created_at_idx on public.notification_events (recipient_user_id, created_at desc);
