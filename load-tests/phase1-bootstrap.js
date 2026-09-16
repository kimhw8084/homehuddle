import http from 'k6/http';
import { check, sleep } from 'k6';

// Read-only bootstrap test. Provide an authenticated staging access token and a
// household UUID owned by that account; never point this at production.
const baseUrl = __ENV.SUPABASE_URL;
const anonKey = __ENV.SUPABASE_ANON_KEY;
const accessToken = __ENV.TEST_ACCESS_TOKEN;
const householdId = __ENV.TEST_HOUSEHOLD_ID;

if (!baseUrl || !anonKey || !accessToken || !householdId) {
  throw new Error('SUPABASE_URL, SUPABASE_ANON_KEY, TEST_ACCESS_TOKEN, and TEST_HOUSEHOLD_ID are required');
}

export const options = {
  scenarios: {
    bootstrap: { executor: 'constant-vus', vus: 50, duration: '5m' },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
    household_bootstrap_duration: ['p(95)<2500'],
  },
};

const headers = { apikey: anonKey, Authorization: `Bearer ${accessToken}` };
const tables = [
  ['household_members', 'id,household_id,auth_user_id,display_name,avatar,role,wallet_balance'],
  ['chores', 'id,household_id,title,points,assigned_member_id,due_at,recurrence_rule,photo_required,status,created_at,updated_at'],
  ['chore_completions', 'id,chore_id,household_id,completed_by_member_id,occurrence_date,status,created_at'],
  ['rewards', 'id,household_id,title,description,cost,active,created_at'],
  ['reward_inventory', 'id,household_id,member_id,reward_id,status,purchased_at,redeemed_at'],
  ['point_ledger', 'id,household_id,member_id,kind,amount,completion_id,inventory_id,created_at'],
];

export default function () {
  const startedAt = Date.now();
  const requests = tables.map(([table, select]) => ({
    method: 'GET',
    url: `${baseUrl}/rest/v1/${table}?household_id=eq.${householdId}&select=${encodeURIComponent(select)}&limit=100`,
    params: { headers },
  }));
  const responses = http.batch(requests);
  check(responses, { 'bootstrap reads return 200': (result) => result.every((response) => response.status === 200) });
  // k6 automatically exports this custom trend to the selected output.
  const elapsed = Date.now() - startedAt;
  // eslint-disable-next-line no-undef
  household_bootstrap_duration.add(elapsed);
  sleep(1);
}

import { Trend } from 'k6/metrics';
export const household_bootstrap_duration = new Trend('household_bootstrap_duration');
