create table public.wallet_funds (
  id uuid primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  creator_id uuid not null references public.household_members(id),
  assignee_id uuid references public.household_members(id),
  name text not null check (length(name) between 1 and 100),
  emoji text not null check (length(emoji) between 1 and 32),
  target integer not null check (target between 1 and 100000),
  funded integer not null default 0 check (funded between 0 and target),
  due_date date,
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  created_at timestamptz not null default now(),
  version integer not null default 1,
  unique(id,household_id),
  foreign key(creator_id,household_id) references public.household_members(id,household_id),
  foreign key(assignee_id,household_id) references public.household_members(id,household_id)
);
create index wallet_funds_household_idx on public.wallet_funds(household_id);
create index wallet_funds_creator_idx on public.wallet_funds(creator_id,household_id);
create index wallet_funds_assignee_idx on public.wallet_funds(assignee_id,household_id);
create table public.wallet_fund_contributions (
  fund_id uuid not null,
  household_id uuid not null references public.households(id) on delete cascade,
  member_id uuid not null references public.household_members(id),
  amount integer not null check (amount>0),
  primary key(fund_id,member_id),
  foreign key(fund_id,household_id) references public.wallet_funds(id,household_id) on delete cascade,
  foreign key(member_id,household_id) references public.household_members(id,household_id)
);
create index wallet_contributions_household_idx on public.wallet_fund_contributions(household_id);
create index wallet_contributions_member_idx on public.wallet_fund_contributions(member_id,household_id);
alter table public.point_ledger add column fund_id uuid references public.wallet_funds(id);
create index point_ledger_fund_idx on public.point_ledger(fund_id);
alter table public.wallet_funds enable row level security;
alter table public.wallet_fund_contributions enable row level security;
revoke all on public.wallet_funds,public.wallet_fund_contributions from public,anon,authenticated;
grant select on public.wallet_funds,public.wallet_fund_contributions to authenticated;
create policy "members read funds" on public.wallet_funds for select to authenticated using(public.is_household_member(household_id));
create policy "members read contributions" on public.wallet_fund_contributions for select to authenticated using(public.is_household_member(household_id));
alter publication supabase_realtime add table public.wallet_funds,public.wallet_fund_contributions;

create function public.create_wallet_fund(target_household uuid,fund_id uuid,name_value text,emoji_value text,target_value integer,assignee uuid,due_value date)
returns void language plpgsql security definer set search_path='' as $$
declare actor public.household_members;
begin
  if not public.is_household_member(target_household) then raise exception 'Household access required'; end if;
  perform 1 from public.households where id=target_household for update;
  select * into actor from public.current_member(target_household);
  if actor.id is null then raise exception 'Household access required'; end if;
  if assignee is null and not public.is_parent(target_household) then raise exception 'A parent must create a family fund'; end if;
  if assignee is not null and not private.can_act_for(target_household,assignee) then raise exception 'You cannot create a fund for this member'; end if;
  if private.market_replay(target_household,fund_id,jsonb_build_object('fund',fund_id,'name',name_value,'emoji',emoji_value,'target',target_value,'assignee',assignee,'due',due_value)) then return; end if;
  if name_value is null or length(trim(name_value)) not between 1 and 100 or emoji_value is null or length(emoji_value) not between 1 and 32 or target_value is null or target_value not between 1 and 100000 then raise exception 'Enter a name, emoji, and whole-number target between 1 and 100000'; end if;
  if due_value is not null and (due_value<current_date or due_value>current_date+3650) then raise exception 'Choose a future target date within 10 years'; end if;
  insert into public.wallet_funds(id,household_id,creator_id,assignee_id,name,emoji,target,due_date) values(fund_id,target_household,actor.id,assignee,trim(name_value),emoji_value,target_value,due_value);
end;
$$;

create function public.contribute_wallet_fund(target_fund uuid,member_id_value uuid,request_id uuid,amount_value integer)
returns void language plpgsql security definer set search_path='' as $$
declare fund public.wallet_funds;
begin
  select * into fund from public.wallet_funds where id=target_fund;
  if not found or not public.is_household_member(fund.household_id) then raise exception 'Fund not found'; end if;
  perform 1 from public.households where id=fund.household_id for update;
  if not private.can_act_for(fund.household_id,member_id_value) then raise exception 'You cannot spend this member’s points'; end if;
  if private.market_replay(fund.household_id,request_id,jsonb_build_object('contribute',target_fund,'member',member_id_value,'amount',amount_value)) then return; end if;
  select * into fund from public.wallet_funds where id=target_fund for update;
  if fund.status<>'active' then raise exception 'This fund is closed'; end if;
  if fund.assignee_id is not null and fund.assignee_id<>member_id_value then raise exception 'Only the assignee can fund a personal goal'; end if;
  if amount_value is null or amount_value<1 or amount_value>fund.target-fund.funded then raise exception 'Contribute a whole number no greater than the remaining target'; end if;
  update public.household_members set wallet_balance=wallet_balance-amount_value where id=member_id_value and wallet_balance>=amount_value;
  if not found then raise exception 'Insufficient available points'; end if;
  update public.wallet_funds set funded=funded+amount_value,version=version+1 where id=target_fund;
  insert into public.wallet_fund_contributions(fund_id,household_id,member_id,amount) values(target_fund,fund.household_id,member_id_value,amount_value)
    on conflict(fund_id,member_id) do update set amount=public.wallet_fund_contributions.amount+excluded.amount;
  insert into public.point_ledger(household_id,member_id,kind,amount,fund_id) values(fund.household_id,member_id_value,'fund_contribution',-amount_value,fund.id);
