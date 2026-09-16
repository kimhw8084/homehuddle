-- Core household mutations remain server-authoritative. Clients can read via
-- RLS but create/update sensitive records only through these functions.

create or replace function public.is_parent(target_household_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.household_members
    where household_id = target_household_id
      and auth_user_id = auth.uid()
      and role in ('owner', 'parent')
  );
$$;

create or replace function public.touch_chore_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists chores_touch_updated_at on public.chores;
create trigger chores_touch_updated_at
before update on public.chores
for each row execute function public.touch_chore_updated_at();

create or replace function public.create_chore(
  target_household_id uuid,
  chore_title text,
  chore_points integer,
  assignee_id uuid default null,
  due_at_value timestamptz default null,
  recurrence_value text default null,
  requires_photo boolean default false
) returns uuid language plpgsql security definer set search_path = public as $$
declare new_chore_id uuid;
begin
  if not public.is_parent(target_household_id) then
    raise exception 'Parent access required';
  end if;
  if char_length(trim(chore_title)) not between 1 and 120 then
    raise exception 'Chore title must be between 1 and 120 characters';
  end if;
  if chore_points < 0 then
    raise exception 'Chore points cannot be negative';
  end if;
  if assignee_id is not null and not exists (
    select 1 from public.household_members
    where id = assignee_id and household_id = target_household_id
  ) then
    raise exception 'Assignee must belong to this household';
  end if;

  insert into public.chores (
    household_id, title, points, assigned_member_id, due_at, recurrence_rule, photo_required
  ) values (
    target_household_id, trim(chore_title), chore_points, assignee_id,
    due_at_value, recurrence_value, requires_photo
  ) returning id into new_chore_id;

  return new_chore_id;
end;
$$;

create or replace function public.create_reward(
  target_household_id uuid,
  reward_title text,
  reward_cost integer,
  reward_description text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare new_reward_id uuid;
begin
  if not public.is_parent(target_household_id) then
    raise exception 'Parent access required';
  end if;
  if char_length(trim(reward_title)) not between 1 and 100 then
    raise exception 'Reward title must be between 1 and 100 characters';
  end if;
  if reward_cost <= 0 then
    raise exception 'Reward cost must be greater than zero';
  end if;

  insert into public.rewards (household_id, title, description, cost)
  values (target_household_id, trim(reward_title), nullif(trim(reward_description), ''), reward_cost)
  returning id into new_reward_id;

  return new_reward_id;
end;
$$;

alter table public.chore_completions add column if not exists review_note text;

create or replace function public.reject_chore_completion(
  target_completion_id uuid,
  feedback text default null
) returns void language plpgsql security definer set search_path = public as $$
declare completion_row public.chore_completions; reviewer public.household_members;
begin
  select * into completion_row from public.chore_completions where id = target_completion_id for update;
  if not found then raise exception 'Completion not found'; end if;
  select * into reviewer from public.current_member(completion_row.household_id);
  if reviewer.id is null or reviewer.role not in ('owner', 'parent') then raise exception 'Parent approval required'; end if;
  if completion_row.status <> 'submitted' then raise exception 'Completion has already been reviewed'; end if;

  update public.chore_completions
  set status = 'rejected', reviewed_by_member_id = reviewer.id, reviewed_at = now(), review_note = nullif(trim(feedback), '')
  where id = target_completion_id;
  update public.chores set status = 'pending', updated_at = now() where id = completion_row.chore_id;
end;
$$;

alter table public.household_members replica identity full;
alter table public.chores replica identity full;
alter table public.chore_completions replica identity full;
alter table public.rewards replica identity full;
alter table public.reward_inventory replica identity full;
alter table public.point_ledger replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.household_members;
exception when duplicate_object then null;
end;
$$;
do $$
begin
  alter publication supabase_realtime add table public.chores;
exception when duplicate_object then null;
end;
$$;
do $$
begin
  alter publication supabase_realtime add table public.chore_completions;
exception when duplicate_object then null;
end;
$$;
do $$
begin
  alter publication supabase_realtime add table public.rewards;
exception when duplicate_object then null;
end;
$$;
do $$
begin
  alter publication supabase_realtime add table public.reward_inventory;
exception when duplicate_object then null;
end;
$$;
do $$
begin
  alter publication supabase_realtime add table public.point_ledger;
exception when duplicate_object then null;
end;
$$;
