import { json, reconcileSubscriber } from '../_shared/billing-server.ts';
import { webhookUserIds } from '../_shared/subscription.ts';

async function equalSecret(actual: string, expected: string) {
  // Compare fixed-size digests without secret-dependent early exits.
  const encoder = new TextEncoder();
  const a = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(actual)));
  const b = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(expected)));
  let mismatch = 0;
  for (let index = 0; index < a.length; index++) mismatch |= a[index] ^ b[index];
  return mismatch === 0;
}
Deno.serve(async request => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const secret = Deno.env.get('REVENUECAT_WEBHOOK_AUTHORIZATION');
  if (!secret || secret.length < 32) return json({ error: 'Webhook not configured' }, 503);
  if (!await equalSecret(request.headers.get('Authorization') ?? '', secret)) return json({ error: 'Unauthorized' }, 401);
  // Read a bounded body even if Content-Length is absent or dishonest.
  const reader = request.body?.getReader();
  if (!reader) return json({ error: 'Missing body' }, 400);
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 65536) { await reader.cancel(); return json({ error: 'Body too large' }, 413); }
    chunks.push(value);
  }
  let event: Record<string, unknown>;
  try {
    const body = new Uint8Array(size); let offset = 0;
    chunks.forEach(chunk => { body.set(chunk, offset); offset += chunk.length; });
    event = JSON.parse(new TextDecoder().decode(body)).event;
    if (!event || typeof event !== 'object') return json({ error: 'Missing event' }, 400);
  } catch { return json({ error: 'Invalid JSON' }, 400); }
  try {
    await Promise.all(webhookUserIds(event).map(reconcileSubscriber));
    return json({ received: true });
  } catch {
    // RevenueCat retries non-200 responses. Repeated/out-of-order events fetch
    // current provider truth; the database rejects older verification results.
    return json({ error: 'Reconciliation unavailable; retry required' }, 503);
  }
});
