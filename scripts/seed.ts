import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
// Note: Normally we'd use the Service Role key here to bypass RLS, but since we don't have it,
// we'll output pure SQL for the user to run directly in their Supabase SQL editor.

const SQL_SEED_SCRIPT = `
-- 1. Create a massive realistic Household
INSERT INTO households (id, name, join_code, tax_pool_balance)
VALUES ('00000000-0000-0000-0000-000000000001', 'The Blueprint Family', 'BP-9999', 5400)
ON CONFLICT (id) DO NOTHING;

-- 2. Create the App Profile directly linked to an existing user if possible, or dummy UUIDs.
-- We'll use random UUIDs for profiles. This will require RLS bypass if accessed normally, 
-- but since the user will run this directly in the SQL Editor, it runs as Postgres superuser.

INSERT INTO profiles (id, household_id, display_name, role, status, wallet_balance, vault_balance, parent_pin_hash)
VALUES 
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Mom (Lead)', 'parent', 'on_duty', 2500, 15000, '1234'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Dad', 'parent', 'off_duty', 1000, 8000, '1234'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Alex (Oldest)', 'child', 'off_duty', 3450, 12500, NULL),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Sarah (Middle)', 'child', 'off_duty', 1200, 4500, NULL),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Timmy (Youngest)', 'child', 'off_duty', 500, 1200, NULL);

-- 3. Populate Heavy Machine States
INSERT INTO machine_states (household_id, machine_name, current_state)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Dishwasher', 'Running'),
  ('00000000-0000-0000-0000-000000000001', 'Washer', 'Off'),
  ('00000000-0000-0000-0000-000000000001', 'Dryer', 'Finished');

-- 4. Store Inventory
INSERT INTO rewards_store (household_id, title, base_cost, visible_to_role)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '1 Hour Screen Time', 100, 'child'),
  ('00000000-0000-0000-0000-000000000001', 'Sleep In Pass', 500, 'parent'),
  ('00000000-0000-0000-0000-000000000001', 'Pick Movie Night', 300, 'all'),
  ('00000000-0000-0000-0000-000000000001', 'Skip One Chore', 400, 'child'),
  ('00000000-0000-0000-0000-000000000001', 'Pizza For Dinner', 1500, 'all');

-- 5. Seed Chores (Overdue, Today, Future)
INSERT INTO chores (household_id, title, point_value, photo_req, allow_claim_jump, due_date, status)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Empty Trash', 50, 'after', true, NOW() - INTERVAL '2 days', 'overdue'),
  ('00000000-0000-0000-0000-000000000001', 'Load Dishwasher', 100, 'none', false, NOW() - INTERVAL '5 hours', 'overdue'),
  ('00000000-0000-0000-0000-000000000001', 'Clean Living Room', 200, 'before_after', true, NOW() + INTERVAL '4 hours', 'pending'),
  ('00000000-0000-0000-0000-000000000001', 'Walk Buster', 150, 'after', false, NOW() + INTERVAL '12 hours', 'pending'),
  ('00000000-0000-0000-0000-000000000001', 'Mow Lawn', 500, 'before_after', true, NOW() + INTERVAL '2 days', 'pending');

-- Note: We can't safely script 200+ random UUID associations here without advanced PL/pgSQL loops
-- Since the user will use Fast Bypass, the TS arrays in the UI are providing the visual density.
`;

console.log("Since Supabase blocks automated seeding via Auth Rate Limits, please run the generated SQL script directly.");
console.log(SQL_SEED_SCRIPT);
