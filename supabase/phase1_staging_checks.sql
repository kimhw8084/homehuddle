-- Run after `supabase db push` against staging. This checks the Phase 1 schema
-- contract without creating or modifying household data.
do $$
declare missing_function text;
begin
  select required.name into missing_function
  from (values
    ('create_household_invite'), ('accept_household_invite'),
    ('add_household_member'), ('update_child_profile'),
    ('change_household_member_role'), ('transfer_household_ownership'),
    ('close_household'), ('export_my_data'), ('export_household_data'),
    ('delete_my_account')
  ) as required(name)
  where not exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = required.name)
  limit 1;
  if missing_function is not null then raise exception 'Missing Phase 1 function: %', missing_function; end if;

  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('household_invites', 'notification_preferences', 'notification_events') and not c.relrowsecurity
  ) then raise exception 'Phase 1 account tables must have RLS enabled'; end if;

  if not exists (select 1 from pg_type where typname = 'household_role' and 'teen' = any(enum_range(null::public.household_role)::text[])) then
    raise exception 'household_role is missing teen';
  end if;

  if not has_function_privilege('authenticated', 'public.accept_household_invite(uuid, text, text, boolean)', 'execute')
    or not has_function_privilege('authenticated', 'public.add_household_member(uuid, text, public.household_role, text)', 'execute') then
    raise exception 'Authenticated callers lack required account RPC grants';
  end if;
end $$;

select 'Phase 1 staging schema checks passed' as result;
