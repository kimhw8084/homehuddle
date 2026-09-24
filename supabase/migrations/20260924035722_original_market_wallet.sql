-- Preserve the authored Market/Wallet terms in the shared data model.
-- Forward-only: existing rewards and purchases keep their original values.
alter table public.rewards
  add column emoji text not null default '🎁' check (length(emoji) between 1 and 32),
  add column category text not null default 'Rewards' check (length(category) between 1 and 40),
  add column stock integer check (stock between 0 and 100000),
  add column expires_in_days integer check (expires_in_days between 1 and 3650),
  add column eligible_member_ids uuid[] not null default '{}',
  add column curator_member_ids uuid[] not null default '{}',
  add column created_by_member_id uuid references public.household_members(id) on delete set null,
  add column price_history jsonb not null default '[]',
  add column version integer not null default 1;
update public.rewards set price_history=jsonb_build_array(jsonb_build_object('date',created_at,'pts',cost));
create index rewards_creator_idx on public.rewards(created_by_member_id);
create function private.track_reward_terms() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='INSERT' then new.price_history:=jsonb_build_array(jsonb_build_object('date',now(),'pts',new.cost));
  else
    new.version:=old.version+1;
    new.price_history:=case when new.cost<>old.cost then old.price_history||jsonb_build_array(jsonb_build_object('date',now(),'pts',new.cost)) else old.price_history end;
  end if;
  return new;
end;
$$;
revoke all on function private.track_reward_terms() from public,anon,authenticated;
create trigger rewards_track_terms before insert or update on public.rewards for each row execute function private.track_reward_terms();

alter table public.reward_inventory
  add column emoji_snapshot text not null default '🎁',
  add column expires_at timestamptz,
  add column refunded_at timestamptz,
  add column gifted boolean not null default false,
  add column note text check (length(note)<=2000),
  add column version integer not null default 1;
-- A purchase and its refund are separate, immutable entries, not a rewritten debit.
alter table public.point_ledger drop constraint point_ledger_inventory_id_key;
create unique index ledger_inventory_kind_idx on public.point_ledger(inventory_id,kind) where inventory_id is not null;
create index ledger_household_created_idx on public.point_ledger(household_id,created_at);

create table public.market_sales (
  id uuid primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  scope jsonb not null,
  discount_pct integer not null check (discount_pct between 1 and 100),
  expires_at timestamptz not null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);
create index market_sales_household_idx on public.market_sales(household_id);
alter table public.market_sales enable row level security;
revoke all on public.market_sales from public,anon,authenticated;
grant select on public.market_sales to authenticated;
create policy "members read sales" on public.market_sales for select to authenticated using (public.is_household_member(household_id));
alter publication supabase_realtime add table public.market_sales;

-- Receipts are private: after a lost response, replay the same intent exactly once.
create table private.market_commands (
  actor uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  household_id uuid not null references public.households(id) on delete cascade,
  intent jsonb not null,
  created_at timestamptz not null default now(),
  primary key(actor,request_id)
);
create index market_commands_household_idx on private.market_commands(household_id);
alter table private.market_commands enable row level security;
revoke all on private.market_commands from public,anon,authenticated;

