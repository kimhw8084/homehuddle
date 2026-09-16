create table public.recipes (
  id uuid primary key,
  household_id uuid not null references public.households on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  ingredients text[] not null default '{}' check (cardinality(ingredients) <= 100),
  instructions text not null default '' check (length(instructions) <= 10000),
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, household_id)
);
create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  meal_date date not null,
  recipe_id uuid,
  ingredients_snapshot text[] not null default '{}',
  title text not null check (length(trim(title)) between 1 and 120),
  cook_id uuid,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  unique(household_id, meal_date),
  foreign key(recipe_id,household_id) references public.recipes(id,household_id),
  foreign key(cook_id,household_id) references public.household_members(id,household_id)
);
create table public.shopping_items (
  id uuid primary key,
  household_id uuid not null references public.households on delete cascade,
  name text not null check (length(trim(name)) between 1 and 160),
  quantity numeric(10,3) not null default 1 check (quantity > 0 and quantity <= 10000),
  unit text not null default '' check (length(unit) <= 30),
  category text not null default 'Other' check (length(category) <= 60),
  completed boolean not null default false,
  archived boolean not null default false,
  version integer not null default 1,
  source_plan_id uuid references public.meal_plans on delete set null,
  source_ingredient_index integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recipes_household_idx on public.recipes(household_id,updated_at);
create index meal_plans_recipe_idx on public.meal_plans(recipe_id);
create index meal_plans_cook_idx on public.meal_plans(cook_id);
create index shopping_household_active_idx on public.shopping_items(household_id,completed,created_at) where not archived;
create unique index shopping_source_ingredient_idx on public.shopping_items(source_plan_id,source_ingredient_index) where source_plan_id is not null;
alter table public.recipes enable row level security;
alter table public.meal_plans enable row level security;
alter table public.shopping_items enable row level security;
revoke all on public.recipes,public.meal_plans,public.shopping_items from anon,authenticated;
grant select on public.recipes,public.meal_plans,public.shopping_items to authenticated;
create policy "members read recipes" on public.recipes for select to authenticated using(public.is_household_member(household_id));
create policy "members read meal plans" on public.meal_plans for select to authenticated using(public.is_household_member(household_id));
create policy "members read shopping" on public.shopping_items for select to authenticated using(public.is_household_member(household_id));

create function public.save_shopping_item(target_household uuid,item_id uuid,item_name text,quantity_value numeric,unit_value text,category_value text,completed_value boolean,archived_value boolean,expected_version integer)
returns public.shopping_items language plpgsql security definer set search_path = '' as $$
declare item public.shopping_items;
begin
  if not public.is_household_member(target_household) then raise exception 'Household access required'; end if;
  if expected_version is null or expected_version < 0 then raise exception 'An expected version is required'; end if;
  perform 1 from public.households where id = target_household for update;
  select * into item from public.shopping_items where id = item_id for update;
  if found then
    if item.household_id <> target_household then raise exception 'Item not found'; end if;
    -- Retries of a request that already committed are harmless.
    if item.name = trim(item_name) and item.quantity = quantity_value and item.unit = unit_value and item.category = category_value and item.completed = completed_value and item.archived = archived_value then return item; end if;
    if item.version <> expected_version then raise exception 'This item changed on another device. Refresh and try again.'; end if;
    update public.shopping_items set name=trim(item_name),quantity=quantity_value,unit=unit_value,category=category_value,completed=completed_value,archived=archived_value,version=version+1,updated_at=now() where id=item_id returning * into item;
  else
    if expected_version <> 0 then raise exception 'Item no longer exists. Refresh the list.'; end if;
    if (select count(*) from public.shopping_items where household_id=target_household and not archived) >= 1000 then raise exception 'Archive completed items before adding more'; end if;
    insert into public.shopping_items(id,household_id,name,quantity,unit,category,completed,archived)
      values(item_id,target_household,trim(item_name),quantity_value,unit_value,category_value,completed_value,archived_value) returning * into item;
  end if;
  return item;
end;
$$;

create function public.save_recipe(target_household uuid,recipe_id_value uuid,recipe_name text,ingredient_values text[],instruction_value text,expected_version integer)
returns public.recipes language plpgsql security definer set search_path = '' as $$
declare recipe public.recipes; ingredient text;
begin
  if not public.is_household_member(target_household) then raise exception 'Household access required'; end if;
  if expected_version is null or expected_version < 0 then raise exception 'An expected version is required'; end if;
  if ingredient_values is null or cardinality(ingredient_values)>100 then raise exception 'Use up to 100 ingredients'; end if;
  foreach ingredient in array ingredient_values loop
    if ingredient is null or length(trim(ingredient)) not between 1 and 160 then raise exception 'Each ingredient must be between 1 and 160 characters'; end if;
  end loop;
  perform 1 from public.households where id=target_household for update;
  select * into recipe from public.recipes where id=recipe_id_value for update;
  if found then
    if recipe.household_id<>target_household then raise exception 'Recipe not found'; end if;
    if recipe.name=trim(recipe_name) and recipe.ingredients=ingredient_values and recipe.instructions=instruction_value then return recipe; end if;
    if recipe.version<>expected_version then raise exception 'This recipe changed on another device. Refresh and try again.'; end if;
    update public.recipes set name=trim(recipe_name),ingredients=ingredient_values,instructions=instruction_value,version=version+1,updated_at=now() where id=recipe_id_value returning * into recipe;
  else
    if expected_version<>0 then raise exception 'Recipe no longer exists'; end if;
    if (select count(*) from public.recipes where household_id=target_household and archived_at is null)>=1000 then raise exception 'Recipe limit reached'; end if;
    insert into public.recipes(id,household_id,name,ingredients,instructions) values(recipe_id_value,target_household,trim(recipe_name),ingredient_values,instruction_value) returning * into recipe;
  end if;
  return recipe;
end;
$$;

create function public.save_meal_plan(target_household uuid,date_value date,recipe_id_value uuid,title_value text,cook_id_value uuid,expected_version integer)
returns public.meal_plans language plpgsql security definer set search_path = '' as $$
declare plan public.meal_plans; ingredients_value text[] := '{}';
begin
  if not public.is_household_member(target_household) then raise exception 'Household access required'; end if;
  if date_value is null or date_value < current_date-365 or date_value>current_date+730 then raise exception 'Choose a date within the planning window'; end if;
  if expected_version is null or expected_version<0 then raise exception 'An expected version is required'; end if;
  if recipe_id_value is not null and not exists(select 1 from public.recipes where id=recipe_id_value and household_id=target_household and archived_at is null) then raise exception 'Recipe not found'; end if;
  if recipe_id_value is not null then select ingredients into ingredients_value from public.recipes where id=recipe_id_value; end if;
  if cook_id_value is not null and not exists(select 1 from public.household_members where id=cook_id_value and household_id=target_household and removed_at is null) then raise exception 'Cook must be an active member'; end if;
  perform 1 from public.households where id=target_household for update;
  select * into plan from public.meal_plans where household_id=target_household and meal_date=date_value for update;
  if found then
    if plan.recipe_id is not distinct from recipe_id_value and plan.title=trim(title_value) and plan.cook_id is not distinct from cook_id_value then return plan; end if;
    if plan.version<>expected_version then raise exception 'This meal changed on another device. Refresh and try again.'; end if;
    update public.meal_plans set recipe_id=recipe_id_value,ingredients_snapshot=ingredients_value,title=trim(title_value),cook_id=cook_id_value,version=version+1,updated_at=now() where id=plan.id returning * into plan;
  else
    if expected_version<>0 then raise exception 'Meal no longer exists'; end if;
    insert into public.meal_plans(household_id,meal_date,recipe_id,ingredients_snapshot,title,cook_id) values(target_household,date_value,recipe_id_value,ingredients_value,trim(title_value),cook_id_value) returning * into plan;
  end if;
  return plan;
end;
$$;

create function public.copy_meal_week(target_household uuid,source_start date,destination_start date)
returns integer language plpgsql security definer set search_path = '' as $$
declare copied integer;
begin
  if not public.is_household_member(target_household) then raise exception 'Household access required'; end if;
  if source_start is null or destination_start is null or destination_start<current_date-7 or destination_start>current_date+365 then raise exception 'Invalid week'; end if;
  perform 1 from public.households where id=target_household for update;
  insert into public.meal_plans(household_id,meal_date,recipe_id,ingredients_snapshot,title,cook_id)
    select household_id,destination_start+(meal_date-source_start),recipe_id,ingredients_snapshot,title,
      case when exists(select 1 from public.household_members where id=p.cook_id and removed_at is null) then cook_id else null end
    from public.meal_plans p where household_id=target_household and meal_date between source_start and source_start+6
    on conflict(household_id,meal_date) do nothing;
  get diagnostics copied=row_count;
  return copied;
end;
$$;

create function public.add_meal_ingredients(target_household uuid,week_start date)
returns integer language plpgsql security definer set search_path = '' as $$
declare added integer; missing_count integer; active_count integer;
begin
  if not public.is_household_member(target_household) then raise exception 'Household access required'; end if;
  if week_start is null then raise exception 'Choose a week'; end if;
  perform 1 from public.households where id=target_household for update;
  select count(*) into active_count from public.shopping_items where household_id=target_household and not archived;
  select count(*) into missing_count from public.meal_plans p
    cross join lateral unnest(p.ingredients_snapshot) with ordinality ingredient(name,ordinality)
    where p.household_id=target_household and p.meal_date between week_start and week_start+6
      and not exists(select 1 from public.shopping_items s where s.source_plan_id=p.id and s.source_ingredient_index=ingredient.ordinality);
  if active_count+missing_count>1000 then raise exception 'Archive completed items before adding this week'; end if;
  insert into public.shopping_items(id,household_id,name,source_plan_id,source_ingredient_index)
    select gen_random_uuid(),p.household_id,trim(ingredient.name),p.id,ingredient.ordinality
    from public.meal_plans p
    cross join lateral unnest(p.ingredients_snapshot) with ordinality ingredient(name,ordinality)
    where p.household_id=target_household and p.meal_date between week_start and week_start+6
    on conflict(source_plan_id,source_ingredient_index) where source_plan_id is not null do nothing;
  get diagnostics added=row_count;
  return added;
end;
$$;
revoke all on function public.save_shopping_item(uuid,uuid,text,numeric,text,text,boolean,boolean,integer),public.save_recipe(uuid,uuid,text,text[],text,integer),public.save_meal_plan(uuid,date,uuid,text,uuid,integer),public.copy_meal_week(uuid,date,date),public.add_meal_ingredients(uuid,date) from public,anon;
grant execute on function public.save_shopping_item(uuid,uuid,text,numeric,text,text,boolean,boolean,integer),public.save_recipe(uuid,uuid,text,text[],text,integer),public.save_meal_plan(uuid,date,uuid,text,uuid,integer),public.copy_meal_week(uuid,date,date),public.add_meal_ingredients(uuid,date) to authenticated;
alter publication supabase_realtime add table public.recipes,public.meal_plans,public.shopping_items;

-- One read-only statement gives clients a transaction-consistent core snapshot.
-- SECURITY INVOKER preserves column grants and RLS (notably PIN hash exclusion).
create function public.get_household_snapshot(target_household_id uuid,history_limit integer default 100)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
begin
  if not public.is_household_member(target_household_id) then raise exception 'Household access required'; end if;
  if history_limit is null or history_limit not between 1 and 500 then raise exception 'History limit must be between 1 and 500'; end if;
  return jsonb_build_object(
    'householdId',target_household_id,
    'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'household_id',m.household_id,'auth_user_id',m.auth_user_id,'display_name',m.display_name,'avatar',m.avatar,'role',m.role,'wallet_balance',m.wallet_balance,'removed_at',m.removed_at) order by m.created_at) from public.household_members m where m.household_id=target_household_id),'[]'::jsonb),
    'chores',coalesce((select jsonb_agg(to_jsonb(c) order by c.due_date nulls last) from public.chores c where c.household_id=target_household_id),'[]'::jsonb),
    'completions',coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc) from (
      select * from public.chore_completions where household_id=target_household_id and status='submitted'
      union all
      (select * from public.chore_completions where household_id=target_household_id and status<>'submitted' order by created_at desc limit history_limit)
    ) c),'[]'::jsonb),
    'rewards',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at) from public.rewards r where r.household_id=target_household_id),'[]'::jsonb),
    'inventory',coalesce((select jsonb_agg(to_jsonb(i) order by i.purchased_at desc) from (
      select * from public.reward_inventory where household_id=target_household_id and status='available'
      union all
      (select * from public.reward_inventory where household_id=target_household_id and status='redeemed' order by purchased_at desc limit history_limit)
    ) i),'[]'::jsonb),
    'ledger',coalesce((select jsonb_agg(to_jsonb(l)) from (select * from public.point_ledger where household_id=target_household_id order by created_at desc limit history_limit) l),'[]'::jsonb),
    'shopping',coalesce((select jsonb_agg(to_jsonb(s)) from public.shopping_items s where s.household_id=target_household_id and not s.archived),'[]'::jsonb)
  );
