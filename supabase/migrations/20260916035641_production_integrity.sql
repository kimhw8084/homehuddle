-- Forward-only integrity improvements. Never run the historical reset migration
-- against an existing production database; see docs/operations.md.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Some hosted projects have Supabase's RLS event-trigger helper in public.
-- Event triggers do not require this helper to be callable through the API.
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

alter table public.household_members add column removed_at timestamptz;
alter table public.chores add column archived_at timestamptz;
alter table public.chores add column version integer not null default 1;
alter table public.chores add column notes text not null default '' check (length(notes) <= 2000);
alter table public.chores add column due_date date;
update public.chores set due_date = due_at::date;
alter table public.chore_completions add column awarded_points integer;
update public.chore_completions c set awarded_points = coalesce(
  (select l.amount from public.point_ledger l where l.completion_id = c.id),
  (select points from public.chores where id = c.chore_id));
alter table public.chore_completions alter column awarded_points set not null;
alter table public.chore_completions add check (awarded_points >= 0);
alter table public.reward_inventory add column title_snapshot text;
alter table public.reward_inventory add column cost_snapshot integer;
alter table public.reward_inventory add column operation_id uuid;
alter table public.reward_inventory add column purchased_by uuid references auth.users(id) on delete set null;
update public.reward_inventory i set title_snapshot = r.title, cost_snapshot = r.cost from public.rewards r where r.id = i.reward_id;
alter table public.reward_inventory alter column title_snapshot set not null;
alter table public.reward_inventory alter column cost_snapshot set not null;
alter table public.reward_inventory add check (cost_snapshot > 0);
create unique index reward_inventory_operation_idx on public.reward_inventory(purchased_by, operation_id) where operation_id is not null;
create unique index household_members_one_account_idx on public.household_members(auth_user_id) where auth_user_id is not null and removed_at is null;
create index chores_assignee_idx on public.chores(assigned_member_id);
create index completions_member_idx on public.chore_completions(completed_by_member_id);
create index completions_reviewer_idx on public.chore_completions(reviewed_by_member_id);
create index inventory_member_idx on public.reward_inventory(member_id);
create index inventory_reward_idx on public.reward_inventory(reward_id);
create index inventory_purchaser_idx on public.reward_inventory(purchased_by);
create index ledger_member_idx on public.point_ledger(member_id);
create index households_owner_idx on public.households(owner_id);
create index invites_creator_idx on public.household_invites(created_by);

-- Tenant consistency is a database constraint, not just a client convention.
alter table public.household_members add unique (id, household_id);
alter table public.chores add unique (id, household_id);
alter table public.rewards add unique (id, household_id);
alter table public.chores add foreign key (assigned_member_id, household_id) references public.household_members(id, household_id);
alter table public.chore_completions add foreign key (chore_id, household_id) references public.chores(id, household_id) on delete cascade;
alter table public.chore_completions add foreign key (completed_by_member_id, household_id) references public.household_members(id, household_id);
alter table public.reward_inventory add foreign key (member_id, household_id) references public.household_members(id, household_id);
alter table public.reward_inventory add foreign key (reward_id, household_id) references public.rewards(id, household_id);
alter table public.point_ledger add foreign key (member_id, household_id) references public.household_members(id, household_id);

create or replace function public.is_household_member(target_household_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.household_members where household_id = target_household_id and auth_user_id = (select auth.uid()) and removed_at is null);
$$;
create or replace function public.current_member(target_household_id uuid)
returns public.household_members language sql stable security definer set search_path = '' as $$
  select * from public.household_members where household_id = target_household_id and auth_user_id = (select auth.uid()) and removed_at is null limit 1;
$$;
create or replace function public.is_parent(target_household_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.household_members where household_id = target_household_id and auth_user_id = (select auth.uid()) and removed_at is null and role in ('owner', 'parent'));
$$;
create or replace function public.is_household_owner(target_household_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.household_members where household_id = target_household_id and auth_user_id = (select auth.uid()) and removed_at is null and role = 'owner');
$$;

