import { adminClient, json, reconcileSubscriber, userClient } from '../_shared/billing-server.ts';

Deno.serve(async request => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Sign in required' }, 401);
  try {
    const client = userClient(authorization);
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return json({ error: 'Sign in required' }, 401);
    const reservation = await adminClient().rpc('reserve_billing_reconciliation', { payer_id: data.user.id });
    if (reservation.error) throw reservation.error;
    if (!reservation.data) return json({ error: 'Wait 10 seconds before checking again, or ask your household sponsor to restore.' }, 429);
    // No caller-selected user/household or entitlement flags accepted.
    await reconcileSubscriber(data.user.id);
    return json({ reconciled: true });
  } catch { return json({ error: 'Unable to verify your subscription. Please retry shortly.' }, 503); }
});