end;
$$;
revoke all on function public.get_household_snapshot(uuid,integer) from public,anon;
grant execute on function public.get_household_snapshot(uuid,integer) to authenticated;

create or replace function public.export_household_data()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare household_id_value uuid;
begin
  select household_id into household_id_value from public.household_members where auth_user_id=auth.uid() and role='owner' and removed_at is null;
  if household_id_value is null then raise exception 'Owner access required'; end if;
  return jsonb_build_object('schema_version',2,'exported_at',now(),
    'household',(select to_jsonb(h) from public.households h where id=household_id_value),
    'members',coalesce((select jsonb_agg(to_jsonb(m)-'pin_hash') from public.household_members m where household_id=household_id_value),'[]'::jsonb),
    'chores',coalesce((select jsonb_agg(to_jsonb(c)) from public.chores c where household_id=household_id_value),'[]'::jsonb),
    'completions',coalesce((select jsonb_agg(to_jsonb(c)) from public.chore_completions c where household_id=household_id_value),'[]'::jsonb),
    'rewards',coalesce((select jsonb_agg(to_jsonb(r)) from public.rewards r where household_id=household_id_value),'[]'::jsonb),
    'inventory',coalesce((select jsonb_agg(to_jsonb(i)) from public.reward_inventory i where household_id=household_id_value),'[]'::jsonb),
    'ledger',coalesce((select jsonb_agg(to_jsonb(l)) from public.point_ledger l where household_id=household_id_value),'[]'::jsonb),
    'shopping',coalesce((select jsonb_agg(to_jsonb(s)) from public.shopping_items s where household_id=household_id_value),'[]'::jsonb),
    'recipes',coalesce((select jsonb_agg(to_jsonb(r)) from public.recipes r where household_id=household_id_value),'[]'::jsonb),
    'meal_plans',coalesce((select jsonb_agg(to_jsonb(p)) from public.meal_plans p where household_id=household_id_value),'[]'::jsonb)
  );
end;
$$;
