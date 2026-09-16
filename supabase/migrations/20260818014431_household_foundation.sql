-- Production household foundation. Structural changes are RPC-only and owner-only.

create type public.invite_role as enum ('parent', 'teen');
create type public.notification_kind as enum (
  'chore_assigned', 'completion_submitted', 'completion_reviewed', 'reward_purchased', 'reward_redeemed'
);

create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  email text not null check (email = lower(email)),
  role public.invite_role not null,
  token uuid not null unique default gen_random_uuid(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);
create unique index household_invites_one_open_email
  on public.household_invites (household_id, email) where accepted_at is null;

create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_enabled boolean not null default true,
  chore_events boolean not null default true,
  reward_events boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);

create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  recipient_user_id uuid references auth.users(id) on delete cascade,
  kind public.notification_kind not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

create table public.household_entitlements (
  household_id uuid primary key references public.households(id) on delete cascade,
  entitlement text not null default 'homehuddle_pro' check (entitlement = 'homehuddle_pro'),
  active boolean not null default false,
  source text not null default 'revenuecat',
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.household_invites enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.device_tokens enable row level security;
alter table public.notification_events enable row level security;
alter table public.household_entitlements enable row level security;

create or replace function public.is_household_owner(target_household_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.household_members
    where household_id = target_household_id
      and auth_user_id = auth.uid()
      and role = 'owner'
  );
$$;

create policy "members read invites" on public.household_invites for select to authenticated
  using (public.is_household_member(household_id));
create policy "users read notification preferences" on public.notification_preferences for select to authenticated
  using (user_id = (select auth.uid()));
create policy "users read device tokens" on public.device_tokens for select to authenticated
  using (user_id = (select auth.uid()));
create policy "users read notification events" on public.notification_events for select to authenticated
  using (recipient_user_id = (select auth.uid()));
create policy "members read household entitlement" on public.household_entitlements for select to authenticated
  using (public.is_household_member(household_id));

create or replace function public.is_household_pro(target_household_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.household_entitlements where household_id = target_household_id and active and (expires_at is null or expires_at > now()));
$$;

-- Event rows are written in the same transaction as core changes. A server worker
-- can deliver pending rows to Expo without granting clients access to send pushes.
create or replace function public.queue_household_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare recipient uuid; recipient_role public.household_role; event_kind public.notification_kind;
begin
  if tg_table_name = 'chores' and tg_op = 'INSERT' and new.assigned_member_id is not null then
    select auth_user_id into recipient from public.household_members where id = new.assigned_member_id;
    event_kind := 'chore_assigned';
  elsif tg_table_name = 'chore_completions' and tg_op = 'INSERT' then
    event_kind := 'completion_submitted';
    for recipient, recipient_role in select auth_user_id, role from public.household_members where household_id = new.household_id loop
      if recipient is not null and recipient_role in ('owner', 'parent') then
        insert into public.notification_events (household_id, recipient_user_id, kind, payload) values (new.household_id, recipient, event_kind, jsonb_build_object('completion_id', new.id, 'chore_id', new.chore_id));
      end if;
    end loop;
    return new;
  elsif tg_table_name = 'chore_completions' and tg_op = 'UPDATE' and old.status = 'submitted' and new.status in ('approved', 'rejected') then
    select auth_user_id into recipient from public.household_members where id = new.completed_by_member_id;
    event_kind := 'completion_reviewed';
  elsif tg_table_name = 'reward_inventory' and tg_op = 'INSERT' then
    select auth_user_id into recipient from public.household_members where id = new.member_id;
    event_kind := 'reward_purchased';
  elsif tg_table_name = 'reward_inventory' and tg_op = 'UPDATE' and old.status = 'available' and new.status = 'redeemed' then
    select auth_user_id into recipient from public.household_members where id = new.member_id;
    event_kind := 'reward_redeemed';
  else return new;
  end if;
  if recipient is not null then insert into public.notification_events (household_id, recipient_user_id, kind, payload) values (new.household_id, recipient, event_kind, jsonb_build_object('record_id', new.id)); end if;
  return new;
end;
$$;

create trigger chores_queue_notification after insert on public.chores for each row execute function public.queue_household_notification();
create trigger completions_queue_notification after insert or update on public.chore_completions for each row execute function public.queue_household_notification();
create trigger inventory_queue_notification after insert or update on public.reward_inventory for each row execute function public.queue_household_notification();

create or replace function public.create_chore(
  target_household_id uuid, chore_title text, chore_points integer, assignee_id uuid default null,
  due_at_value timestamptz default null, recurrence_value text default null, requires_photo boolean default false
) returns uuid language plpgsql security definer set search_path = public as $$
declare new_chore_id uuid;
begin
  if not public.is_parent(target_household_id) then raise exception 'Parent access required'; end if;
  if recurrence_value is not null and not public.is_household_pro(target_household_id) then raise exception 'Household Pro is required for recurring chores'; end if;
  if char_length(trim(chore_title)) not between 1 and 120 then raise exception 'Chore title must be between 1 and 120 characters'; end if;
  if chore_points < 0 then raise exception 'Chore points cannot be negative'; end if;
  if assignee_id is not null and not exists (select 1 from public.household_members where id = assignee_id and household_id = target_household_id) then raise exception 'Assignee must belong to this household'; end if;
  insert into public.chores (household_id, title, points, assigned_member_id, due_at, recurrence_rule, photo_required)
  values (target_household_id, trim(chore_title), chore_points, assignee_id, due_at_value, recurrence_value, requires_photo) returning id into new_chore_id;
  return new_chore_id;
end;
$$;

create or replace function public.update_household_name(target_household_id uuid, household_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_household_owner(target_household_id) then raise exception 'Owner access required'; end if;
  if char_length(trim(household_name)) not between 1 and 80 then raise exception 'Household name must be between 1 and 80 characters'; end if;
  update public.households set name = trim(household_name) where id = target_household_id;
end;
$$;

create or replace function public.create_household_invite(
  target_household_id uuid, invite_email text, invite_role public.invite_role, expires_in_days integer default 7
) returns uuid language plpgsql security definer set search_path = public as $$
declare new_invite_id uuid;
begin
  if not public.is_household_owner(target_household_id) then raise exception 'Owner access required'; end if;
  if lower(trim(invite_email)) !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'A valid email address is required'; end if;
  if expires_in_days not between 1 and 30 then raise exception 'Invitation expiry must be between 1 and 30 days'; end if;
  insert into public.household_invites (household_id, email, role, expires_at, created_by)
  values (target_household_id, lower(trim(invite_email)), invite_role, now() + make_interval(days => expires_in_days), auth.uid())
  on conflict (household_id, email) where accepted_at is null
  do update set role = excluded.role, expires_at = excluded.expires_at, token = gen_random_uuid(), created_by = auth.uid(), created_at = now()
  returning id into new_invite_id;
  return new_invite_id;
end;
$$;

create or replace function public.accept_household_invite(target_token uuid, display_name text, avatar_value text default null, teen_age_confirmed boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare invite_row public.household_invites; new_member_id uuid; user_email text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select email into user_email from auth.users where id = auth.uid();
  select * into invite_row from public.household_invites where token = target_token for update;
  if not found or invite_row.accepted_at is not null or invite_row.expires_at <= now() then raise exception 'Invitation is invalid or expired'; end if;
  if lower(user_email) <> invite_row.email then raise exception 'Sign in with the invited email address'; end if;
  if invite_row.role = 'teen' and not teen_age_confirmed then raise exception 'Teen members must confirm they are at least 13'; end if;
  if char_length(trim(display_name)) not between 1 and 30 then raise exception 'Display name must be between 1 and 30 characters'; end if;
  if exists (select 1 from public.household_members where auth_user_id = auth.uid()) then raise exception 'This account already belongs to a household'; end if;
  insert into public.household_members (household_id, auth_user_id, display_name, avatar, role)
  values (invite_row.household_id, auth.uid(), trim(display_name), avatar_value, invite_row.role::text::public.household_role)
  returning id into new_member_id;
  update public.household_invites set accepted_at = now(), accepted_by = auth.uid() where id = invite_row.id;
  return new_member_id;
end;
$$;

create or replace function public.add_household_member(
  target_household_id uuid, member_name text, member_role public.household_role, member_avatar text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare new_member_id uuid;
begin
  if not public.is_household_owner(target_household_id) then raise exception 'Owner access required'; end if;
  if member_role <> 'child' then raise exception 'Only parent-managed child profiles can be created directly'; end if;
  if char_length(trim(member_name)) not between 1 and 30 then raise exception 'Display name must be between 1 and 30 characters'; end if;
  insert into public.household_members (household_id, display_name, avatar, role)
  values (target_household_id, trim(member_name), member_avatar, 'child') returning id into new_member_id;
  return new_member_id;
end;
$$;

create or replace function public.update_my_member_profile(display_name_value text, avatar_value text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(trim(display_name_value)) not between 1 and 30 then raise exception 'Display name must be between 1 and 30 characters'; end if;
  update public.household_members set display_name = trim(display_name_value), avatar = avatar_value where auth_user_id = auth.uid();
  if not found then raise exception 'Authenticated household member not found'; end if;
end;
$$;

create or replace function public.change_household_member_role(target_member_id uuid, new_role public.household_role)
returns void language plpgsql security definer set search_path = public as $$
declare member_row public.household_members;
begin
  select * into member_row from public.household_members where id = target_member_id for update;
  if not found then raise exception 'Member not found'; end if;
  if not public.is_household_owner(member_row.household_id) then raise exception 'Owner access required'; end if;
  if member_row.role = 'owner' or new_role = 'owner' then raise exception 'Use ownership transfer for the owner role'; end if;
  if member_row.auth_user_id is null and new_role <> 'child' then raise exception 'A signed-in account is required for parent and teen roles'; end if;
  update public.household_members set role = new_role where id = target_member_id;
end;
$$;

create or replace function public.update_child_profile(target_member_id uuid, member_name text, member_avatar text default null)
returns void language plpgsql security definer set search_path = public as $$
declare member_row public.household_members;
begin
  select * into member_row from public.household_members where id = target_member_id for update;
  if not found or member_row.role <> 'child' then raise exception 'Child profile not found'; end if;
  if not public.is_household_owner(member_row.household_id) then raise exception 'Owner access required'; end if;
  if char_length(trim(member_name)) not between 1 and 30 then raise exception 'Display name must be between 1 and 30 characters'; end if;
  update public.household_members set display_name = trim(member_name), avatar = member_avatar where id = target_member_id;
end;
$$;

create or replace function public.remove_household_member(target_member_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare member_row public.household_members;
begin
  select * into member_row from public.household_members where id = target_member_id for update;
  if not found then raise exception 'Member not found'; end if;
  if not public.is_household_owner(member_row.household_id) then raise exception 'Owner access required'; end if;
  if member_row.role = 'owner' then raise exception 'Transfer ownership before removing the owner'; end if;
  delete from public.household_members where id = target_member_id;
end;
$$;

create or replace function public.transfer_household_ownership(target_member_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare member_row public.household_members; household_row public.households;
begin
  select * into member_row from public.household_members where id = target_member_id for update;
  if not found or member_row.auth_user_id is null or member_row.role not in ('parent', 'teen') then raise exception 'Ownership must be transferred to an authenticated parent or teen'; end if;
  select * into household_row from public.households where id = member_row.household_id for update;
  if not public.is_household_owner(household_row.id) then raise exception 'Owner access required'; end if;
  update public.household_members set role = 'parent' where household_id = household_row.id and role = 'owner';
  update public.household_members set role = 'owner' where id = member_row.id;
  update public.households set owner_id = member_row.auth_user_id where id = household_row.id;
end;
$$;

create or replace function public.close_household()
returns void language plpgsql security definer set search_path = public as $$
declare household_id_value uuid;
begin
  select household_id into household_id_value from public.household_members where auth_user_id = auth.uid() and role = 'owner';
  if household_id_value is null then raise exception 'Owner access required'; end if;
  delete from public.households where id = household_id_value;
end;
$$;

create or replace function public.save_notification_preferences(push_value boolean, chore_value boolean, reward_value boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.notification_preferences (user_id, push_enabled, chore_events, reward_events)
  values (auth.uid(), push_value, chore_value, reward_value)
  on conflict (user_id) do update set push_enabled = excluded.push_enabled, chore_events = excluded.chore_events, reward_events = excluded.reward_events, updated_at = now();
end;
$$;

create or replace function public.register_device_token(token_value text, platform_value text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if platform_value not in ('ios', 'android') or char_length(trim(token_value)) < 10 then raise exception 'Invalid device token'; end if;
  insert into public.device_tokens (user_id, expo_push_token, platform) values (auth.uid(), trim(token_value), platform_value)
  on conflict (expo_push_token) do update set user_id = auth.uid(), platform = excluded.platform, updated_at = now();
end;
$$;

create or replace function public.export_my_data()
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'member', (select to_jsonb(m) from public.household_members m where m.auth_user_id = auth.uid()),
    'completions', coalesce((select jsonb_agg(to_jsonb(c)) from public.chore_completions c join public.household_members m on m.id = c.completed_by_member_id where m.auth_user_id = auth.uid()), '[]'::jsonb),
    'inventory', coalesce((select jsonb_agg(to_jsonb(i)) from public.reward_inventory i join public.household_members m on m.id = i.member_id where m.auth_user_id = auth.uid()), '[]'::jsonb),
    'ledger', coalesce((select jsonb_agg(to_jsonb(l)) from public.point_ledger l join public.household_members m on m.id = l.member_id where m.auth_user_id = auth.uid()), '[]'::jsonb)
  );
$$;

create or replace function public.export_household_data()
returns jsonb language plpgsql security definer set search_path = public as $$
declare target_household_id uuid;
begin
  select household_id into target_household_id from public.household_members where auth_user_id = auth.uid() and role = 'owner';
  if target_household_id is null then raise exception 'Owner access required'; end if;
  return jsonb_build_object('household', (select to_jsonb(h) from public.households h where h.id = target_household_id), 'members', (select jsonb_agg(to_jsonb(m)) from public.household_members m where m.household_id = target_household_id), 'chores', (select jsonb_agg(to_jsonb(c)) from public.chores c where c.household_id = target_household_id), 'completions', (select jsonb_agg(to_jsonb(c)) from public.chore_completions c where c.household_id = target_household_id), 'inventory', (select jsonb_agg(to_jsonb(i)) from public.reward_inventory i where i.household_id = target_household_id), 'ledger', (select jsonb_agg(to_jsonb(l)) from public.point_ledger l where l.household_id = target_household_id));
end;
$$;

-- The caller must have transferred ownership or closed their household. Member records
-- are retained as family history, while the Auth identity and active sessions are removed.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if exists (select 1 from public.household_members where auth_user_id = auth.uid() and role = 'owner') then raise exception 'Transfer ownership or close your household before deleting your account'; end if;
  update public.household_members set auth_user_id = null where auth_user_id = auth.uid();
  delete from auth.sessions where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.is_household_owner(uuid) from public, anon;
revoke all on function public.is_household_pro(uuid) from public, anon;
revoke all on function public.queue_household_notification() from public, anon, authenticated;
revoke all on function public.create_chore(uuid, text, integer, uuid, timestamptz, text, boolean) from public, anon;
revoke all on function public.update_household_name(uuid, text) from public, anon;
revoke all on function public.create_household_invite(uuid, text, public.invite_role, integer) from public, anon;
revoke all on function public.accept_household_invite(uuid, text, text, boolean) from public, anon;
revoke all on function public.add_household_member(uuid, text, public.household_role, text) from public, anon;
revoke all on function public.update_my_member_profile(text, text) from public, anon;
revoke all on function public.change_household_member_role(uuid, public.household_role) from public, anon;
revoke all on function public.update_child_profile(uuid, text, text) from public, anon;
revoke all on function public.remove_household_member(uuid) from public, anon;
revoke all on function public.transfer_household_ownership(uuid) from public, anon;
revoke all on function public.close_household() from public, anon;
revoke all on function public.save_notification_preferences(boolean, boolean, boolean) from public, anon;
revoke all on function public.register_device_token(text, text) from public, anon;
revoke all on function public.export_my_data() from public, anon;
revoke all on function public.export_household_data() from public, anon;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.create_chore(uuid, text, integer, uuid, timestamptz, text, boolean), public.update_household_name(uuid, text), public.create_household_invite(uuid, text, public.invite_role, integer), public.accept_household_invite(uuid, text, text, boolean), public.add_household_member(uuid, text, public.household_role, text), public.update_my_member_profile(text, text), public.change_household_member_role(uuid, public.household_role), public.update_child_profile(uuid, text, text), public.remove_household_member(uuid), public.transfer_household_ownership(uuid), public.close_household(), public.save_notification_preferences(boolean, boolean, boolean), public.register_device_token(text, text), public.export_my_data(), public.export_household_data(), public.delete_my_account() to authenticated;
