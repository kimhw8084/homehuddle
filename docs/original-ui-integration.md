# Original UI integration — September 24, 2026

Local date America/Chicago; database application completed September 24 UTC.

## Contract

HomeHuddle's product identity is the owner's evolved authored UI, including work through April 30 commit `c098688`. The September 23 recovery incorrectly used March 8 commit `dcf30b3` as the source. Later, fuller Home and Chores screens had been retained at `features/demo/screens/MissionControlScreen.tsx` and `features/demo/screens/ChoresView.tsx`; the active tab routes now use those preserved screens. Keep the four-tab structure, visual language, rich cards, calendar, filters, bottom sheets, wallet chart, inventory gestures, and reward editor. Backend integration is not permission to replace the screens with a smaller app.

This checkpoint preserves the Market/Wallet implementation and restores the richer Home/Chores UI, **not a claim of complete production readiness or UI perfection**. Chores uses household-backed operations for several core actions, but recurrence, sections/order metadata, and other advanced flows still need a persistence audit. Home uses household commands for reviews, while automations, appliance controls, and some content remain preview/local state. Store accounts and RevenueCat are not configured, and paid checkout remains disabled.

## Implemented without replacing the screens

| Area | Current implementation |
|---|---|
| Identity | UUID-based household members; selected member is not the authenticated actor; adults cannot spend another adult/teen account's points |
| Catalog | Persisted emoji, category, description, price/history, stock, expiration, eligibility, curators, creator and version |
| Market operations | Create/edit/archive/restock with server validation and conflict checks; adult-created scoped sales and cancellation |
| Purchase | Confirm the effective price; atomically decrement stock and points; immutable purchased terms; no success celebration before acknowledgement |
| Bag | Server-enforced use, bounded undo, gift, expiration and refund of the price actually paid; separate purchase/refund ledger records |
| Goals | Personal/family funds backed by real point deposits; completion consumes deposits once; cancellation refunds original contributors |
| Wallet | Actual balances and ledger activity; 30-day server aggregates avoid misleading charts truncated to the activity-list limit; cached/synced state |
| Recovery | Durable operation IDs before sending, simultaneous-tap locks, retained failed drafts, context-switch guards, and resolution of an earlier unknown result before accepting changed intent |
| UI | Safe-area tab bar/FAB positioning, non-collapsing member strips, sheet dismissal guards, optional-note dialog, selected accessibility state, reduced-motion purchase/goal feedback |
| Preview honesty | Explicit sample-data developer control and Home/Chores notices; no fabricated household members or inventory in signed-in Market/Wallet |

Household points are not currency or a real-money wallet. Daily wallet buckets currently use UTC, explicitly distinct from the still-needed household timezone work.

## Structure and authority

The active Home and Chores tab files re-export the preserved full screens in `features/demo/screens/`; that historical folder name does not mean those screens are disposable or safe to replace. Market and Wallet retain their active authored routes. `features/rewards/market-model.ts` contains data mapping and validation; `market-api.ts` sends scoped commands. `lib/persisted-command.ts` owns durable retry receipts. `hooks/use-household-command.ts` owns in-flight state, account/role scope checks, and refresh requests. The existing household bootstrap and snapshot synchronizer remain the shared data boundary.

The database is authoritative for permissions, points, stock, purchase price, inventory state, and contributions. `private.market_commands` is an internal idempotency ledger, not a client-readable table. Household-row locks serialize shared balance/stock changes. Version checks reject stale editing. RLS restricts reads; direct client writes to new shared tables are denied. New tables participate in the existing Realtime refresh mechanism.

Applied forward migrations (do not edit in place):

- `20260924035722_original_market_wallet.sql`
- `20260924035724_wallet_fund_ledger_kinds.sql`
- `20260924035725_wallet_funds.sql`
- `20260924035821_cover_wallet_fund_foreign_key.sql`

The enum addition is a separate migration because PostgreSQL requires a commit before new enum values are used. The final migration covers the contribution-to-fund composite foreign key. No reset migration was run on the hosted database; destructive historical bootstrap migrations are only used by fresh isolated test clusters. Unrelated hosted `brain_graph_*` objects were left untouched.

## Evidence and limits

