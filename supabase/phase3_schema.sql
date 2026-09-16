-- 1. Storage Bucket: chore-proofs
insert into storage.buckets (id, name, public) values ('chore-proofs', 'chore-proofs', true)
on conflict (id) do nothing;

-- 2. Storage RLS Policies
create policy "Public access to chore-proofs"
  on storage.objects for select
  using ( bucket_id = 'chore-proofs' );

create policy "Users can upload to chore-proofs"
  on storage.objects for insert
  with check ( bucket_id = 'chore-proofs' and auth.role() = 'authenticated' );

-- 3. Analytics Logs Table (for Smart Restock tracking)
create table if not exists analytics_logs (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  event_name text not null,
  event_data jsonb default '{}'::jsonb,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table analytics_logs enable row level security;
create policy "Household access for analytics_logs" on analytics_logs for all using (household_id = get_auth_household_id());