end;
$$;

create function public.close_wallet_fund(target_fund uuid,request_id uuid,expected_version integer,action text)
returns void language plpgsql security definer set search_path='' as $$
declare fund public.wallet_funds; actor public.household_members; contribution public.wallet_fund_contributions;
begin
  select * into fund from public.wallet_funds where id=target_fund;
  if not found or not public.is_household_member(fund.household_id) then raise exception 'Fund not found'; end if;
  perform 1 from public.households where id=fund.household_id for update;
  select * into actor from public.current_member(fund.household_id);
  if actor.id is null or (actor.id<>fund.creator_id and not public.is_parent(fund.household_id)) then raise exception 'The creator or a parent must close this fund'; end if;
  if private.market_replay(fund.household_id,request_id,jsonb_build_object('closeFund',target_fund,'version',expected_version,'action',action)) then return; end if;
  select * into fund from public.wallet_funds where id=target_fund for update;
  if fund.version is distinct from expected_version then raise exception 'This fund changed on another device. Refresh and try again.'; end if;
  if fund.status<>'active' then raise exception 'This fund is already closed'; end if;
  if action='complete' then
    if fund.funded<>fund.target then raise exception 'Reach the target before completing this fund'; end if;
    update public.wallet_funds set status='completed',version=version+1 where id=fund.id;
  elsif action='cancel' then
    -- Preserve the deposit records and refund every contributor, not the creator.
    for contribution in select * from public.wallet_fund_contributions where fund_id=fund.id order by member_id loop
      update public.household_members set wallet_balance=wallet_balance+contribution.amount where id=contribution.member_id;
      insert into public.point_ledger(household_id,member_id,kind,amount,fund_id) values(fund.household_id,contribution.member_id,'fund_refund',contribution.amount,fund.id);
    end loop;
    update public.wallet_funds set status='cancelled',version=version+1 where id=fund.id;
  else raise exception 'Unknown fund action'; end if;
end;
$$;
revoke all on function public.create_wallet_fund(uuid,uuid,text,text,integer,uuid,date),public.contribute_wallet_fund(uuid,uuid,uuid,integer),public.close_wallet_fund(uuid,uuid,integer,text) from public,anon;
grant execute on function public.create_wallet_fund(uuid,uuid,text,text,integer,uuid,date),public.contribute_wallet_fund(uuid,uuid,uuid,integer),public.close_wallet_fund(uuid,uuid,integer,text) to authenticated;

alter function public.get_household_snapshot(uuid,integer) rename to get_household_market_snapshot;
create function public.get_household_snapshot(target_household_id uuid,history_limit integer default 100)
returns jsonb language sql stable security invoker set search_path='' as $$
  select public.get_household_market_snapshot(target_household_id,history_limit)||jsonb_build_object(
    'funds',coalesce((select jsonb_agg(to_jsonb(f)) from public.wallet_funds f where household_id=target_household_id),'[]'::jsonb),
    'fundContributions',coalesce((select jsonb_agg(to_jsonb(c)) from public.wallet_fund_contributions c where household_id=target_household_id),'[]'::jsonb)
  );
$$;
revoke all on function public.get_household_snapshot(uuid,integer) from public,anon;
grant execute on function public.get_household_snapshot(uuid,integer) to authenticated;

alter function public.export_household_data() rename to export_household_data_with_routines;
revoke all on function public.export_household_data_with_routines() from public,anon,authenticated;
create function public.export_household_data()
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; household uuid;
begin
  result:=public.export_household_data_with_routines();
  household:=(result->'household'->>'id')::uuid;
  return result||jsonb_build_object('schema_version',4,
    'market_sales',coalesce((select jsonb_agg(to_jsonb(s)) from public.market_sales s where household_id=household),'[]'::jsonb),
    'wallet_funds',coalesce((select jsonb_agg(to_jsonb(f)) from public.wallet_funds f where household_id=household),'[]'::jsonb),
    'fund_contributions',coalesce((select jsonb_agg(to_jsonb(c)) from public.wallet_fund_contributions c where household_id=household),'[]'::jsonb));
end;
$$;
revoke all on function public.export_household_data() from public,anon;
grant execute on function public.export_household_data() to authenticated;
