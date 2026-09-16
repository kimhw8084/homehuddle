-- DESTRUCTIVE: staging/test reset only.
-- Keeps the Supabase project, API keys, Auth provider configuration, and auth.users.
-- Removes the prior HomeHuddle prototype schema, data, RLS policies, and proof files.

drop policy if exists "Public access to chore-proofs" on storage.objects;
drop policy if exists "Users can upload to chore-proofs" on storage.objects;
drop policy if exists "members read their household proof" on storage.objects;
drop policy if exists "members upload their household proof" on storage.objects;

-- Supabase protects storage.objects from direct SQL deletion. The production
-- migration below makes the existing bucket private; legacy files become
-- inaccessible once their public policy is removed. Delete them later through
-- the Storage UI or Storage API if reclaiming test storage is needed.

drop table if exists public.analytics_logs cascade;
drop table if exists public.nudges cascade;
drop table if exists public.restock_history cascade;
drop table if exists public.user_inventory cascade;
drop table if exists public.rewards_store cascade;
drop table if exists public.chore_ledger cascade;
drop table if exists public.chores cascade;
drop table if exists public.machine_states cascade;
drop table if exists public.profiles cascade;
drop table if exists public.households cascade;

drop table if exists public.point_ledger cascade;
drop table if exists public.reward_inventory cascade;
drop table if exists public.rewards cascade;
drop table if exists public.chore_completions cascade;
drop table if exists public.household_members cascade;

drop function if exists public.get_auth_household_id() cascade;
drop function if exists public.is_household_member(uuid) cascade;
drop function if exists public.current_member(uuid) cascade;
drop function if exists public.is_parent(uuid) cascade;
drop function if exists public.create_household(text, text, text) cascade;
drop function if exists public.submit_chore_completion(uuid, uuid, date, text, text, text) cascade;
drop function if exists public.approve_chore_completion(uuid) cascade;
drop function if exists public.purchase_reward(uuid, uuid) cascade;
drop function if exists public.redeem_reward(uuid) cascade;

drop type if exists public.ledger_kind cascade;
drop type if exists public.inventory_status cascade;
drop type if exists public.chore_status cascade;
drop type if exists public.household_role cascade;