create function private.market_replay(household uuid,request uuid,intent_value jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare previous private.market_commands;
begin
  if request is null or auth.uid() is null then raise exception 'An authenticated request ID is required'; end if;
  select * into previous from private.market_commands where actor=auth.uid() and request_id=request;
  if found then
    if previous.household_id<>household or previous.intent<>intent_value then raise exception 'Request ID belongs to a different change'; end if;
    return true;
  end if;
  insert into private.market_commands(actor,request_id,household_id,intent) values(auth.uid(),request,household,intent_value);
  return false;
end;
$$;
revoke all on function private.market_replay(uuid,uuid,jsonb) from public,anon,authenticated;

create function public.save_market_reward(target_household uuid,target_reward uuid,request_id uuid,expected_version integer,draft jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare reward public.rewards; actor public.household_members; eligible uuid[]; curators uuid[];
  price integer; stock_value integer; expiry integer; title_value text; category_value text; emoji_value text;
begin
  if not public.is_household_member(target_household) then raise exception 'Household access required'; end if;
  perform 1 from public.households where id=target_household for update;
  select * into actor from public.current_member(target_household);
  if actor.id is null then raise exception 'Household access required'; end if;
  select * into reward from public.rewards where id=target_reward;
  if reward.id is not null and reward.household_id<>target_household then raise exception 'Reward not found'; end if;
  if not public.is_parent(target_household) and (reward.id is null or not actor.id=any(reward.curator_member_ids)) then raise exception 'Reward curator access required'; end if;
  if private.market_replay(target_household,request_id,jsonb_build_object('save',target_reward,'version',expected_version,'draft',draft)) then return target_reward; end if;
  if target_reward is null or expected_version is distinct from coalesce(reward.version,0) then raise exception 'This reward changed on another device. Refresh and reopen the editor.'; end if;
  title_value:=trim(draft->>'name'); category_value:=trim(draft->>'category'); emoji_value:=trim(draft->>'emoji');
  price:=(draft->>'pts')::integer; stock_value:=(draft->>'stock')::integer; expiry:=(draft->>'expiresInDays')::integer;
  if title_value is null or length(title_value) not between 1 and 100 then raise exception 'Enter a name between 1 and 100 characters'; end if;
  if price is null or price not between 1 and 100000 then raise exception 'Price must be between 1 and 100000 points'; end if;
  if category_value is null or length(category_value) not between 1 and 40 then raise exception 'Enter a category between 1 and 40 characters'; end if;
  if emoji_value is null or length(emoji_value) not between 1 and 32 then raise exception 'Choose an emoji'; end if;
  if length(coalesce(draft->>'desc',''))>2000 then raise exception 'Description is too long'; end if;
  if stock_value is not null and stock_value not between 0 and 100000 then raise exception 'Stock must be between 0 and 100000'; end if;
  if expiry is not null and expiry not between 1 and 3650 then raise exception 'Expiration must be between 1 and 3650 days'; end if;
  select coalesce(array_agg(distinct value::uuid),'{}') into eligible from jsonb_array_elements_text(draft->'eligibleMembers');
  select coalesce(array_agg(distinct value::uuid),'{}') into curators from jsonb_array_elements_text(draft->'curators');
  if exists(select 1 from unnest(eligible||curators) candidate(member_id) where not exists(select 1 from public.household_members m where m.id=candidate.member_id and m.household_id=target_household and m.removed_at is null)) then raise exception 'Choose current household members'; end if;
  if not public.is_parent(target_household) and curators<>reward.curator_member_ids then raise exception 'Only parents can change curators'; end if;
  if reward.id is null then
    insert into public.rewards(id,household_id,title,description,cost,emoji,category,stock,expires_in_days,eligible_member_ids,curator_member_ids,created_by_member_id,price_history)
    values(target_reward,target_household,title_value,coalesce(draft->>'desc',''),price,emoji_value,category_value,stock_value,expiry,eligible,curators,actor.id,jsonb_build_array(jsonb_build_object('date',now(),'pts',price)));
  else
    if not reward.active then raise exception 'This reward is archived'; end if;
    update public.rewards set title=title_value,description=coalesce(draft->>'desc',''),cost=price,emoji=emoji_value,category=category_value,stock=stock_value,expires_in_days=expiry,
      eligible_member_ids=eligible,curator_member_ids=curators,version=version+1,
      price_history=case when cost<>price then price_history||jsonb_build_array(jsonb_build_object('date',now(),'pts',price)) else price_history end where id=target_reward;
  end if;
  return target_reward;
end;
$$;

create function public.change_market_reward(target_reward uuid,request_id uuid,expected_version integer,action text,quantity integer default 0)
returns void language plpgsql security definer set search_path='' as $$
declare reward public.rewards; actor public.household_members;
begin
  select * into reward from public.rewards where id=target_reward;
  if not found or not public.is_household_member(reward.household_id) then raise exception 'Reward not found'; end if;
  perform 1 from public.households where id=reward.household_id for update;
  select * into reward from public.rewards where id=target_reward;
  select * into actor from public.current_member(reward.household_id);
  if actor.id is null then raise exception 'Household access required'; end if;
  if not public.is_parent(reward.household_id) and not actor.id=any(reward.curator_member_ids) then raise exception 'Reward curator access required'; end if;
  if private.market_replay(reward.household_id,request_id,jsonb_build_object('reward',target_reward,'version',expected_version,'action',action,'quantity',quantity)) then return; end if;
  if expected_version is distinct from reward.version then raise exception 'This reward changed on another device. Refresh and try again.'; end if;
  if action='archive' then update public.rewards set active=false,version=version+1 where id=target_reward;
  elsif action='restock' then
    if not reward.active or reward.stock is null or quantity is null or quantity not between 1 and 100000 or reward.stock+quantity>100000 then raise exception 'Enter valid stock for an active limited reward'; end if;
    update public.rewards set stock=stock+quantity,version=version+1 where id=target_reward;
  else raise exception 'Unknown reward action'; end if;
end;
$$;

create function public.save_market_sale(target_household uuid,sale_id uuid,scope_value jsonb,discount_value integer,expires_value timestamptz)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_parent(target_household) then raise exception 'Parent access required'; end if;
  perform 1 from public.households where id=target_household for update;
  if not public.is_parent(target_household) then raise exception 'Parent access required'; end if;
  if private.market_replay(target_household,sale_id,jsonb_build_object('sale',scope_value,'discount',discount_value,'expires',expires_value)) then return; end if;
  if discount_value is null or discount_value not between 1 and 100 or expires_value is null or expires_value<=now() or expires_value>now()+interval '30 days' then raise exception 'Choose a discount and an end time within 30 days'; end if;
  if scope_value->>'type'='all' then null;
  elsif scope_value->>'type'='categories' then
    if jsonb_typeof(scope_value->'categories') is distinct from 'array' or jsonb_array_length(scope_value->'categories')=0 then raise exception 'Choose categories'; end if;
  elsif scope_value->>'type'='items' then
    if jsonb_typeof(scope_value->'itemIds') is distinct from 'array' or jsonb_array_length(scope_value->'itemIds')=0 then raise exception 'Choose rewards'; end if;
    if exists(select 1 from jsonb_array_elements_text(scope_value->'itemIds') candidate(reward_id) where not exists(select 1 from public.rewards r where r.id=candidate.reward_id::uuid and r.household_id=target_household and r.active)) then raise exception 'Choose active household rewards'; end if;
  else raise exception 'Choose a sale scope'; end if;
  insert into public.market_sales(id,household_id,scope,discount_pct,expires_at) values(sale_id,target_household,scope_value,discount_value,expires_value);
end;
$$;

create function public.cancel_market_sale(target_sale uuid)
returns void language plpgsql security definer set search_path='' as $$
declare sale public.market_sales;
begin
  select * into sale from public.market_sales where id=target_sale;
  if not found or not public.is_parent(sale.household_id) then raise exception 'Parent access required'; end if;
  perform 1 from public.households where id=sale.household_id for update;
  if not public.is_parent(sale.household_id) then raise exception 'Parent access required'; end if;
  update public.market_sales set cancelled_at=coalesce(cancelled_at,now()) where id=target_sale;
end;
$$;

create function private.market_price(reward public.rewards)
returns integer language sql stable set search_path='' as $$
  select greatest(1,round(reward.cost*(1-coalesce(max(s.discount_pct),0)::numeric/100))::integer)
  from public.market_sales s where s.household_id=reward.household_id and s.cancelled_at is null and s.expires_at>now()
    and (s.scope->>'type'='all' or (s.scope->>'type'='categories' and s.scope->'categories' ? reward.category) or (s.scope->>'type'='items' and s.scope->'itemIds' ? reward.id::text));
$$;
revoke all on function private.market_price(public.rewards) from public,anon,authenticated;

-- All purchase entry points share the same inventory/eligibility/stock rules.
create or replace function public.purchase_reward_once(target_reward_id uuid,target_member_id uuid,request_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare reward public.rewards; inventory public.reward_inventory; price integer; inventory_id_value uuid;
begin
  if request_id is null then raise exception 'Request ID required'; end if;
  select * into reward from public.rewards where id=target_reward_id;
  if not found or not private.can_act_for(reward.household_id,target_member_id) then raise exception 'You cannot purchase for this member'; end if;
  perform 1 from public.households where id=reward.household_id for update;
  if not private.can_act_for(reward.household_id,target_member_id) then raise exception 'You cannot purchase for this member'; end if;
  select * into inventory from public.reward_inventory where purchased_by=auth.uid() and operation_id=request_id;
  if found then
    if inventory.reward_id<>target_reward_id or inventory.member_id<>target_member_id then raise exception 'Request ID belongs to another purchase'; end if;
    return inventory.id;
  end if;
  select * into reward from public.rewards where id=target_reward_id for update;
  if not reward.active then raise exception 'This reward is no longer available'; end if;
  if reward.stock=0 then raise exception 'This reward is out of stock'; end if;
  if cardinality(reward.eligible_member_ids)>0 and not target_member_id=any(reward.eligible_member_ids) then raise exception 'This member is not eligible for this reward'; end if;
  price:=private.market_price(reward);
  update public.household_members set wallet_balance=wallet_balance-price where id=target_member_id and wallet_balance>=price;
  if not found then raise exception 'Insufficient points'; end if;
  update public.rewards set stock=stock-1,version=version+1 where id=target_reward_id and stock is not null;
  insert into public.reward_inventory(household_id,member_id,reward_id,title_snapshot,cost_snapshot,emoji_snapshot,expires_at,purchased_by,operation_id)
    values(reward.household_id,target_member_id,reward.id,reward.title,price,reward.emoji,case when reward.expires_in_days is null then null else now()+make_interval(days=>reward.expires_in_days) end,auth.uid(),request_id) returning id into inventory_id_value;
  insert into public.point_ledger(household_id,member_id,kind,amount,inventory_id) values(reward.household_id,target_member_id,'reward_purchase',-price,inventory_id_value);
  return inventory_id_value;
end;
$$;
create or replace function public.purchase_reward_v2(target_reward_id uuid,target_member_id uuid,request_id uuid,expected_cost integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare reward public.rewards; existing public.reward_inventory;
begin
  select * into reward from public.rewards where id=target_reward_id;
  if not found or not private.can_act_for(reward.household_id,target_member_id) then raise exception 'You cannot purchase for this member'; end if;
  perform 1 from public.households where id=reward.household_id for update;
  if not private.can_act_for(reward.household_id,target_member_id) then raise exception 'You cannot purchase for this member'; end if;
  select * into existing from public.reward_inventory where purchased_by=auth.uid() and operation_id=request_id;
  if found then
    if existing.reward_id<>target_reward_id or existing.member_id<>target_member_id then raise exception 'Request ID belongs to another purchase'; end if;
    return existing.id;
  end if;
  select * into reward from public.rewards where id=target_reward_id;
  if expected_cost is distinct from private.market_price(reward) then raise exception 'The reward price changed. Refresh and confirm the new price.'; end if;
  return public.purchase_reward_once(target_reward_id,target_member_id,request_id);
end;
$$;

create function public.change_wallet_item(target_inventory uuid,request_id uuid,expected_version integer,action text,recipient uuid default null,note_value text default null)
returns void language plpgsql security definer set search_path='' as $$
declare item public.reward_inventory; reward public.rewards;
begin
  select * into item from public.reward_inventory where id=target_inventory;
  if not found or not public.is_household_member(item.household_id) then raise exception 'Reward not found'; end if;
  perform 1 from public.households where id=item.household_id for update;
  -- Replay before ownership validation: a successful gift changes its owner.
  if private.market_replay(item.household_id,request_id,jsonb_build_object('inventory',target_inventory,'version',expected_version,'action',action,'recipient',recipient,'note',note_value)) then return; end if;
  select * into item from public.reward_inventory where id=target_inventory for update;
  if not private.can_act_for(item.household_id,item.member_id) then raise exception 'You cannot change this member’s reward'; end if;
  if expected_version is distinct from item.version then raise exception 'This reward changed on another device. Refresh and try again.'; end if;
  if length(coalesce(note_value,''))>2000 then raise exception 'Note is too long'; end if;
  if item.refunded_at is not null then raise exception 'This reward was already refunded'; end if;
  if action='undo_use' then
    if item.status<>'redeemed' or item.redeemed_at<now()-interval '30 seconds' then raise exception 'The undo window has closed'; end if;
    update public.reward_inventory set status='available',redeemed_at=null,note=null,version=version+1 where id=item.id;
    return;
  end if;
  if item.status<>'available' or item.expires_at<=now() then raise exception 'This reward is used or expired'; end if;
  if action='use' then
    update public.reward_inventory set status='redeemed',redeemed_at=now(),note=nullif(trim(note_value),''),version=version+1 where id=item.id;
  elsif action='refund' then
    if item.gifted then raise exception 'Gifted rewards cannot be resold'; end if;
    update public.reward_inventory set refunded_at=now(),status='redeemed',version=version+1 where id=item.id;
    update public.household_members set wallet_balance=wallet_balance+item.cost_snapshot where id=item.member_id;
    update public.rewards set stock=least(stock+1,100000),version=version+1 where id=item.reward_id and stock is not null;
    insert into public.point_ledger(household_id,member_id,kind,amount,inventory_id) values(item.household_id,item.member_id,'reward_refund',item.cost_snapshot,item.id);
  elsif action='gift' then
    if recipient is null or recipient=item.member_id or not exists(select 1 from public.household_members where id=recipient and household_id=item.household_id and removed_at is null) then raise exception 'Choose another current household member'; end if;
    select * into reward from public.rewards where id=item.reward_id;
    if cardinality(reward.eligible_member_ids)>0 and not recipient=any(reward.eligible_member_ids) then raise exception 'The recipient is not eligible for this reward'; end if;
    update public.reward_inventory set member_id=recipient,gifted=true,version=version+1 where id=item.id;
  else raise exception 'Unknown wallet action'; end if;
end;
$$;
-- Legacy redemption must not bypass expiry/refund checks.
create or replace function public.redeem_reward(target_inventory_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare item public.reward_inventory;
begin
  select * into item from public.reward_inventory where id=target_inventory_id;
  if not found or not private.can_act_for(item.household_id,item.member_id) then raise exception 'You cannot redeem this reward'; end if;
  perform 1 from public.households where id=item.household_id for update;
  select * into item from public.reward_inventory where id=target_inventory_id;
  if item.refunded_at is not null then raise exception 'This reward was refunded'; end if;
  if item.status='redeemed' then return; end if;
  perform public.change_wallet_item(item.id,gen_random_uuid(),item.version,'use');
end;
$$;

revoke all on function public.save_market_reward(uuid,uuid,uuid,integer,jsonb),public.change_market_reward(uuid,uuid,integer,text,integer),public.save_market_sale(uuid,uuid,jsonb,integer,timestamptz),public.cancel_market_sale(uuid),public.change_wallet_item(uuid,uuid,integer,text,uuid,text) from public,anon;
grant execute on function public.save_market_reward(uuid,uuid,uuid,integer,jsonb),public.change_market_reward(uuid,uuid,integer,text,integer),public.save_market_sale(uuid,uuid,jsonb,integer,timestamptz),public.cancel_market_sale(uuid),public.change_wallet_item(uuid,uuid,integer,text,uuid,text) to authenticated;

-- Compose the existing RLS-protected snapshot in one transaction-consistent call.
alter function public.get_household_snapshot(uuid,integer) rename to get_household_core_snapshot;
create function public.get_household_snapshot(target_household_id uuid,history_limit integer default 100)
returns jsonb language sql stable security invoker set search_path='' as $$
  select public.get_household_core_snapshot(target_household_id,history_limit)||jsonb_build_object(
    'sales',coalesce((select jsonb_agg(to_jsonb(s)) from public.market_sales s where household_id=target_household_id and cancelled_at is null and expires_at>now()),'[]'::jsonb),
    'walletDaily',coalesce((select jsonb_agg(to_jsonb(d)) from (
      select member_id,(created_at at time zone 'UTC')::date as day,sum(amount) as delta,
        coalesce(sum(amount) filter(where kind='chore_award'),0) as earned,coalesce(-sum(amount) filter(where amount<0),0) as spent
      from public.point_ledger where household_id=target_household_id and created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'-interval '30 days'
      group by member_id,(created_at at time zone 'UTC')::date
    ) d),'[]'::jsonb),
    'walletEarned',coalesce((select jsonb_agg(to_jsonb(e)) from (select member_id,sum(amount) as earned from public.point_ledger where household_id=target_household_id and kind='chore_award' group by member_id) e),'[]'::jsonb),
    'purchaseCounts',coalesce((select jsonb_agg(to_jsonb(c)) from (select reward_id,count(*) as count from public.reward_inventory where household_id=target_household_id and purchased_at>now()-interval '30 days' and refunded_at is null group by reward_id) c),'[]'::jsonb)
  );
$$;
revoke all on function public.get_household_snapshot(uuid,integer) from public,anon;
grant execute on function public.get_household_snapshot(uuid,integer) to authenticated;
