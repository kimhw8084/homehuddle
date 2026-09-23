-- Sponsor identity is only needed by service reconciliation. Clients receive
-- hasSponsor/isSponsor booleans through the membership-checked status RPC.
revoke select on public.household_billing_accounts from authenticated;
drop policy "adults read billing sponsor" on public.household_billing_accounts;
-- Refresh subscription state across signed-in household devices via existing RLS.
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='household_entitlements') then
    alter publication supabase_realtime add table public.household_entitlements;
  end if;
end $$;
