-- Kept separate because PostgreSQL cannot safely use a newly added enum value
-- in the same migration transaction.
alter type public.household_role add value if not exists 'teen';
