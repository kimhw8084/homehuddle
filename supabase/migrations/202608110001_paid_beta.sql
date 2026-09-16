-- HomeHuddle paid-beta foundation. Apply to a fresh staging project first.
create extension if not exists pgcrypto;

create type public.household_role as enum ('owner', 'parent', 'child');
create type public.chore_status as enum ('pending', 'submitted', 'approved', 'rejected');
create type public.inventory_status as enum ('available', 'redeemed');
create type public.ledger_kind as enum ('chore_award', 'reward_purchase', 'reward_refund');

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  join_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  display_name text not null check (char_length(display_name) between 1 and 30),
  avatar text,
  role public.household_role not null,
  pin_hash text,
  wallet_balance integer not null default 0 check (wallet_balance >= 0),
  created_at timestamptz not null default now(),
  unique (household_id, auth_user_id)
);

create table public.chores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  points integer not null default 0 check (points >= 0),
  assigned_member_id uuid references public.household_members(id) on delete set null,
  due_at timestamptz,
  recurrence_rule text,
  photo_required boolean not null default false,
  status public.chore_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chore_completions (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid not null references public.chores(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  completed_by_member_id uuid not null references public.household_members(id) on delete restrict,
  occurrence_date date not null default current_date,
  before_photo_path text,
  after_photo_path text,
  note text,
  status public.chore_status not null default 'submitted',
  reviewed_by_member_id uuid references public.household_members(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (chore_id, occurrence_date)
);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  description text,
  cost integer not null check (cost > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.reward_inventory (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_id uuid not null references public.household_members(id) on delete cascade,
  reward_id uuid not null references public.rewards(id) on delete restrict,
  status public.inventory_status not null default 'available',
  purchased_at timestamptz not null default now(),
  redeemed_at timestamptz
);

create table public.point_ledger (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_id uuid not null references public.household_members(id) on delete restrict,
  kind public.ledger_kind not null,
  amount integer not null check (amount <> 0),
  completion_id uuid unique references public.chore_completions(id) on delete restrict,
  inventory_id uuid unique references public.reward_inventory(id) on delete restrict,
  created_at timestamptz not null default now()
);

create or replace function public.is_household_member(target_household_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.household_members
    where household_id = target_household_id and auth_user_id = auth.uid()
  );
$$;

create or replace function public.current_member(target_household_id uuid)
returns public.household_members language sql stable security definer set search_path = public as $$
  select * from public.household_members
  where household_id = target_household_id and auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.create_household(household_name text, owner_name text, owner_avatar text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_household_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.households (name, owner_id) values (trim(household_name), auth.uid()) returning id into new_household_id;
  insert into public.household_members (household_id, auth_user_id, display_name, avatar, role)
  values (new_household_id, auth.uid(), trim(owner_name), owner_avatar, 'owner');
  return new_household_id;
end;
$$;

create or replace function public.submit_chore_completion(
  target_chore_id uuid,
  completed_by uuid,
  completion_date date,
  before_path text default null,
  after_path text default null,
  completion_note text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare chore_row public.chores; completion_id uuid;
begin
  select * into chore_row from public.chores where id = target_chore_id for update;
  if not found or not public.is_household_member(chore_row.household_id) then raise exception 'Chore not found'; end if;
  if not exists (select 1 from public.household_members where id = completed_by and household_id = chore_row.household_id) then raise exception 'Invalid household member'; end if;
  if chore_row.photo_required and coalesce(after_path, '') = '' then raise exception 'Photo proof is required'; end if;
  insert into public.chore_completions (chore_id, household_id, completed_by_member_id, occurrence_date, before_photo_path, after_photo_path, note)
  values (target_chore_id, chore_row.household_id, completed_by, completion_date, before_path, after_path, completion_note)
  returning id into completion_id;
  update public.chores set status = 'submitted', updated_at = now() where id = target_chore_id;
  return completion_id;
end;
$$;

create or replace function public.approve_chore_completion(target_completion_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare completion_row public.chore_completions; chore_row public.chores; reviewer public.household_members;
begin
  select * into completion_row from public.chore_completions where id = target_completion_id for update;
  if not found then raise exception 'Completion not found'; end if;
  select * into reviewer from public.current_member(completion_row.household_id);
  if reviewer.id is null or reviewer.role not in ('owner', 'parent') then raise exception 'Parent approval required'; end if;
  if completion_row.status <> 'submitted' then raise exception 'Completion has already been reviewed'; end if;
  select * into chore_row from public.chores where id = completion_row.chore_id for update;
  update public.chore_completions set status = 'approved', reviewed_by_member_id = reviewer.id, reviewed_at = now() where id = target_completion_id;
  update public.chores set status = 'approved', updated_at = now() where id = chore_row.id;
  update public.household_members set wallet_balance = wallet_balance + chore_row.points where id = completion_row.completed_by_member_id;
  insert into public.point_ledger (household_id, member_id, kind, amount, completion_id)
  values (completion_row.household_id, completion_row.completed_by_member_id, 'chore_award', chore_row.points, target_completion_id);
end;
$$;

create or replace function public.add_household_member(
  target_household_id uuid,
  member_name text,
  member_role public.household_role,
  member_avatar text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare actor public.household_members; new_member_id uuid;
begin
  select * into actor from public.current_member(target_household_id);
  if actor.id is null or actor.role not in ('owner', 'parent') then raise exception 'Parent access required'; end if;
  if member_role = 'owner' then raise exception 'Owner role cannot be assigned'; end if;
  insert into public.household_members (household_id, display_name, avatar, role)
  values (target_household_id, trim(member_name), member_avatar, member_role)
  returning id into new_member_id;
  return new_member_id;
end;
$$;

create or replace function public.purchase_reward(target_reward_id uuid, target_member_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare reward_row public.rewards; member_row public.household_members; new_inventory_id uuid;
begin
  select * into reward_row from public.rewards where id = target_reward_id and active = true for update;
  if not found or not public.is_household_member(reward_row.household_id) then raise exception 'Reward not found'; end if;
  select * into member_row from public.household_members where id = target_member_id and household_id = reward_row.household_id for update;
  if not found then raise exception 'Member not found'; end if;
  if member_row.wallet_balance < reward_row.cost then raise exception 'Insufficient points'; end if;
  update public.household_members set wallet_balance = wallet_balance - reward_row.cost where id = member_row.id;
  insert into public.reward_inventory (household_id, member_id, reward_id) values (reward_row.household_id, member_row.id, reward_row.id) returning id into new_inventory_id;
  insert into public.point_ledger (household_id, member_id, kind, amount, inventory_id)
  values (reward_row.household_id, member_row.id, 'reward_purchase', -reward_row.cost, new_inventory_id);
  return new_inventory_id;
end;
$$;

create or replace function public.redeem_reward(target_inventory_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare inventory_row public.reward_inventory;
begin
  select * into inventory_row from public.reward_inventory where id = target_inventory_id for update;
  if not found or not public.is_household_member(inventory_row.household_id) then raise exception 'Reward not found'; end if;
  if inventory_row.status <> 'available' then raise exception 'Reward has already been redeemed'; end if;
  update public.reward_inventory set status = 'redeemed', redeemed_at = now() where id = target_inventory_id;
end;
$$;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.chores enable row level security;
alter table public.chore_completions enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_inventory enable row level security;
alter table public.point_ledger enable row level security;

create policy "members read households" on public.households for select using (public.is_household_member(id));
create policy "users read own membership" on public.household_members for select using (auth_user_id = auth.uid());
create policy "members read member profiles" on public.household_members for select using (public.is_household_member(household_id));
create policy "members read chores" on public.chores for select using (public.is_household_member(household_id));
create policy "members read completions" on public.chore_completions for select using (public.is_household_member(household_id));
create policy "members read rewards" on public.rewards for select using (public.is_household_member(household_id));
create policy "members read inventory" on public.reward_inventory for select using (public.is_household_member(household_id));
create policy "members read ledger" on public.point_ledger for select using (public.is_household_member(household_id));

insert into storage.buckets (id, name, public) values ('chore-proofs', 'chore-proofs', false)
on conflict (id) do update set public = false;

create policy "members read their household proof" on storage.objects for select using (
  bucket_id = 'chore-proofs' and public.is_household_member((storage.foldername(name))[1]::uuid)
);
create policy "members upload their household proof" on storage.objects for insert with check (
  bucket_id = 'chore-proofs' and public.is_household_member((storage.foldername(name))[1]::uuid)
);
