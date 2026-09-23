-- Civil-date routines produce independent, immutable-identity chore occurrences.
-- CLI-created migration; timestamp aligned to the hosted migration tool receipt.
-- No scheduler or paid extension required: members materialize the next 14 days.
create table public.chore_routines (
  id uuid primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 120),
  points integer not null check (points between 0 and 100000),
  notes text not null default '' check (length(notes) <= 2000),
  photo_required boolean not null default false,
  timezone text not null,
  starts_on date not null,
  ends_on date check (ends_on >= starts_on),
  frequency text not null check (frequency in ('daily','weekly')),
  interval_count integer not null check (interval_count between 1 and 12),
  assignee_ids uuid[] not null default '{}' check (cardinality(assignee_ids) <= 20),
  active boolean not null default true,
  version integer not null default 1,
  created_at timestamptz not null default now()
);
create index chore_routines_household on public.chore_routines(household_id);
alter table public.chore_routines enable row level security;
revoke all on public.chore_routines from public, anon, authenticated;
grant select on public.chore_routines to authenticated;
create policy "members read routines" on public.chore_routines for select to authenticated
  using (public.is_household_member(household_id));
alter table public.chores add column routine_id uuid references public.chore_routines(id) on delete set null;
create unique index chores_one_routine_occurrence on public.chores(routine_id, due_date) where routine_id is not null;
-- Existing SELECT grants are column-scoped; expose only the new non-sensitive field.
grant select(routine_id) on public.chores to authenticated;

