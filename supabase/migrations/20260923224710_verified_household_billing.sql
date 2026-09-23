-- One explicitly chosen adult sponsor per household. No client may grant Plus.
-- CLI-created migration; timestamp aligned to the hosted migration tool receipt.
create table public.household_billing_accounts (
  household_id uuid primary key references public.households(id) on delete cascade,
  payer_user_id uuid not null unique references auth.users(id) on delete cascade,
  last_reconcile_requested_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.household_billing_accounts enable row level security;
revoke all on public.household_billing_accounts from public,anon,authenticated;
grant select on public.household_billing_accounts to authenticated,service_role;
create policy "adults read billing sponsor" on public.household_billing_accounts for select to authenticated using(public.is_parent(household_id));
alter table public.household_entitlements add column provider_checked_at_ms bigint not null default 0;
alter table public.household_entitlements add column product_id text;

create function public.claim_household_billing(target_household uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare payer uuid;
begin
  if not public.is_parent(target_household) then raise exception 'An adult household account is required'; end if;
  perform 1 from public.households where id=target_household for update;
  select payer_user_id into payer from public.household_billing_accounts where household_id=target_household;
  if payer=auth.uid() then return; end if;
  if payer is not null then raise exception 'Another adult sponsors this household. Use their account to manage or restore the subscription.'; end if;
  if exists(select 1 from public.household_billing_accounts where payer_user_id=auth.uid()) then raise exception 'This account already sponsors another household'; end if;
  insert into public.household_billing_accounts(household_id,payer_user_id) values(target_household,auth.uid());
end;
$$;

create function public.get_household_billing_status(target_household uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_household_member(target_household) then raise exception 'Household membership required'; end if;
  return jsonb_build_object('active',public.is_household_pro(target_household),
    'expiresAt',(select expires_at from public.household_entitlements where household_id=target_household),
    'isSponsor',exists(select 1 from public.household_billing_accounts where household_id=target_household and payer_user_id=auth.uid()),
    'hasSponsor',exists(select 1 from public.household_billing_accounts where household_id=target_household));
end;
$$;

create function public.apply_verified_subscription(payer_id uuid, active_value boolean, expiry_value timestamptz, checked_at_ms bigint, product_value text)
returns void language plpgsql security definer set search_path = '' as $$
declare target uuid;
begin
  -- Only service_role has EXECUTE. Payloads come from a server-to-server fetch,
  -- never from SDK claims, user metadata, or webhook event assertions.
  if checked_at_ms is null or checked_at_ms <= 0 or checked_at_ms > extract(epoch from now())*1000+300000 then raise exception 'Invalid provider verification time'; end if;
  if active_value is null or (active_value and (expiry_value is null or expiry_value <= now() or product_value is null)) then raise exception 'A live subscription must have a product and future expiry'; end if;
  select household_id into target from public.household_billing_accounts where payer_user_id=payer_id;
  if target is null then return; end if;
  perform 1 from public.households where id=target for update;
  if not exists(select 1 from public.household_members where household_id=target and auth_user_id=payer_id and role in ('owner','parent') and removed_at is null) then active_value:=false; end if;
  insert into public.household_entitlements(household_id,entitlement,active,source,expires_at,provider_checked_at_ms,product_id)
    values(target,'homehuddle_pro',active_value,'revenuecat',expiry_value,checked_at_ms,product_value)
    on conflict(household_id) do update set active=excluded.active,source=excluded.source,expires_at=excluded.expires_at,
      provider_checked_at_ms=excluded.provider_checked_at_ms,product_id=excluded.product_id,updated_at=now()
    where public.household_entitlements.provider_checked_at_ms < excluded.provider_checked_at_ms;
end;
$$;

-- Removing/demoting a payer revokes household access immediately, but NEVER
-- claims to cancel an App Store/Play subscription. Store cancellation is separate.
create function private.revoke_departed_sponsor()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.removed_at is not null or new.role not in ('owner','parent')) and old.auth_user_id is not null then
    update public.household_entitlements set active=false,updated_at=now()
      where household_id=old.household_id and exists(select 1 from public.household_billing_accounts where household_id=old.household_id and payer_user_id=old.auth_user_id);
  end if;
  return new;
end;
$$;
create trigger revoke_departed_sponsor after update on public.household_members for each row execute function private.revoke_departed_sponsor();
create function private.revoke_deleted_sponsor()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.household_entitlements set active=false,updated_at=now() where household_id=old.household_id;
  return old;
end;
$$;
create trigger revoke_deleted_sponsor after delete on public.household_billing_accounts for each row execute function private.revoke_deleted_sponsor();
revoke all on function private.revoke_deleted_sponsor() from public,anon,authenticated;

create function public.reserve_billing_reconciliation(payer_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.household_billing_accounts set last_reconcile_requested_at=now() where payer_user_id=payer_id
    and (last_reconcile_requested_at is null or last_reconcile_requested_at < now()-interval '10 seconds');
  return found;
end;
$$;
revoke all on function public.reserve_billing_reconciliation(uuid) from public,anon,authenticated;
grant execute on function public.reserve_billing_reconciliation(uuid) to service_role;
revoke all on function private.revoke_departed_sponsor() from public,anon,authenticated;
revoke all on function public.apply_verified_subscription(uuid,boolean,timestamptz,bigint,text) from public,anon,authenticated;
grant execute on function public.apply_verified_subscription(uuid,boolean,timestamptz,bigint,text) to service_role;
revoke all on function public.claim_household_billing(uuid),public.get_household_billing_status(uuid) from public,anon;
grant execute on function public.claim_household_billing(uuid),public.get_household_billing_status(uuid) to authenticated;
