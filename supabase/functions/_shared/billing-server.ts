import { createClient } from 'npm:@supabase/supabase-js@2.98.0';
import { verifiedSubscription } from './subscription.ts';

function required(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error('Billing is not configured');
  return value;
}
export const adminClient = () => createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });
export function userClient(authorization: string) {
  return createClient(required('SUPABASE_URL'), required('SUPABASE_ANON_KEY'), { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: authorization } } });
}
export async function reconcileSubscriber(userId: string) {
  const admin = adminClient();
  const { data: binding, error } = await admin.from('household_billing_accounts').select('household_id').eq('payer_user_id', userId).maybeSingle();
  if (error) throw error;
  if (!binding) return;
  const products = required('REVENUECAT_PRODUCT_IDS').split(',').map(value => value.trim()).filter(Boolean);
  if (!products.length) throw new Error('Billing products not configured');
  const response = await fetch('https://api.revenuecat.com/v1/subscribers/' + encodeURIComponent(userId), { headers: { Authorization: 'Bearer ' + required('REVENUECAT_SECRET_API_KEY') }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('Subscription provider unavailable');
  const verified = verifiedSubscription(await response.json(), products, Deno.env.get('BILLING_ALLOW_SANDBOX') === 'true');
  const saved = await admin.rpc('apply_verified_subscription', { payer_id: userId, active_value: verified.active, expiry_value: verified.expiresAt, checked_at_ms: verified.checkedAt, product_value: verified.product });
  if (saved.error) throw saved.error;
}
export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