create function private.materialize_routines(target_household uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare routine public.chore_routines; local_today date; occurrence date; step integer;
  assignee uuid; generated integer := 0; inserted integer;
begin
  perform 1 from public.households where id=target_household for update;
  for routine in select * from public.chore_routines where household_id=target_household and active loop
    if (routine.interval_count>1 or cardinality(routine.assignee_ids)>1) and not public.is_household_pro(target_household) then continue; end if;
    local_today := (now() at time zone routine.timezone)::date;
    step := routine.interval_count * case when routine.frequency='weekly' then 7 else 1 end;
    for occurrence in select (local_today + n)::date from generate_series(0,13) n
      where local_today+n >= routine.starts_on
        and (routine.ends_on is null or local_today+n <= routine.ends_on)
        and mod(local_today+n-routine.starts_on,step)=0 loop
      assignee := null;
      if cardinality(routine.assignee_ids)>0 then
        assignee := routine.assignee_ids[1 + mod((occurrence-routine.starts_on)/step,cardinality(routine.assignee_ids))];
        -- A removed profile never receives new work. Keep the rotation position;
        -- leave that occurrence unassigned so an adult can choose explicitly.
        if not exists(select 1 from public.household_members where id=assignee and household_id=target_household and removed_at is null) then assignee:=null; end if;
      end if;
      insert into public.chores(household_id,title,points,notes,photo_required,assigned_member_id,due_date,due_at,routine_id,recurrence_rule)
        values(target_household,routine.title,routine.points,routine.notes,routine.photo_required,assignee,occurrence,
          (occurrence+1)::timestamp at time zone routine.timezone,routine.id,
          'FREQ=' || upper(routine.frequency) || ';INTERVAL=' || routine.interval_count)
        on conflict (routine_id,due_date) where routine_id is not null do nothing;
      get diagnostics inserted = row_count;
      generated := generated + inserted;
    end loop;
  end loop;
  return generated;
end;
$$;
revoke all on function private.materialize_routines(uuid) from public,anon,authenticated;

create function public.materialize_household_routines(target_household uuid)
returns integer language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_household_member(target_household) then raise exception 'Household membership required'; end if;
  return private.materialize_routines(target_household);
end;
$$;

create function public.create_chore_routine(target_household uuid, request_id uuid, title_value text,
  points_value integer, notes_value text, photo_value boolean, timezone_value text,
  start_value date, end_value date, frequency_value text, interval_value integer, assignees uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare existing public.chore_routines; local_today date;
begin
  if not public.is_parent(target_household) then raise exception 'Parent access required'; end if;
  if request_id is null then raise exception 'Request ID required'; end if;
  perform 1 from public.households where id=target_household for update;
  select * into existing from public.chore_routines where id=request_id;
  if found then
    if existing.household_id=target_household and existing.title=trim(title_value) and existing.points=points_value
      and existing.notes=notes_value and existing.photo_required=photo_value and existing.timezone=timezone_value
      and existing.starts_on=start_value and existing.ends_on is not distinct from end_value
      and existing.frequency=frequency_value and existing.interval_count=interval_value and existing.assignee_ids=assignees then return request_id; end if;
    raise exception 'This request already created a different routine';
  end if;
  if timezone_value is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=timezone_value) then raise exception 'Choose a valid IANA timezone'; end if;
  local_today := (now() at time zone timezone_value)::date;
  if start_value is null or start_value < local_today or start_value > local_today+365 then raise exception 'Start date must be today or within the next year in the routine timezone'; end if;
  if assignees is null or array_position(assignees,null) is not null then raise exception 'Invalid assignees'; end if;
  if exists(select 1 from unnest(assignees) member_id where not exists(select 1 from public.household_members m where m.id=member_id and m.household_id=target_household and m.removed_at is null)) then raise exception 'Assignees must be active household members'; end if;
  if cardinality(assignees) <> (select count(distinct id) from unnest(assignees) id) then raise exception 'Rotation members must be unique'; end if;
  if (interval_value>1 or cardinality(assignees)>1) and not public.is_household_pro(target_household) then raise exception 'Household Plus is required for custom intervals and rotating assignments'; end if;
  if (select count(*) from public.chore_routines where household_id=target_household and active)>=100 then raise exception 'Pause a routine before adding another (100 active routines maximum)'; end if;
  insert into public.chore_routines(id,household_id,title,points,notes,photo_required,timezone,starts_on,ends_on,frequency,interval_count,assignee_ids)
    values(request_id,target_household,trim(title_value),points_value,notes_value,photo_value,timezone_value,start_value,end_value,frequency_value,interval_value,assignees);
  perform private.materialize_routines(target_household);
  return request_id;
end;
$$;

create function public.set_chore_routine_active(target_routine uuid, active_value boolean, expected_version integer)
returns void language plpgsql security definer set search_path = '' as $$
declare routine public.chore_routines;
begin
  select * into routine from public.chore_routines where id=target_routine;
  if not found or not public.is_parent(routine.household_id) then raise exception 'Parent access required'; end if;
  perform 1 from public.households where id=routine.household_id for update;
  select * into routine from public.chore_routines where id=target_routine for update;
  if routine.active=active_value then return; end if;
  if expected_version is null or routine.version<>expected_version then raise exception 'This routine changed. Refresh before trying again.'; end if;
  if active_value and (routine.interval_count>1 or cardinality(routine.assignee_ids)>1) and not public.is_household_pro(routine.household_id) then raise exception 'Household Plus is required to resume this advanced routine'; end if;
  update public.chore_routines set active=active_value,version=version+1 where id=target_routine;
  -- Pausing stops new generation. Existing occurrences and approved history stay
  -- intact; archive a particular occurrence to skip it without resurrection.
  if active_value then perform private.materialize_routines(routine.household_id); end if;
end;
$$;

revoke all on function public.materialize_household_routines(uuid),public.create_chore_routine(uuid,uuid,text,integer,text,boolean,text,date,date,text,integer,uuid[]),public.set_chore_routine_active(uuid,boolean,integer) from public,anon;
grant execute on function public.materialize_household_routines(uuid),public.create_chore_routine(uuid,uuid,text,integer,text,boolean,text,date,date,text,integer,uuid[]),public.set_chore_routine_active(uuid,boolean,integer) to authenticated;
alter publication supabase_realtime add table public.chore_routines;

-- Export the new user-authored content without changing the established export.
alter function public.export_household_data() rename to export_household_data_core;
revoke all on function public.export_household_data_core() from public,anon,authenticated;
create function public.export_household_data()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb; household uuid;
begin
  result := public.export_household_data_core();
  select household_id into household from public.household_members where auth_user_id=auth.uid() and removed_at is null;
  return result || jsonb_build_object('routines',coalesce((select jsonb_agg(to_jsonb(r)) from public.chore_routines r where household_id=household),'[]'::jsonb));
end;
$$;
revoke all on function public.export_household_data() from public,anon;
grant execute on function public.export_household_data() to authenticated;
