begin;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
select household_id from public.household_members where auth_user_id=auth.uid() \gset
select public.claim_household_billing(:'household_id');
select public.claim_household_billing(:'household_id');
select test.expect_error('select payer_user_id from public.household_billing_accounts','payer identity is not directly exposed to clients');
select test.assert_true((public.get_household_billing_status(:'household_id')->>'isSponsor')::boolean,'sponsor claim is explicit and idempotent');
select test.expect_error('select public.apply_verified_subscription(auth.uid(),true,now()+interval ''1 month'',1,''plus_monthly'')','clients cannot grant paid access');
select test.expect_error(format('update public.household_entitlements set active=true where household_id=%L',:'household_id'),'direct entitlement writes denied');
reset role;
set role service_role;
select public.apply_verified_subscription('00000000-0000-4000-8000-000000000001',true,now()+interval '1 month',1000,'plus_monthly');
reset role;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
select test.assert_true((public.get_household_billing_status(:'household_id')->>'active')::boolean,'server-verified subscription enables household access');
select id as owner_member from public.household_members where auth_user_id=auth.uid() \gset
select id as teen_member from public.household_members where auth_user_id='00000000-0000-4000-8000-000000000002' \gset
select public.create_chore_routine(:'household_id','70000000-0000-4000-8000-000000000001','Rotate cleanup',5,'',false,'UTC',(now() at time zone 'UTC')::date,null,'daily',2,array[:'owner_member'::uuid,:'teen_member'::uuid]) as rotation_id \gset
select test.assert_true((select count(*)=7 from public.chores where routine_id=:'rotation_id'),'verified Plus enables custom recurrence intervals');
select test.assert_true((select count(distinct assigned_member_id)=2 from public.chores where routine_id=:'rotation_id'),'rotation generates work for both selected members');
select test.assert_true((select assigned_member_id=:'owner_member'::uuid from public.chores where routine_id=:'rotation_id' order by due_date limit 1),'rotation begins with the first selected member');
reset role;
set role service_role;
select test.assert_true(public.reserve_billing_reconciliation('00000000-0000-4000-8000-000000000001'),'initial server reconciliation reservation succeeds');
select test.assert_true(not public.reserve_billing_reconciliation('00000000-0000-4000-8000-000000000001'),'repeated reconciliation is throttled');
select public.apply_verified_subscription('00000000-0000-4000-8000-000000000001',false,null,2000,null);
select public.apply_verified_subscription('00000000-0000-4000-8000-000000000001',true,now()+interval '1 month',1000,'plus_monthly');
reset role;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
select test.assert_true(not (public.get_household_billing_status(:'household_id')->>'active')::boolean,'older verification cannot resurrect revoked access');
select public.set_chore_routine_active(:'rotation_id',false,1);
select test.expect_error(format('select public.set_chore_routine_active(%L,true,2)',:'rotation_id'),'expired Plus cannot resume an advanced routine');
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000003';
select test.expect_error(format('select public.claim_household_billing(%L)',:'household_id'),'foreign account cannot sponsor a household');
select test.expect_error(format('select public.get_household_billing_status(%L)',:'household_id'),'billing status is tenant-scoped');
reset role;
rollback;
