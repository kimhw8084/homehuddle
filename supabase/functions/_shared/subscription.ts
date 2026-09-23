// Runtime-independent authority logic, also exercised by Jest. Only expiring
// App Store / Play subscriptions are supported (not lifetime/promotional grants).
type Entitlement = { product_identifier?: string; expires_date?: string | null; grace_period_expires_date?: string | null };
type Subscription = { expires_date?: string | null; grace_period_expires_date?: string | null; is_sandbox?: boolean; refunded_at?: string | null; store?: string };
export type CustomerResponse = { request_date_ms: number; subscriber: { entitlements: Record<string, Entitlement>; subscriptions: Record<string, Subscription> } };
export function verifiedSubscription(value: CustomerResponse, products: readonly string[], allowSandbox: boolean, now = Date.now()) {
  if (!value || !Number.isSafeInteger(value.request_date_ms) || Math.abs(value.request_date_ms - now) > 300000 || !value.subscriber?.entitlements || !value.subscriber?.subscriptions) throw new Error('Invalid provider response');
  const entitlement = value.subscriber.entitlements.homehuddle_pro;
  const product = entitlement?.product_identifier;
  const subscription = product ? value.subscriber.subscriptions[product] : undefined;
  const inactive = { active: false, expiresAt: null, product: product ?? null, checkedAt: value.request_date_ms };
  if (!product || !products.includes(product) || !subscription || !['app_store', 'play_store'].includes(subscription.store ?? '') || subscription.refunded_at || typeof subscription.is_sandbox !== 'boolean' || (subscription.is_sandbox && !allowSandbox)) return inactive;
  const dates = [entitlement.expires_date, entitlement.grace_period_expires_date, subscription.expires_date, subscription.grace_period_expires_date];
  if (dates.some(date => date != null && (typeof date !== 'string' || !Number.isFinite(Date.parse(date))))) throw new Error('Invalid provider expiry');
  // Both the entitlement and its subscription must still authorize access.
  const expiry = Math.min(Math.max(...dates.slice(0, 2).map(date => date ? Date.parse(date) : 0)), Math.max(...dates.slice(2).map(date => date ? Date.parse(date) : 0)));
  if (!Number.isFinite(expiry) || expiry <= now) return inactive;
  return { active: true, expiresAt: new Date(expiry).toISOString(), product, checkedAt: value.request_date_ms };
}

export function webhookUserIds(event: Record<string, unknown>): string[] {
  // Transfers must reconcile BOTH households; do not trust alias ownership or
  // apply the event's entitlement fields. Each known UUID is fetched separately.
  const candidates = [event.app_user_id, event.original_app_user_id, ...(Array.isArray(event.aliases) ? event.aliases : []), ...(Array.isArray(event.transferred_from) ? event.transferred_from : []), ...(Array.isArray(event.transferred_to) ? event.transferred_to : [])];
  return [...new Set(candidates.filter((id): id is string => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)))].slice(0, 20);
}
