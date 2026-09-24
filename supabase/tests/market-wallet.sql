-- Isolated transaction: no generated test rewards escape into other fixtures.
begin;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
select household_id,id as owner_id from public.household_members where auth_user_id=auth.uid() \gset
select public.add_household_member(:'household_id','Same name','child') as recipient_id \gset
select public.create_chore(:'household_id','Market test work',1000,:'owner_id',null,null,false) as chore_id \gset
select public.submit_chore_completion(:'chore_id',:'owner_id',current_date) as completion_id \gset
select public.approve_chore_completion(:'completion_id');
select wallet_balance as starting_balance from public.household_members where id=:'owner_id' \gset
select jsonb_build_object('name','Ice cream','emoji','🍦','pts',100,'category','Food','desc','Any flavor','stock',1,'expiresInDays',7,'eligibleMembers',jsonb_build_array(:'owner_id',:'recipient_id'),'curators',jsonb_build_array(:'owner_id'))::text as draft \gset
select public.save_market_reward(:'household_id','60000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000001',0,:'draft') as reward_id \gset
select public.save_market_reward(:'household_id',:'reward_id','61000000-0000-4000-8000-000000000001',0,:'draft');
select test.assert_true((select count(*)=1 from public.rewards where id=:'reward_id'),'rich reward creation is retry-safe');
select test.assert_true((select emoji='🍦' and stock=1 and expires_in_days=7 and cardinality(eligible_member_ids)=2 and jsonb_array_length(price_history)=1 from public.rewards where id=:'reward_id'),'authored reward terms are retained');
select test.expect_error(format('select public.save_market_reward(%L,%L,%L,0,%L)',:'household_id',:'reward_id','61000000-0000-4000-8000-000000000002',:'draft'),'stale reward editor cannot overwrite newer terms');
select test.expect_error(format('select public.save_market_reward(%L,%L,%L,1,%L)',:'household_id',:'reward_id','61000000-0000-4000-8000-000000000001',:'draft'),'same request ID cannot change its intent');
select public.save_market_sale(:'household_id','62000000-0000-4000-8000-000000000001','{"type":"categories","categories":["Food"]}',20,now()+interval '1 hour');
select public.save_market_sale(:'household_id','62000000-0000-4000-8000-000000000002','{"type":"all"}',30,now()+interval '1 hour');
select test.expect_error(format('select public.purchase_reward_v2(%L,%L,%L,80)',:'reward_id',:'owner_id','63000000-0000-4000-8000-000000000001'),'best active discount must match confirmed price');
select public.purchase_reward_v2(:'reward_id',:'owner_id','63000000-0000-4000-8000-000000000001',70) as inventory_id \gset
select public.purchase_reward_v2(:'reward_id',:'owner_id','63000000-0000-4000-8000-000000000001',70);
select test.assert_true((select wallet_balance=:'starting_balance'::integer-70 from public.household_members where id=:'owner_id'),'discounted purchase debits once');
select test.assert_true((select stock=0 from public.rewards where id=:'reward_id'),'purchase consumes the last stock unit once');
select test.assert_true((select cost_snapshot=70 and emoji_snapshot='🍦' and expires_at=now()+interval '7 days' from public.reward_inventory where id=:'inventory_id'),'purchase snapshots price, emoji and exact expiry');
select test.expect_error(format('select public.purchase_reward_once(%L,%L,%L)',:'reward_id',:'owner_id','63000000-0000-4000-8000-000000000002'),'legacy purchase cannot bypass sold-out stock');
select public.change_wallet_item(:'inventory_id','64000000-0000-4000-8000-000000000001',1,'refund');
select public.change_wallet_item(:'inventory_id','64000000-0000-4000-8000-000000000001',1,'refund');
select test.assert_true((select wallet_balance=:'starting_balance'::integer from public.household_members where id=:'owner_id'),'refund restores only the price actually paid, exactly once');
select test.assert_true((select stock=1 from public.rewards where id=:'reward_id'),'refund restores one stock unit');
select test.assert_true((select count(*)=2 and sum(amount)=0 from public.point_ledger where inventory_id=:'inventory_id'),'purchase and refund remain separate balanced audit entries');
select test.expect_error(format('select public.redeem_reward(%L)',:'inventory_id'),'legacy redemption cannot reuse a refunded item');
select public.purchase_reward_v2(:'reward_id',:'owner_id','63000000-0000-4000-8000-000000000002',70) as gift_id \gset
select public.change_wallet_item(:'gift_id','64000000-0000-4000-8000-000000000002',1,'gift',:'recipient_id');
select public.change_wallet_item(:'gift_id','64000000-0000-4000-8000-000000000002',1,'gift',:'recipient_id');
select test.assert_true((select member_id=:'recipient_id' and gifted and version=2 from public.reward_inventory where id=:'gift_id'),'gift retries remain safe after ownership changes');
select test.expect_error(format('select public.change_wallet_item(%L,%L,2,%L)',:'gift_id','64000000-0000-4000-8000-000000000003','refund'),'gift cannot mint refund points for its recipient');
select public.change_wallet_item(:'gift_id','64000000-0000-4000-8000-000000000003',2,'use',null,'Family outing');
select test.assert_true((select status='redeemed' and note='Family outing' from public.reward_inventory where id=:'gift_id'),'use and optional memory are saved together');
select public.change_wallet_item(:'gift_id','64000000-0000-4000-8000-000000000004',3,'undo_use');
select test.assert_true((select status='available' and redeemed_at is null and version=4 from public.reward_inventory where id=:'gift_id'),'use can be undone within the bounded server window');
select test.expect_error(format('select public.change_wallet_item(%L,%L,2,%L)',:'gift_id','64000000-0000-4000-8000-000000000005','use'),'stale wallet action cannot overwrite a newer change');
select version as reward_version from public.rewards where id=:'reward_id' \gset
select public.change_market_reward(:'reward_id','65000000-0000-4000-8000-000000000001',:'reward_version','restock',2);
select public.change_market_reward(:'reward_id','65000000-0000-4000-8000-000000000001',:'reward_version','restock',2);
select test.assert_true((select stock=2 from public.rewards where id=:'reward_id'),'restock retries do not multiply quantity');
select test.assert_true(jsonb_array_length(public.get_household_snapshot(:'household_id',1)->'sales')=2,'shared snapshot includes active sales');
select test.assert_true(exists(select 1 from jsonb_array_elements(public.get_household_snapshot(:'household_id',1)->'walletDaily') d where d->>'member_id'=:'owner_id' and (d->>'earned')::integer>=1000),'chart aggregates are not truncated by activity history limit');
select public.cancel_market_sale('62000000-0000-4000-8000-000000000002');
select test.expect_error(format('select public.purchase_reward_v2(%L,%L,%L,70)',:'reward_id',:'owner_id','63000000-0000-4000-8000-000000000003'),'cancelled discounts require a fresh price confirmation');
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';
select test.expect_error(format('select public.save_market_sale(%L,%L,%L,99,now()+interval ''1 hour'')',:'household_id','62000000-0000-4000-8000-000000000003','{"type":"all"}'),'teen cannot grant household-wide discounts');
select test.expect_error(format('select public.change_wallet_item(%L,%L,4,%L)',:'gift_id','64000000-0000-4000-8000-000000000006','use'),'teen cannot use a sibling reward');
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000003';
select test.assert_true((select count(*)=0 from public.market_sales),'sales are tenant-isolated');
select test.expect_error(format('select public.save_market_reward(%L,%L,%L,0,%L)',:'household_id',:'reward_id','61000000-0000-4000-8000-000000000003',:'draft'),'foreign household cannot alter reward metadata');
reset role;
update public.reward_inventory set expires_at=now()-interval '1 second' where id=:'gift_id';
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
select test.expect_error(format('select public.redeem_reward(%L)',:'gift_id'),'expiry is enforced by the server');
select test.expect_error(format('select public.change_wallet_item(%L,%L,4,%L,%L)',:'gift_id','64000000-0000-4000-8000-000000000007','gift',:'owner_id'),'expired rewards cannot be laundered through gifting');
select test.expect_error('select * from private.market_commands','operation receipts are not client-readable');
select test.expect_error('update public.market_sales set discount_pct=100','direct discount writes are denied');
select wallet_balance as fund_balance from public.household_members where id=:'owner_id' \gset
select public.create_wallet_fund(:'household_id','66000000-0000-4000-8000-000000000001','Family movie','🎬',200,null,current_date+30);
select public.create_wallet_fund(:'household_id','66000000-0000-4000-8000-000000000001','Family movie','🎬',200,null,current_date+30);
select test.assert_true((select count(*)=1 from public.wallet_funds),'goal creation is retry-safe');
select public.contribute_wallet_fund('66000000-0000-4000-8000-000000000001',:'owner_id','67000000-0000-4000-8000-000000000001',100);
select public.contribute_wallet_fund('66000000-0000-4000-8000-000000000001',:'owner_id','67000000-0000-4000-8000-000000000001',100);
select test.assert_true((select wallet_balance=:'fund_balance'::integer-100 from public.household_members where id=:'owner_id'),'contribution removes spendable points exactly once');
select test.assert_true((select funded=100 from public.wallet_funds limit 1),'goal tracks real deposits');
select test.expect_error(format('select public.contribute_wallet_fund(%L,%L,%L,101)','66000000-0000-4000-8000-000000000001',:'owner_id','67000000-0000-4000-8000-000000000002'),'contribution cannot overfund the target');
select test.expect_error('select public.close_wallet_fund(''66000000-0000-4000-8000-000000000001'',''68000000-0000-4000-8000-000000000001'',2,''complete'')','unfunded goals cannot be completed');
select public.close_wallet_fund('66000000-0000-4000-8000-000000000001','68000000-0000-4000-8000-000000000001',2,'cancel');
select public.close_wallet_fund('66000000-0000-4000-8000-000000000001','68000000-0000-4000-8000-000000000001',2,'cancel');
select test.assert_true((select wallet_balance=:'fund_balance'::integer from public.household_members where id=:'owner_id'),'cancellation refunds deposits exactly once');
select test.assert_true((select sum(amount)=0 and count(*)=2 from public.point_ledger where fund_id='66000000-0000-4000-8000-000000000001'),'cancelled fund retains balanced ledger history');
select test.expect_error(format('select public.contribute_wallet_fund(%L,%L,%L,10)','66000000-0000-4000-8000-000000000001',:'owner_id','67000000-0000-4000-8000-000000000002'),'closed goals reject new deposits');
select public.create_wallet_fund(:'household_id','66000000-0000-4000-8000-000000000002','Own goal','🎯',10,:'owner_id',null);
select test.expect_error(format('select public.contribute_wallet_fund(%L,%L,%L,10)','66000000-0000-4000-8000-000000000002',:'recipient_id','67000000-0000-4000-8000-000000000002'),'personal goal cannot debit another member');
select public.contribute_wallet_fund('66000000-0000-4000-8000-000000000002',:'owner_id','67000000-0000-4000-8000-000000000002',10);
select public.close_wallet_fund('66000000-0000-4000-8000-000000000002','68000000-0000-4000-8000-000000000002',2,'complete');
select test.assert_true((select wallet_balance=:'fund_balance'::integer-10 from public.household_members where id=:'owner_id'),'completion consumes deposits without a second debit');
select test.expect_error('select public.close_wallet_fund(''66000000-0000-4000-8000-000000000002'',''68000000-0000-4000-8000-000000000003'',3,''cancel'')','completed goal cannot be refunded afterwards');
select test.assert_true(public.export_household_data() ? 'wallet_funds' and public.export_household_data() ? 'market_sales','free data export includes goals and sales');
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000003';
select test.assert_true((select count(*)=0 from public.wallet_funds),'goals are tenant-isolated');
select test.assert_true((select count(*)=0 from public.wallet_fund_contributions),'contributions are tenant-isolated');
select test.expect_error(format('select public.contribute_wallet_fund(%L,%L,%L,1)','66000000-0000-4000-8000-000000000002',:'owner_id','67000000-0000-4000-8000-000000000003'),'foreign household cannot spend points into a fund');
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
select public.close_household();
select test.assert_true((select count(*)=0 from public.wallet_funds),'household closure also removes funds and contribution data');
rollback;
