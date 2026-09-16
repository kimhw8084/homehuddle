-- Read-only: lists the relevant existing public-table columns.
select
  table_name,
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'households',
    'profiles',
    'chores',
    'chore_ledger',
    'rewards_store',
    'user_inventory',
    'household_members',
    'chore_completions',
    'rewards',
    'reward_inventory',
    'point_ledger'
  )
order by table_name, ordinal_position;
