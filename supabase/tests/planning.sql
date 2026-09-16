set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
select household_id from public.household_members where auth_user_id=auth.uid() \gset
select public.save_shopping_item(:'household_id','20000000-0000-4000-8000-000000000001','Rice',0.5,'kg','Pantry',false,false,0);
select public.save_shopping_item(:'household_id','20000000-0000-4000-8000-000000000001','Rice',0.5,'kg','Pantry',false,false,0);
select test.assert_true((select count(*)=1 from public.shopping_items),'shopping add retry is idempotent');
select test.assert_true((select quantity=0.5 from public.shopping_items limit 1),'fractional quantities survive persistence');
select public.save_shopping_item(:'household_id','20000000-0000-4000-8000-000000000001','Brown rice',0.5,'kg','Pantry',false,false,1);
select test.expect_error(format('select public.save_shopping_item(%L,%L,%L,1,%L,%L,false,false,1)',:'household_id','20000000-0000-4000-8000-000000000001','Stale overwrite','kg','Pantry'),'stale grocery edits are rejected');
select public.save_recipe(:'household_id','30000000-0000-4000-8000-000000000001','Pasta',array['500 g pasta','2 tomatoes'],'Boil and serve.',0);
select public.save_meal_plan(:'household_id',current_date,'30000000-0000-4000-8000-000000000001','Pasta',null,0);
select test.assert_true(public.add_meal_ingredients(:'household_id',current_date)=2,'meal ingredients become shared shopping items');
select test.assert_true(public.add_meal_ingredients(:'household_id',current_date)=0,'ingredient generation does not duplicate on retry');
select public.save_recipe(:'household_id','30000000-0000-4000-8000-000000000001','Pasta',array['Different ingredient'],'Boil and serve.',1);
select test.assert_true((select ingredients_snapshot=array['500 g pasta','2 tomatoes'] from public.meal_plans where meal_date=current_date),'planned ingredients do not change when a recipe is edited');
select test.assert_true(public.copy_meal_week(:'household_id',current_date,current_date+7)=1,'weekly reuse creates a future plan');
select test.assert_true(public.copy_meal_week(:'household_id',current_date,current_date+7)=0,'weekly reuse preserves existing plans');
select test.assert_true(jsonb_array_length(public.get_household_snapshot(:'household_id')->'shopping')=3,'atomic snapshot includes the shared shopping list');
select test.assert_true(not ((public.get_household_snapshot(:'household_id')->'members'->0) ? 'pin_hash'),'atomic snapshot excludes PIN hashes');
select test.assert_true((public.export_household_data() ? 'recipes') and not ((public.export_household_data()->'members'->0) ? 'pin_hash'),'full export includes planning and excludes secrets');
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000003';
select test.assert_true((select count(*)=0 from public.shopping_items),'shopping reads are tenant-scoped');
select test.assert_true((select count(*)=0 from public.recipes),'recipe reads are tenant-scoped');
select test.expect_error(format('select public.add_meal_ingredients(%L,current_date)',:'household_id'),'ingredient command requires household membership');
reset role;

-- Active work and unspent purchases must not disappear behind a history limit.
begin;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
select id as active_owner from public.household_members where auth_user_id=auth.uid() \gset
select id as reward_id from public.rewards where household_id=:'household_id' limit 1 \gset
select public.create_chore_v2(:'household_id','40000000-0000-4000-8000-000000000001','Versioned chore',5,:'active_owner',current_date,'Notes',false) as versioned_chore \gset
select test.assert_true(public.create_chore_v2(:'household_id','40000000-0000-4000-8000-000000000001','Versioned chore',5,:'active_owner',current_date,'Notes',false)=:'versioned_chore'::uuid,'chore creation retries are idempotent');
select public.submit_chore_completion(:'versioned_chore',:'active_owner',current_date) as pending_completion \gset
select public.create_chore(:'household_id','Newer completed chore',30,:'active_owner',null,null,false) as later_chore \gset
select public.submit_chore_completion(:'later_chore',:'active_owner',current_date) as later_completion \gset
select public.approve_chore_completion(:'later_completion');
select test.assert_true(exists(select 1 from jsonb_array_elements(public.get_household_snapshot(:'household_id',1)->'completions') c where c->>'id'=:'pending_completion'),'pending approvals survive a small history limit');
select public.purchase_reward_v2(:'reward_id',:'active_owner','50000000-0000-4000-8000-000000000001',20) as active_purchase \gset
select test.assert_true(exists(select 1 from jsonb_array_elements(public.get_household_snapshot(:'household_id',1)->'inventory') i where i->>'id'=:'active_purchase'),'available rewards survive a small history limit');
select public.close_household();
select test.assert_true((select count(*)=0 from public.households),'household closure cascades through planning and ledger data');
rollback;
