begin;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
select household_id, id as member_id from public.household_members where auth_user_id=auth.uid() \gset
select public.create_chore_routine(:'household_id','60000000-0000-4000-8000-000000000001','Morning tidy',5,'Put things away',false,'America/Chicago',(now() at time zone 'America/Chicago')::date,null,'daily',1,array[:'member_id'::uuid]) as routine_id \gset
select test.assert_true((select count(*)=14 from public.chores where routine_id=:'routine_id'),'free daily routines create independent 14-day occurrences');
select test.assert_true((select bool_and(due_at=((due_date+1)::timestamp at time zone 'America/Chicago')) from public.chores where routine_id=:'routine_id'),'routine due instants follow local date boundaries');
select test.assert_true(public.materialize_household_routines(:'household_id')=0,'materialization retries do not duplicate occurrences');
select test.assert_true(public.create_chore_routine(:'household_id',:'routine_id','Morning tidy',5,'Put things away',false,'America/Chicago',(now() at time zone 'America/Chicago')::date,null,'daily',1,array[:'member_id'::uuid])=:'routine_id'::uuid,'routine creation is idempotent');
select id as occurrence_id from public.chores where routine_id=:'routine_id' order by due_date limit 1 \gset
select public.archive_chore(:'occurrence_id');
select public.materialize_household_routines(:'household_id');
select test.assert_true((select archived_at is not null from public.chores where id=:'occurrence_id'),'skipped occurrences never resurrect');
select public.set_chore_routine_active(:'routine_id',false,1);
select public.set_chore_routine_active(:'routine_id',false,1);
select test.assert_true((select version=2 and not active from public.chore_routines where id=:'routine_id'),'pause is idempotent and versioned');
select test.assert_true((select count(*)=14 from public.chores where routine_id=:'routine_id'),'pause preserves all existing occurrence history');
select test.expect_error(format('select public.set_chore_routine_active(%L,true,1)',:'routine_id'),'stale resume is rejected');
select public.set_chore_routine_active(:'routine_id',true,2);
select test.assert_true((select count(*)=14 from public.chores where routine_id=:'routine_id'),'resume retains skipped occurrence identity');
select test.expect_error(format('select public.create_chore_routine(%L,gen_random_uuid(),%L,5,%L,false,%L,current_date,null,%L,2,array[]::uuid[])',:'household_id','Paid interval','','UTC','weekly'),'advanced intervals require server-verified Plus');
select test.expect_error(format('select public.create_chore_routine(%L,gen_random_uuid(),%L,5,%L,false,%L,current_date,null,%L,1,array[]::uuid[])',:'household_id','Bad zone','','Fake/Zone','daily'),'invalid timezone is rejected');
select test.assert_true(public.export_household_data() ? 'routines','routine data is included in free export');
select test.expect_error(format('select private.materialize_routines(%L)',:'household_id'),'private materializer is not callable by clients');
select test.expect_error(format('update public.chore_routines set active=false where id=%L',:'routine_id'),'direct routine writes denied');
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000003';
select test.assert_true((select count(*)=0 from public.chore_routines),'routine reads are tenant-isolated');
select test.expect_error(format('select public.materialize_household_routines(%L)',:'household_id'),'foreign materialization is denied');
select test.expect_error(format('select public.set_chore_routine_active(%L,false,3)',:'routine_id'),'foreign mutation is denied');
reset role;
-- Civil dates survive both DST boundaries; the instant of next midnight changes.
select test.assert_true(extract(epoch from ('2026-03-09'::timestamp at time zone 'America/Chicago')-('2026-03-08'::timestamp at time zone 'America/Chicago'))=23*3600,'spring-forward date boundary is 23 hours');
select test.assert_true(extract(epoch from ('2026-11-02'::timestamp at time zone 'America/Chicago')-('2026-11-01'::timestamp at time zone 'America/Chicago'))=25*3600,'fall-back date boundary is 25 hours');
rollback;
