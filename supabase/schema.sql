-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. HOUSEHOLDS
create table households (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  join_code text unique not null,
  tax_pool_balance int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table households enable row level security;

-- 2. PROFILES
-- Links directly to Supabase Auth Users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid references households(id) on delete cascade,
  display_name text not null,
  role varchar not null check (role in ('parent', 'child')),
  status varchar default 'off_duty' check (status in ('on_duty', 'off_duty', 'away', 'sick')),
  wallet_balance int default 0,
  vault_balance int default 0,
  parent_pin_hash text
);

alter table profiles enable row level security;

-- Helper Function: Get current user's household_id (Optimizes RLS queries)
create or replace function get_auth_household_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select household_id from profiles where id = auth.uid();
$$;

-- RLS: Households
create policy "Users can view their own household"
  on households for select using (id = get_auth_household_id());

create policy "Users can update their own household"
  on households for update using (id = get_auth_household_id());

-- RLS: Profiles
create policy "Users can view profiles in their household"
  on profiles for select using (household_id = get_auth_household_id() or id = auth.uid());

create policy "Users can update their own profile"
  on profiles for update using (id = auth.uid());

-- 3. MACHINE STATES
create table machine_states (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade not null,
  machine_name text not null,
  current_state varchar not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table machine_states enable row level security;
create policy "Household access for machine_states" on machine_states for all using (household_id = get_auth_household_id());

-- 4. CHORES
create table chores (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade not null,
  title text not null,
  point_value int default 0,
  photo_req varchar default 'none' check (photo_req in ('none', 'after', 'before_after')),
  allow_claim_jump boolean default false,
  assigned_to uuid references profiles(id) on delete set null,
  due_date timestamp with time zone,
  status varchar default 'pending' check (status in ('pending', 'completed', 'approved', 'overdue'))
);

alter table chores enable row level security;
create policy "Household access for chores" on chores for all using (household_id = get_auth_household_id());

-- 5. CHORE LEDGER
create table chore_ledger (
  id uuid primary key default uuid_generate_v4(),
  chore_id uuid references chores(id) on delete cascade not null,
  household_id uuid references households(id) on delete cascade not null, -- denormalized for easier RLS filtering
  completed_by uuid references profiles(id) on delete set null,
  claim_jumped_from uuid references profiles(id) on delete set null,
  approved_by uuid references profiles(id) on delete set null,
  before_photo_url text,
  after_photo_url text,
  audio_receipt_url text,
  points_awarded int default 0,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table chore_ledger enable row level security;
create policy "Household access for chore_ledger" on chore_ledger for all using (household_id = get_auth_household_id());

-- 6. REWARDS STORE
create table rewards_store (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade not null,
  title text not null,
  base_cost int not null,
  visible_to_role varchar check (visible_to_role in ('parent', 'child', 'all')) default 'all'
);

alter table rewards_store enable row level security;
create policy "Household access for rewards_store" on rewards_store for all using (household_id = get_auth_household_id());

-- 7. USER INVENTORY
create table user_inventory (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  reward_id uuid references rewards_store(id) on delete cascade not null,
  status varchar default 'available' check (status in ('available', 'redeemed')),
  purchased_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table user_inventory enable row level security;
create policy "Users view household inventory" on user_inventory for select using (
  user_id in (select id from profiles where household_id = get_auth_household_id())
);
create policy "Users update own inventory" on user_inventory for update using (user_id = auth.uid());
create policy "Users insert own inventory" on user_inventory for insert with check (user_id = auth.uid());

-- 8. RESTOCK HISTORY
create table restock_history (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade not null,
  item_name text not null,
  logged_by uuid references profiles(id) on delete set null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table restock_history enable row level security;
create policy "Household access for restock_history" on restock_history for all using (household_id = get_auth_household_id());

-- 9. NUDGES
create table nudges (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade not null,
  sender_id uuid references profiles(id) on delete cascade not null,
  receiver_id uuid references profiles(id) on delete cascade not null,
  message_template text not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table nudges enable row level security;
create policy "Household access for nudges" on nudges for all using (household_id = get_auth_household_id());