-- Only the owner needs invitation addresses and bearer tokens.
drop policy "members read invites" on public.household_invites;
create policy "owner reads invites" on public.household_invites for select to authenticated using (public.is_household_owner(household_id));
revoke select on public.household_members from authenticated;
grant select (id, household_id, auth_user_id, display_name, avatar, role, wallet_balance, created_at, removed_at) on public.household_members to authenticated;
revoke all on function public.current_member(uuid), public.is_household_pro(uuid) from public, anon, authenticated;
revoke all on function public.is_household_member(uuid), public.is_parent(uuid), public.is_household_owner(uuid) from public, anon;
grant execute on function public.is_household_member(uuid), public.is_parent(uuid), public.is_household_owner(uuid) to authenticated;

create or replace function public.create_household(household_name text, owner_name text, owner_avatar text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare existing public.household_members; household_id_value uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  select * into existing from public.household_members where auth_user_id = auth.uid() and removed_at is null;
  if found then
    if existing.role = 'owner' then return existing.household_id; end if;
    raise exception 'This account already belongs to a household';
  end if;
  if household_name is null or length(trim(household_name)) not between 1 and 80 then raise exception 'Enter a household name between 1 and 80 characters'; end if;
  if owner_name is null or length(trim(owner_name)) not between 1 and 30 then raise exception 'Enter a display name between 1 and 30 characters'; end if;
  insert into public.households(name, owner_id) values(trim(household_name), auth.uid()) returning id into household_id_value;
  insert into public.household_members(household_id, auth_user_id, display_name, avatar, role)
    values(household_id_value, auth.uid(), trim(owner_name), owner_avatar, 'owner');
  return household_id_value;
end;
$$;

create function private.can_act_for(target_household uuid, target_member uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.household_members actor join public.household_members subject on subject.household_id = actor.household_id
    where actor.household_id = target_household and actor.auth_user_id = (select auth.uid())
      and actor.removed_at is null and subject.id = target_member and subject.removed_at is null
      and (actor.id = subject.id or (actor.role in ('owner','parent') and subject.role = 'child' and subject.auth_user_id is null))
  );
$$;
revoke all on function private.can_act_for(uuid, uuid) from public, anon, authenticated;

create or replace function public.submit_chore_completion(target_chore_id uuid, completed_by uuid, completion_date date, before_path text default null, after_path text default null, completion_note text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare chore_row public.chores; existing public.chore_completions; completion_id_value uuid; proof text;
begin
  select * into chore_row from public.chores where id = target_chore_id;
  if not found or not public.is_household_member(chore_row.household_id) then raise exception 'Chore not found'; end if;
  perform 1 from public.households where id = chore_row.household_id for update;
  select * into chore_row from public.chores where id = target_chore_id for update;
  if chore_row.archived_at is not null then raise exception 'This chore is archived'; end if;
  if not private.can_act_for(chore_row.household_id, completed_by) then raise exception 'You cannot submit for this member'; end if;
  if chore_row.assigned_member_id is not null and chore_row.assigned_member_id <> completed_by then raise exception 'Only the assigned member can complete this chore'; end if;
  if completion_date is null or (chore_row.due_date is not null and completion_date <> chore_row.due_date) then raise exception 'Completion date must match this chore'; end if;
  if length(coalesce(completion_note,'')) > 2000 then raise exception 'Completion note is too long'; end if;
  select * into existing from public.chore_completions where chore_id = target_chore_id and occurrence_date = completion_date for update;
  if found and existing.completed_by_member_id <> completed_by then raise exception 'This occurrence was submitted by another member'; end if;
  if found and existing.status in ('submitted','approved') then return existing.id; end if;
  if exists(select 1 from public.chore_completions where chore_id=target_chore_id and id is distinct from existing.id and status in ('submitted','approved')) then raise exception 'This chore already has a submitted occurrence'; end if;
  if chore_row.status = 'approved' then raise exception 'This chore is already approved'; end if;
  if chore_row.photo_required and coalesce(after_path,'') = '' then raise exception 'Photo proof is required'; end if;
  foreach proof in array array[before_path, after_path] loop
    if proof is not null and (split_part(proof,'/',1) <> chore_row.household_id::text or split_part(proof,'/',2) <> chore_row.id::text
      or not exists(select 1 from storage.objects where bucket_id = 'chore-proofs' and name = proof)) then raise exception 'Invalid proof photo'; end if;
  end loop;
  insert into public.chore_completions(chore_id,household_id,completed_by_member_id,occurrence_date,before_photo_path,after_photo_path,note,awarded_points)
  values(target_chore_id,chore_row.household_id,completed_by,completion_date,before_path,after_path,nullif(trim(completion_note),''),chore_row.points)
  on conflict (chore_id,occurrence_date) do update set status = 'submitted', before_photo_path = excluded.before_photo_path,
    after_photo_path = excluded.after_photo_path, note = excluded.note, awarded_points = excluded.awarded_points,
    reviewed_by_member_id = null, reviewed_at = null, review_note = null, created_at = now()
  returning id into completion_id_value;
  update public.chores set status = 'submitted' where id = target_chore_id;
  return completion_id_value;
end;
$$;

create or replace function public.approve_chore_completion(target_completion_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare completion public.chore_completions; reviewer public.household_members;
begin
  select * into completion from public.chore_completions where id = target_completion_id;
  if not found or not public.is_parent(completion.household_id) then raise exception 'Parent approval required'; end if;
  perform 1 from public.households where id = completion.household_id for update;
  perform 1 from public.chores where id = completion.chore_id for update;
  select * into completion from public.chore_completions where id = target_completion_id for update;
  if completion.status = 'approved' then return; end if;
  if completion.status <> 'submitted' then raise exception 'Only submitted completions can be approved'; end if;
  select * into reviewer from public.current_member(completion.household_id);
  update public.chore_completions set status = 'approved', reviewed_by_member_id = reviewer.id, reviewed_at = now() where id = target_completion_id;
  update public.chores set status = 'approved' where id = completion.chore_id;
  if completion.awarded_points > 0 then
    update public.household_members set wallet_balance = wallet_balance + completion.awarded_points where id = completion.completed_by_member_id;
    insert into public.point_ledger(household_id,member_id,kind,amount,completion_id)
      values(completion.household_id,completion.completed_by_member_id,'chore_award',completion.awarded_points,completion.id);
  end if;
end;
$$;

create or replace function public.reject_chore_completion(target_completion_id uuid, feedback text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare completion public.chore_completions; reviewer public.household_members;
begin
  select * into completion from public.chore_completions where id = target_completion_id;
  if not found or not public.is_parent(completion.household_id) then raise exception 'Parent approval required'; end if;
  if length(coalesce(feedback,'')) > 2000 then raise exception 'Feedback is too long'; end if;
  perform 1 from public.households where id = completion.household_id for update;
  perform 1 from public.chores where id = completion.chore_id for update;
  select * into completion from public.chore_completions where id = target_completion_id for update;
  if completion.status = 'rejected' then return; end if;
  if completion.status <> 'submitted' then raise exception 'Only submitted completions can be rejected'; end if;
  select * into reviewer from public.current_member(completion.household_id);
  update public.chore_completions set status = 'rejected', reviewed_by_member_id = reviewer.id, reviewed_at = now(), review_note = nullif(trim(feedback),'') where id = completion.id;
  update public.chores set status = 'pending' where id = completion.chore_id;
end;
$$;

create function public.purchase_reward_once(target_reward_id uuid, target_member_id uuid, request_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare reward public.rewards; member public.household_members; inventory public.reward_inventory; inventory_id_value uuid;
begin
  if request_id is null then raise exception 'A request ID is required'; end if;
  select * into reward from public.rewards where id = target_reward_id;
  if not found or not private.can_act_for(reward.household_id,target_member_id) then raise exception 'You cannot purchase for this member'; end if;
  perform 1 from public.households where id = reward.household_id for update;
  select * into inventory from public.reward_inventory where purchased_by = auth.uid() and operation_id = request_id;
  if found then
    if inventory.member_id <> target_member_id or inventory.reward_id <> target_reward_id then raise exception 'Request ID was used for a different purchase'; end if;
    return inventory.id;
  end if;
  select * into reward from public.rewards where id = target_reward_id for update;
  if not reward.active then raise exception 'This reward is no longer available'; end if;
  select * into member from public.household_members where id = target_member_id for update;
  if member.wallet_balance < reward.cost then raise exception 'Insufficient points'; end if;
  update public.household_members set wallet_balance = wallet_balance - reward.cost where id = member.id;
  insert into public.reward_inventory(household_id,member_id,reward_id,title_snapshot,cost_snapshot,purchased_by,operation_id)
    values(reward.household_id,member.id,reward.id,reward.title,reward.cost,auth.uid(),request_id) returning id into inventory_id_value;
  insert into public.point_ledger(household_id,member_id,kind,amount,inventory_id)
    values(reward.household_id,member.id,'reward_purchase',-reward.cost,inventory_id_value);
  return inventory_id_value;
end;
$$;
create or replace function public.purchase_reward(target_reward_id uuid, target_member_id uuid)
returns uuid language sql security definer set search_path = '' as $$
  select public.purchase_reward_once(target_reward_id,target_member_id,gen_random_uuid());
$$;
create or replace function public.redeem_reward(target_inventory_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare inventory public.reward_inventory;
begin
  select * into inventory from public.reward_inventory where id = target_inventory_id for update;
  if not found or not private.can_act_for(inventory.household_id,inventory.member_id) then raise exception 'You cannot redeem this reward'; end if;
  if inventory.status = 'redeemed' then return; end if;
  update public.reward_inventory set status = 'redeemed', redeemed_at = now() where id = inventory.id;
end;
$$;

create function public.update_chore(target_chore_id uuid, chore_title text, chore_points integer, assignee_id uuid, due_date_value date, notes_value text default '', requires_photo boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare chore public.chores;
begin
  select * into chore from public.chores where id = target_chore_id;
  if not found or not public.is_parent(chore.household_id) then raise exception 'Parent access required'; end if;
  perform 1 from public.households where id = chore.household_id for update;
  select * into chore from public.chores where id = target_chore_id for update;
  if chore.status <> 'pending' or chore.archived_at is not null then raise exception 'Only pending chores can be edited'; end if;
  if chore_title is null or length(trim(chore_title)) not between 1 and 120 then raise exception 'Enter a title between 1 and 120 characters'; end if;
  if chore_points is null or chore_points not between 0 and 100000 then raise exception 'Points must be between 0 and 100000'; end if;
  if length(coalesce(notes_value,'')) > 2000 then raise exception 'Notes are too long'; end if;
  if assignee_id is not null and not exists(select 1 from public.household_members where id = assignee_id and household_id = chore.household_id and removed_at is null) then raise exception 'Invalid assignee'; end if;
  update public.chores set title = trim(chore_title), points = chore_points, assigned_member_id = assignee_id,
    due_date = due_date_value, due_at = due_date_value::timestamp at time zone 'UTC', notes = coalesce(notes_value,''), photo_required = coalesce(requires_photo,false) where id = chore.id;
end;
$$;
create function public.archive_chore(target_chore_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare chore public.chores;
begin
  select * into chore from public.chores where id = target_chore_id;
  if not found or not public.is_parent(chore.household_id) then raise exception 'Parent access required'; end if;
  perform 1 from public.households where id = chore.household_id for update;
  if exists(select 1 from public.chore_completions where chore_id = chore.id and status = 'submitted') then raise exception 'Review the submitted completion before archiving'; end if;
  update public.chores set archived_at = coalesce(archived_at,now()) where id = chore.id;
end;
$$;
create function public.update_reward(target_reward_id uuid, reward_title text, reward_cost integer, reward_description text default null, is_active boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
declare reward public.rewards;
begin
  select * into reward from public.rewards where id = target_reward_id;
  if not found or not public.is_parent(reward.household_id) then raise exception 'Parent access required'; end if;
  perform 1 from public.households where id = reward.household_id for update;
  if reward_title is null or length(trim(reward_title)) not between 1 and 100 then raise exception 'Enter a title between 1 and 100 characters'; end if;
  if reward_cost is null or reward_cost not between 1 and 100000 then raise exception 'Cost must be between 1 and 100000'; end if;
  if length(coalesce(reward_description,'')) > 2000 then raise exception 'Description is too long'; end if;
  update public.rewards set title = trim(reward_title), cost = reward_cost, description = nullif(trim(reward_description),''), active = coalesce(is_active,true) where id = reward.id;
end;
$$;

-- Historical references survive removal without retaining account access or PII.
create or replace function public.remove_household_member(target_member_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare member public.household_members;
begin
  select * into member from public.household_members where id = target_member_id;
  if not found or not public.is_household_owner(member.household_id) then raise exception 'Owner access required'; end if;
  if member.role = 'owner' then raise exception 'Transfer ownership before removing the owner'; end if;
  perform 1 from public.households where id = member.household_id for update;
  update public.household_members set removed_at = now(), auth_user_id = null, display_name = 'Former member', avatar = null, pin_hash = null where id = member.id;
  update public.chores set assigned_member_id = null where assigned_member_id = member.id and status = 'pending';
end;
$$;
create or replace function public.transfer_household_ownership(target_member_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare member public.household_members;
begin
  select * into member from public.household_members where id = target_member_id;
  if not found or not public.is_household_owner(member.household_id) then raise exception 'Owner access required'; end if;
  perform 1 from public.households where id = member.household_id for update;
  select * into member from public.household_members where id = target_member_id for update;
  if member.auth_user_id is null or member.role <> 'parent' or member.removed_at is not null then raise exception 'Ownership must be transferred to an authenticated adult parent'; end if;
  update public.household_members set role = 'parent' where household_id = member.household_id and role = 'owner';
  update public.household_members set role = 'owner' where id = member.id;
  update public.households set owner_id = member.auth_user_id where id = member.household_id;
end;
$$;

update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'] where id = 'chore-proofs';

revoke all on function public.purchase_reward_once(uuid,uuid,uuid), public.update_chore(uuid,text,integer,uuid,date,text,boolean), public.archive_chore(uuid), public.update_reward(uuid,text,integer,text,boolean) from public, anon;
grant execute on function public.purchase_reward_once(uuid,uuid,uuid), public.update_chore(uuid,text,integer,uuid,date,text,boolean), public.archive_chore(uuid), public.update_reward(uuid,text,integer,text,boolean) to authenticated;

-- A shared trigger must not access record fields belonging to another table.
-- PostgreSQL can resolve all fields of a boolean expression before short-circuiting.
create or replace function public.queue_household_notification()
returns trigger language plpgsql security definer set search_path = '' as $$
declare recipient uuid; event_kind public.notification_kind;
  next_row jsonb := to_jsonb(new); previous_row jsonb;
begin
  if tg_op='UPDATE' then previous_row:=to_jsonb(old); else previous_row:='{}'::jsonb; end if;
  if tg_table_name='chores' then
    if next_row->>'assigned_member_id' is null or (tg_op='UPDATE' and next_row->>'assigned_member_id' is not distinct from previous_row->>'assigned_member_id') then return new; end if;
    select auth_user_id into recipient from public.household_members where id=(next_row->>'assigned_member_id')::uuid and removed_at is null;
    event_kind:='chore_assigned';
  elsif tg_table_name='chore_completions' then
    if next_row->>'status'='submitted' and (tg_op='INSERT' or previous_row->>'status'='rejected') then
      insert into public.notification_events(household_id,recipient_user_id,kind,payload)
      select (next_row->>'household_id')::uuid,auth_user_id,'completion_submitted',jsonb_build_object('completion_id',next_row->>'id','chore_id',next_row->>'chore_id')
      from public.household_members where household_id=(next_row->>'household_id')::uuid and auth_user_id is not null and removed_at is null and role in ('owner','parent');
      return new;
    elsif previous_row->>'status'='submitted' and next_row->>'status' in ('approved','rejected') then
      select auth_user_id into recipient from public.household_members where id=(next_row->>'completed_by_member_id')::uuid and removed_at is null;
      event_kind:='completion_reviewed';
    else return new; end if;
  elsif tg_table_name='reward_inventory' then
    if tg_op='INSERT' then event_kind:='reward_purchased';
    elsif previous_row->>'status'='available' and next_row->>'status'='redeemed' then event_kind:='reward_redeemed';
    else return new; end if;
    select auth_user_id into recipient from public.household_members where id=(next_row->>'member_id')::uuid and removed_at is null;
  else return new; end if;
  if recipient is not null then
    insert into public.notification_events(household_id,recipient_user_id,kind,payload)
      values((next_row->>'household_id')::uuid,recipient,event_kind,jsonb_build_object('record_id',next_row->>'id'));
  end if;
  return new;
end;
$$;
drop trigger chores_queue_notification on public.chores;
create trigger chores_queue_notification after insert or update on public.chores for each row execute function public.queue_household_notification();
revoke all on function public.queue_household_notification() from public,anon,authenticated;

create or replace function public.export_my_data()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare member_id_value uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select id into member_id_value from public.household_members where auth_user_id=auth.uid() and removed_at is null;
  return jsonb_build_object(
    'schema_version',1,'exported_at',now(),
    'member',(select to_jsonb(m)-'pin_hash' from public.household_members m where id=member_id_value),
    'completions',coalesce((select jsonb_agg(to_jsonb(c)) from public.chore_completions c where completed_by_member_id=member_id_value),'[]'::jsonb),
    'inventory',coalesce((select jsonb_agg(to_jsonb(i)) from public.reward_inventory i where member_id=member_id_value),'[]'::jsonb),
    'ledger',coalesce((select jsonb_agg(to_jsonb(l)) from public.point_ledger l where member_id=member_id_value),'[]'::jsonb),
    'notification_preferences',(select to_jsonb(p) from public.notification_preferences p where user_id=auth.uid())
  );
end;
$$;

alter table public.household_invites alter column created_by drop not null;
alter table public.household_invites drop constraint household_invites_created_by_fkey;
alter table public.household_invites add foreign key(created_by) references auth.users(id) on delete set null;
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if exists(select 1 from public.household_members where auth_user_id=auth.uid() and role='owner' and removed_at is null) then raise exception 'Transfer ownership or close your household before deleting your account'; end if;
  update public.household_members set auth_user_id=null,removed_at=now(),display_name='Former member',avatar=null,pin_hash=null where auth_user_id=auth.uid();
  delete from auth.sessions where user_id=auth.uid();
  delete from auth.users where id=auth.uid();
end;
$$;

create or replace function public.touch_chore_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at:=now(); new.version:=old.version+1; return new; end;
$$;

create function public.create_chore_v2(target_household_id uuid,request_id uuid,chore_title text,chore_points integer,assignee_id uuid,due_date_value date,notes_value text,requires_photo boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare existing public.chores;
begin
  if not public.is_parent(target_household_id) then raise exception 'Parent access required'; end if;
  if request_id is null then raise exception 'Request ID required'; end if;
  if chore_title is null or length(trim(chore_title)) not between 1 and 120 then raise exception 'Enter a title between 1 and 120 characters'; end if;
  if chore_points is null or chore_points not between 0 and 100000 then raise exception 'Points must be between 0 and 100000'; end if;
  if length(coalesce(notes_value,''))>2000 then raise exception 'Notes are too long'; end if;
  if assignee_id is not null and not exists(select 1 from public.household_members where id=assignee_id and household_id=target_household_id and removed_at is null) then raise exception 'Invalid assignee'; end if;
  perform 1 from public.households where id=target_household_id for update;
  select * into existing from public.chores where id=request_id;
  if found then
    if existing.household_id=target_household_id and existing.title=trim(chore_title) and existing.points=chore_points and existing.assigned_member_id is not distinct from assignee_id and existing.due_date is not distinct from due_date_value and existing.notes=coalesce(notes_value,'') and existing.photo_required=requires_photo then return existing.id; end if;
    raise exception 'This request already created a different chore. Refresh before trying again.';
  end if;
  insert into public.chores(id,household_id,title,points,assigned_member_id,due_date,due_at,notes,photo_required)
    values(request_id,target_household_id,trim(chore_title),chore_points,assignee_id,due_date_value,due_date_value::timestamp at time zone 'UTC',coalesce(notes_value,''),coalesce(requires_photo,false));
  return request_id;
end;
$$;
create function public.update_chore_v2(target_chore_id uuid,chore_title text,chore_points integer,assignee_id uuid,due_date_value date,notes_value text,requires_photo boolean,expected_version integer)
returns void language plpgsql security definer set search_path = '' as $$
declare chore public.chores;
begin
  select * into chore from public.chores where id=target_chore_id;
  if not found or not public.is_parent(chore.household_id) then raise exception 'Parent access required'; end if;
  perform 1 from public.households where id=chore.household_id for update;
  select * into chore from public.chores where id=target_chore_id for update;
  if chore.title=trim(chore_title) and chore.points=chore_points and chore.assigned_member_id is not distinct from assignee_id and chore.due_date is not distinct from due_date_value and chore.notes=notes_value and chore.photo_required=requires_photo then return; end if;
  if expected_version is null or chore.version<>expected_version then raise exception 'This chore changed on another device. Refresh and try again.'; end if;
  perform public.update_chore(target_chore_id,chore_title,chore_points,assignee_id,due_date_value,notes_value,requires_photo);
end;
$$;
revoke all on function public.update_chore(uuid,text,integer,uuid,date,text,boolean) from authenticated;
revoke all on function public.create_chore_v2(uuid,uuid,text,integer,uuid,date,text,boolean),public.update_chore_v2(uuid,text,integer,uuid,date,text,boolean,integer) from public,anon;
grant execute on function public.create_chore_v2(uuid,uuid,text,integer,uuid,date,text,boolean),public.update_chore_v2(uuid,text,integer,uuid,date,text,boolean,integer) to authenticated;

create function public.purchase_reward_v2(target_reward_id uuid,target_member_id uuid,request_id uuid,expected_cost integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare reward public.rewards; existing public.reward_inventory;
begin
  select * into reward from public.rewards where id=target_reward_id;
  if not found or not private.can_act_for(reward.household_id,target_member_id) then raise exception 'You cannot purchase for this member'; end if;
  perform 1 from public.households where id=reward.household_id for update;
  select * into existing from public.reward_inventory where purchased_by=auth.uid() and operation_id=request_id;
  if found then
    if existing.reward_id<>target_reward_id or existing.member_id<>target_member_id then raise exception 'Request ID belongs to another purchase'; end if;
    return existing.id;
  end if;
  select * into reward from public.rewards where id=target_reward_id for update;
  if expected_cost is null or reward.cost<>expected_cost then raise exception 'The reward price changed. Refresh and confirm the new price.'; end if;
  return public.purchase_reward_once(target_reward_id,target_member_id,request_id);
end;
$$;
revoke all on function public.purchase_reward_v2(uuid,uuid,uuid,integer) from public,anon;
grant execute on function public.purchase_reward_v2(uuid,uuid,uuid,integer) to authenticated;
