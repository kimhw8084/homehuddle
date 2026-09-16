insert into auth.users(id,email) values
  ('00000000-0000-4000-8000-000000000001','owner@example.test'),
  ('00000000-0000-4000-8000-000000000002','teen@example.test'),
  ('00000000-0000-4000-8000-000000000003','other@example.test');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
select public.create_household('Test household','Same name') as household_id \gset
select id as owner_id from public.household_members where auth_user_id = auth.uid() \gset
select test.assert_true(public.create_household('Retried','Same name') = :'household_id'::uuid,'household creation is retry-safe');
select public.add_household_member(:'household_id','Same name','child') as child_id \gset
select test.assert_true((select count(*) = 2 from public.household_members),'RLS helpers permit authorized member reads');
select test.expect_error('select pin_hash from public.household_members','PIN hashes are not exposed to clients');
select public.create_household_invite(:'household_id','teen@example.test','teen',7) as invite_id \gset
select token as invite_token from public.household_invites where id = :'invite_id' \gset
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
select public.accept_household_invite(:'invite_token','Same name',null,true) as teen_id \gset
select test.assert_true((select count(*) = 0 from public.household_invites),'teen cannot read invitation tokens');
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000003';
select public.create_household('Other household','Other owner') as other_household_id \gset
select test.assert_true((select count(*) = 1 from public.household_members),'household reads stay tenant-scoped');
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
select public.create_chore(:'household_id','Zero point chore',0,:'child_id',null,null,false) as zero_chore \gset
select public.submit_chore_completion(:'zero_chore',:'child_id',current_date) as zero_completion \gset
select test.assert_true(public.submit_chore_completion(:'zero_chore',:'child_id',current_date) = :'zero_completion'::uuid,'submission retry returns the same completion');
select public.approve_chore_completion(:'zero_completion');
select public.approve_chore_completion(:'zero_completion');
select test.assert_true((select count(*) = 0 from public.point_ledger),'zero-point approval creates no invalid ledger entry');
select public.create_chore(:'household_id','Retry after feedback',40,:'child_id',null,null,false) as chore_id \gset
select public.submit_chore_completion(:'chore_id',:'child_id',current_date) as completion_id \gset
select public.reject_chore_completion(:'completion_id','Please try again');
select test.assert_true(public.submit_chore_completion(:'chore_id',:'child_id',current_date) = :'completion_id'::uuid,'rejected completion can be resubmitted');
select public.approve_chore_completion(:'completion_id');
select public.approve_chore_completion(:'completion_id');
select test.assert_true((select wallet_balance = 40 from public.household_members where id = :'child_id'),'approval awards exactly once');
select test.assert_true((select count(*) = 1 from public.point_ledger),'duplicate approval does not duplicate ledger');
select public.create_reward(:'household_id','Movie night',10) as reward_id \gset
select public.purchase_reward_once(:'reward_id',:'child_id','10000000-0000-4000-8000-000000000001') as inventory_id \gset
select test.assert_true(public.purchase_reward_once(:'reward_id',:'child_id','10000000-0000-4000-8000-000000000001') = :'inventory_id'::uuid,'purchase retry does not charge twice');
select public.update_reward(:'reward_id','Renamed reward',20,null,true);
select test.expect_error(format('select public.purchase_reward_v2(%L,%L,%L,10)',:'reward_id',:'child_id','10000000-0000-4000-8000-000000000002'),'a changed reward price requires new confirmation');
select test.assert_true((select title_snapshot = 'Movie night' and cost_snapshot = 10 from public.reward_inventory where id = :'inventory_id'),'purchased reward terms remain immutable');
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
select test.expect_error(format('select public.purchase_reward(%L,%L)',:'reward_id',:'child_id'),'teen cannot spend a sibling balance');
select test.expect_error(format('select public.redeem_reward(%L)',:'inventory_id'),'teen cannot redeem a sibling reward');
select test.expect_error(format('select public.submit_chore_completion(%L,%L,current_date)',:'zero_chore',:'child_id'),'teen cannot submit as another member');
select test.expect_error(format('select public.create_chore(%L,%L,10)',:'household_id','Not authorized'),'teen cannot create chores');
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
select test.expect_error(format('select public.transfer_household_ownership(%L)',:'teen_id'),'ownership cannot transfer to a teen');
select public.redeem_reward(:'inventory_id');
select public.redeem_reward(:'inventory_id');
select test.assert_true((select status = 'redeemed' from public.reward_inventory where id = :'inventory_id'),'redemption is retry-safe');
select public.remove_household_member(:'child_id');
select test.assert_true((select removed_at is not null and display_name = 'Former member' from public.household_members where id = :'child_id'),'removing a member with ledger history succeeds and anonymizes the profile');
select test.assert_true((select count(*) = 2 from public.point_ledger),'removal preserves ledger history');
reset role;
select test.assert_true(not has_table_privilege('anon','public.chores','select'),'anonymous household reads denied');
select test.assert_true(not has_function_privilege('anon','public.purchase_reward_once(uuid,uuid,uuid)','execute'),'anonymous money-like mutations denied');
select test.assert_true(not has_function_privilege('authenticated','public.current_member(uuid)','execute'),'internal composite helper not a public RPC');
select test.assert_true(not exists(select 1 from pg_tables where schemaname='public' and not rowsecurity),'all public tables have RLS');
