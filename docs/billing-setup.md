# Billing activation — deliberately disabled

The owner confirmed on September 23, 2026 that App Store Connect, Google Play Console and RevenueCat are not set up. The application must remain on the free plan until the following gates pass. This guide is not permission to enroll, buy a paid service, accept commercial terms or set prices on the owner’s behalf.

## Already implemented

Native purchase/restore UI, stable authenticated SDK identity, sponsor binding, server verification, product allowlist, sandbox rejection by default, expiry/grace/refund checks, throttling and out-of-order verification protection. Three billing/routine database migrations are applied to the current project. Edge functions are **not deployed**.

The database is authoritative. The client never writes `isPro`, grants an entitlement, trusts user metadata for a role, or treats an SDK response alone as a confirmed household upgrade. Household points purchases are a separate non-cash workflow.

## Provider and product setup

1. The owner establishes store developer accounts and a RevenueCat project after reviewing their costs/terms. Use bundle/package ID `com.harulo.homehuddle` only after confirming ownership and availability.
2. Create the approved recurring subscription products in both stores, connect them to RevenueCat, and map them to entitlement `homehuddle_pro` and a current offering. Do not hardcode design-document price hypotheses. The app displays the store package’s localized price and billing period.
3. Review receipt-transfer/restore behavior and family-sharing policy. The initial model is one explicit adult sponsor per household. Sponsor reassignment and cancelled-checkout recovery need a completed support/product policy and tested implementation before launch; do not hand-edit customer entitlements to simulate a passing store test.
4. Publish approved privacy/terms/support pages, child-data and retention rules, cancellation instructions and store disclosures. Store cancellation and data deletion are separate operations.

## Configuration boundaries

Public application values, in an untracked build environment:

- `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` and `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`: public SDK keys only.
- `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_PRIVACY_URL`: approved HTTPS pages.
- `EXPO_PUBLIC_BILLING_ENABLED=false`: keep false until qualification is complete.

Server-only Supabase function secrets, configured through the provider’s secret store, never committed and never prefixed `EXPO_PUBLIC_`:

- `REVENUECAT_SECRET_API_KEY`: server API key for the correct RevenueCat project.
- `REVENUECAT_PRODUCT_IDS`: comma-separated approved product identifiers exactly as returned by RevenueCat customer info. Verify Play base-plan naming in real responses.
- `REVENUECAT_WEBHOOK_AUTHORIZATION`: independently generated high-entropy header value, at least 32 characters; match it exactly in the RevenueCat webhook integration.
- `BILLING_ALLOW_SANDBOX`: omit or set `false` in production. Set `true` only on an isolated staging environment with distinct users/data.
- Supabase injects `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` into its hosted function environment. Confirm availability; do not copy the service key into the app.

Deployment uses `billing-reconcile` with JWT verification enabled and `billing-webhook` with gateway JWT verification disabled **only because its handler verifies the dedicated provider Authorization secret**. If webhook configuration is missing/too short it fails closed. CORS/web checkout is not implemented; purchases are native-only.

Before deployment, run `npm run check:edge`, application tests and both database test runners. Discover current deployment/secrets commands with the pinned Supabase CLI’s `functions --help` and `secrets --help`; do not paste secrets into shell history. The current hosted database also contains unrelated brain-graph migrations: preserve them, reconcile the environment history deliberately and avoid broad `db reset`/migration repair commands.

## Required qualification before enabling checkout

Use a staging project, store sandbox accounts and owned devices. Verify:

- New monthly/yearly purchase, cancel before purchase, pending purchase, process termination, lost acknowledgment and a second adult attempting to pay.
- Restore with same account, different account, transferred receipt and both source/destination households; no duplicate household grant and no stranded payer.
- Renewal, cancellation with access through expiry, billing issue, grace end, refund, expired entitlement and product change.
- Forged webhook, no Authorization header, oversized/chunked body, duplicate event, older event, provider timeout, retry, stale verification and no leaking of raw provider payloads/secrets.
- Production rejects sandbox transactions even if the webhook event says production. The handler fetches transaction environment from the provider response.
- Role downgrade, sponsor removal, household closure, account deletion and provider-side erasure/retention obligations.
- Existing free routines/data/export/deletion still work after expiration. Advanced routines stop creating new dates, while already-generated work/history remains accessible.
- A paid-but-not-yet-verified result never encourages another payment. Finish pending-state recovery and operational monitoring before activation.

Run HTTP-level edge integration tests as well as the current pure authority/SQL tests. Configure alerting and a recoverable reconciliation strategy; provider webhook retries alone are not an operational reconciliation plan. Keep the flag false until these checks and legal/store review have passed.

Current primary references: [RevenueCat React Native setup](https://www.revenuecat.com/docs/getting-started/installation/reactnative), [webhook delivery and authentication](https://www.revenuecat.com/docs/integrations/webhooks), [customer-info schema](https://www.revenuecat.com/docs/api-v1/customer-info-model), [customer lookup API](https://www.revenuecat.com/docs/api-v1/customers), [Supabase function security](https://supabase.com/docs/guides/functions/auth).
