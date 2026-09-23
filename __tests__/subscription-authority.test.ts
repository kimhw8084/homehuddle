import { CustomerResponse, verifiedSubscription, webhookUserIds } from '../supabase/functions/_shared/subscription';

const now = Date.parse('2026-09-23T12:00:00Z');
const expiry = '2026-10-23T12:00:00Z';
const fixture = (): CustomerResponse => ({ request_date_ms: now, subscriber: {
  entitlements: { homehuddle_pro: { product_identifier: 'plus_monthly', expires_date: expiry } },
  subscriptions: { plus_monthly: { expires_date: expiry, is_sandbox: false, refunded_at: null, store: 'app_store' } },
} });
test('verified expiring store subscription grants access', () => {
  expect(verifiedSubscription(fixture(), ['plus_monthly'], false, now)).toMatchObject({ active: true, expiresAt: new Date(expiry).toISOString() });
});
test('sandbox is denied by default even when the event claims production', () => {
  const value = fixture(); value.subscriber.subscriptions.plus_monthly.is_sandbox = true;
  expect(verifiedSubscription(value, ['plus_monthly'], false, now).active).toBe(false);
  expect(verifiedSubscription(value, ['plus_monthly'], true, now).active).toBe(true);
});
test('refund, unsupported product and expired entitlement deny access', () => {
  const value = fixture(); value.subscriber.subscriptions.plus_monthly.refunded_at = new Date(now).toISOString();
  expect(verifiedSubscription(value, ['plus_monthly'], false, now).active).toBe(false);
  expect(verifiedSubscription(fixture(), ['other_product'], false, now).active).toBe(false);
  const expired = fixture(); expired.subscriber.entitlements.homehuddle_pro.expires_date = '2026-09-20T00:00:00Z';
  expect(verifiedSubscription(expired, ['plus_monthly'], false, now).active).toBe(false);
});
test('grace period requires both provider entitlement and subscription authorization', () => {
  const value = fixture();
  value.subscriber.entitlements.homehuddle_pro.expires_date = '2026-09-20T00:00:00Z';
  value.subscriber.entitlements.homehuddle_pro.grace_period_expires_date = expiry;
  value.subscriber.subscriptions.plus_monthly.expires_date = '2026-09-20T00:00:00Z';
  expect(verifiedSubscription(value, ['plus_monthly'], false, now).active).toBe(false);
  value.subscriber.subscriptions.plus_monthly.grace_period_expires_date = expiry;
  expect(verifiedSubscription(value, ['plus_monthly'], false, now).active).toBe(true);
});
test('malformed and stale provider responses cannot revoke or grant access', () => {
  expect(() => verifiedSubscription({ ...fixture(), request_date_ms: now - 600000 }, ['plus_monthly'], false, now)).toThrow();
  expect(() => verifiedSubscription({} as CustomerResponse, ['plus_monthly'], false, now)).toThrow();
  const bad = fixture(); bad.subscriber.entitlements.homehuddle_pro.expires_date = 'not-a-date';
  expect(() => verifiedSubscription(bad, ['plus_monthly'], false, now)).toThrow();
});
test('transfers reconcile source and destination, ignore anonymous identifiers and deduplicate', () => {
  const a = '00000000-0000-4000-8000-000000000001'; const b = '00000000-0000-4000-8000-000000000002';
  expect(webhookUserIds({ app_user_id: a, aliases: [a, '$RCAnonymousID:abc'], transferred_from: [a], transferred_to: [b] })).toEqual([a, b]);
});