- Before the September 24 Home/Chores route correction, TypeScript passed; Jest passed 22 suites / 84 tests; 122 database assertions passed in PGlite and native PostgreSQL; native concurrency checks passed; lint had 0 errors / 793 warnings; strict production-module lint passed; SDK 57 alignment and iOS/Android/web JavaScript exports passed. These checks are not evidence for the newly reactivated Home/Chores routes.
- Rendered preview: all four tabs at 390×844 in headless Chrome, no page errors; screenshots were visually inspected. Runtime checks found and fixed the NativeWind manual-theme configuration, unsupported web gyroscope subscription, developer-preview onboarding redirect, and clipped member rows.
- Hosted checks: new shared-table RLS and client privileges, RPC grants, and invoker snapshot verified after migration. No real user purchases or fund deposits were made to test the hosted project.
- Actual iPhone, signed-in two-device Auth/Realtime/Storage, keyboard/VoiceOver/Dynamic Type, release performance and human visual acceptance remain unverified.

The September 23 screenshots show the earlier March-based routes and are historical, not visual evidence for the restored screens. The signed-in Market/Wallet screen tests use mocked transport; database tests exercise SQL separately. A real end-to-end service/device test and fresh visual review of Home/Chores are still release gates.

## Hosted advisor disposition

The post-migration performance advisor reports only 33 unused-index informational findings, including new low-traffic indexes and unrelated tables. The uncovered foreign key was corrected. Do not remove tenant/foreign-key indexes solely because a small project's statistics show no usage yet. [Unused-index guidance](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

Security advisories remain visible:

- Two internal/server-owned tables have RLS with no client policies, intentionally deny-by-default. [RLS-without-policy guidance](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- Nineteen objects are discoverable through the authenticated GraphQL schema; tenant read policies remain required. [GraphQL exposure guidance](https://supabase.com/docs/guides/database/database-linter?lint=0027_pg_graphql_authenticated_table_exposed).
- Fifty authenticated SECURITY DEFINER functions are reported. Controlled mutation RPCs need explicit authorization, fixed search paths, and restricted grants; changing all to invoker would break the no-direct-write boundary. Regression tests cover selected critical permission paths, not an independent complete security audit. [Definer-function guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- Leaked-password protection remains disabled in hosted Auth. No paid plan or authentication policy was silently enabled. [Password protection guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

These findings are not represented as an all-green security review.

## Remaining implementation, in order

1. **Original Chores:** audit the restored UI against the existing core create/edit/archive/assignment/completion commands, then persist section metadata, drag ordering, filters/preferences, and all supported recurrence forms and exceptions. Verify proof, review, pending/approved/rejected/undo states without client-minted points. Preserve monthly/yearly/custom recurrence rather than silently reducing the editor to the existing daily/weekly routine subset.
2. **Original Home:** finish live family roster/presence, actual reviews and today's chores, persisted automation and appliance state; remove sample values only as each operation gains a real data contract. Replace any fake refresh with the shared synchronizer.
3. **Recovery and history:** durable offline queue/conflict UX, saved editing drafts across process restarts, uncertain-command recovery surfaced independently of reopening its form, bounded receipt retention, history pagination, and household timezone/DST semantics. Current receipts protect retries; they are not a full offline queue.
4. **Native UI qualification:** smallest supported iPhone, large text, VoiceOver, dark mode, reduced motion throughout all original screens, keyboard avoidance and gesture alternatives. Test long names, empty households, 100+ items and role/account switches. Web compile is not certification of every browser alert/gesture interaction.
5. **End-to-end integrity:** two owned test accounts/devices; email links, reconnection, background/resume, lost-response retries, concurrent purchases, expired/refunded inventory, household/member removal, proof media upload/deletion. Exercise real Supabase services, not just isolated SQL.
6. **Operations and monetization:** push delivery, media lifecycle, restore drill, dependency/security review, latency/error/quota monitoring; approved privacy/terms/child-data decisions; then configured store products, RevenueCat webhooks, real sandbox purchase/restore/cancellation, and signed release builds. Do not enable paid checkout before this evidence exists.

## Manual Market/Wallet acceptance

Use an owned disposable household, not developer bypass. Create a reward with limited stock and eligibility. Purchase with an authorized member who already has legitimately earned points; verify the immutable price, decrement, ledger and bag after reload. Use/undo, gift to an eligible member, and refund an unused non-gifted reward. Verify rejected actions do not alter balances. Start a family fund, deposit from two authorized accounts, cancel and confirm each original contributor receives exactly their own deposit back. Repeat with two devices and interrupt connectivity during a request.

A zero-point new household still lacks a verified end-to-end run through the restored full Chores flow proving that completion/review awards points and remains correct after reload. Do not insert fake production points to make a demo look complete; complete that signed-in flow before treating this as a household pilot.
