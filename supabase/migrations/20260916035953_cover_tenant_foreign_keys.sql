-- Cover the complete tenant FK, not only its first column. Tiny existing tables
-- permit transactional index creation; use concurrent builds for a large fleet.
create index completions_chore_tenant_idx on public.chore_completions(chore_id,household_id);
create index completions_member_tenant_idx on public.chore_completions(completed_by_member_id,household_id);
create index chores_assignee_tenant_idx on public.chores(assigned_member_id,household_id);
create index device_tokens_user_idx on public.device_tokens(user_id);
create index meal_plans_cook_tenant_idx on public.meal_plans(cook_id,household_id);
create index meal_plans_recipe_tenant_idx on public.meal_plans(recipe_id,household_id);
create index ledger_member_tenant_idx on public.point_ledger(member_id,household_id);
create index inventory_member_tenant_idx on public.reward_inventory(member_id,household_id);
create index inventory_reward_tenant_idx on public.reward_inventory(reward_id,household_id);
create index rewards_household_idx on public.rewards(household_id);
-- Replaced indexes were introduced by this release, not inferred unused data.
drop index public.completions_member_idx;
drop index public.chores_assignee_idx;
drop index public.meal_plans_cook_idx;
drop index public.meal_plans_recipe_idx;
drop index public.ledger_member_idx;
drop index public.inventory_member_idx;
drop index public.inventory_reward_idx;
