# HomeHuddle — native implementation and release-gate handoff

Date: September 23, 2026. Target: iOS and Android first; web is secondary. Implementation baseline: `438f21e`. This receipt supersedes the September 15 checkpoint where explicitly noted; the complete product design, improvement backlog and Golden UI review remain the target specifications.

## Verdict

A substantial native-focused implementation phase is complete. This is a **tested engineering preview, not a certified paid-production release and not closure of the entire design backlog**. “Perfect UI” and “90% production” are not evidence-backed labels yet. The remaining work includes implementation and human/device qualification, not just entering credentials.

The owner confirmed that App Store Connect, Google Play Console and RevenueCat are **not set up**. Checkout remains disabled. No store account, paid plan, subscription, provider secret, billing charge or app-store release was created.

## Implemented in this phase

### UI, UX and interaction safety

- Five native destinations: Today, Plan, Shop, Rewards, Household. Plan groups Chores, Dinners and Routines; wallet is reachable from Rewards. Existing chore URLs redirect to Plan.
- Shared production theme authority now provides light/dark surfaces, text, inputs, selection, validation and button colors. Navigation/status-bar theme and household-loading states follow the system scheme. Legacy account/prototype screens are not all migrated.
- Normal-flow native tab bar, safe-area padding, minimum button targets, wrapping rows and additional large-text tab space. These changes still need rendered device/large-text acceptance.
- Selection includes a visible checkmark and programmatic selected/checked state, rather than color alone. Busy buttons retain their action label and expose busy/disabled state.
- Required-field hints and field-associated errors, contextual row labels, recipe no-match state and truthful shopping/dinner loading/error/empty states.
- Shared editors have accessible headings, native modal isolation, initial focus, reduced-motion behavior, busy-dismissal prevention and inline discard confirmation. Web focus restoration checks whether the original trigger remains eligible. Native VoiceOver and fallback-focus behavior remain to be qualified.
- Dinner cook controls cannot change while saving. Chore, recipe, dinner, routine and reward editors guard unsaved changes; switching shopping items requires explicit discard.
- Refresh keeps loaded content/drafts and communicates freshness, disconnection and stale-data failures. Context revisions invalidate requests across account/member/role/household changes, including batched A→B→A transitions.
- Multi-step proof and household-point purchase paths check operation validity after asynchronous preparation before sending the next mutation.
- Notification preferences use named native switches, serialized saves and explicit failure feedback. Preferences no longer imply that a notification was delivered.

### Recurring chores

- New `chore_routines` templates generate independent chore records per civil date. Unique `(routine_id, due_date)` identity prevents duplicates and resurrection of archived/skipped occurrences.
- Free daily/weekly recurrence with one assignee or no assignee. Server-verified Plus permits custom intervals and rotating member assignments; the UI exposes these controls only when verified access is active.
- IANA timezone validation, date-based iteration and next-local-midnight due instants. Rotation preserves its position when a member is removed; new work for that slot is unassigned.
- Idempotent create, versioned pause/resume, household authorization, RLS, narrow grants, export inclusion and foreign-key/index coverage.
- Materialization prepares **14 days when the household loads**. It does not create an unlimited missed backlog. Pause stops new generation and preserves existing chores/history. Advanced generation stops after Plus expires, without taking away existing chores.
- Deliberate limits: at most 100 active routines, intervals 1–12 in the API (UI offers 1–4), up to 20 rotation members. Full series editing, vacation windows, monthly/calendar exceptions, always-on scheduled materialization, global household-timezone/travel consistency and long-history paging are not complete.

### Subscription implementation, disabled pending setup

- Native store package retrieval, localized store price/period, purchase, restore, refresh and manage-store-subscription links. Terms/privacy URLs and an explicit release flag are required before checkout is offered. No fixed price or trial was invented.
- One explicit adult sponsor per household. Stable authenticated RevenueCat user IDs and serialized SDK identity changes. Teens are not shown purchase controls or an upsell.
- Authoritative server reconciliation fetches RevenueCat customer state and verifies configured products, expiry/grace, store, refunds and sandbox policy. Client SDK flags and webhook payload entitlement claims do not grant access.
- Service-role-only entitlement updates reject stale verification results; authenticated clients cannot grant paid access. Reconciliation requests are throttled in the database. Removing/demoting a sponsor revokes household access; this does **not** cancel a store subscription.
- A bounded-body webhook requires a long configured Authorization secret, reconciles both sides of transfers and returns retryable errors when verification fails. It fetches provider truth instead of trusting event ordering. Optional RevenueCat HMAC signing is not implemented; the configured Authorization header is mandatory.
- Deno edge functions are source-implemented/typechecked but **not deployed or configured**. Provider HTTP integration, sandbox transactions, renewal/refund/grace/transfer behavior, webhook replay delivery, account-deletion provider erasure and sponsor reassignment/cancelled-checkout recovery remain paid-release gates.

### Native, repository and backend delivery

- Added Expo development client and SDK-compatible build properties; committed a prebuild plugin enforcing iOS 15.1 on third-party pod targets. Generated `ios/`/`android/` and bundle artifacts remain ignored, not mixed with maintained source.
- Added a prerequisite-checking `ios:simulator` command and [streamlined simulator instructions](../iphone-simulator.md).
- CI now includes pinned Deno function typechecks and Android/iOS JavaScript compilation, in addition to application tests, PostgreSQL policy tests and web compilation. Native JavaScript compilation is not an Android Gradle build or a physical-device test.
- Applied three additive HomeHuddle migrations to the existing hosted project: `20260923224701_recurring_routines`, `20260923224710_verified_household_billing`, `20260923225140_tighten_billing_read_surface`. CLI-created files were aligned to the hosted tool’s recorded timestamps. No household rows were seeded or charged on the hosted database.
- Preserved three unrelated September 21 brain-graph migrations and their objects. They are not copied into HomeHuddle’s migration chain. Do not run a broad reset, repair-away remote history, or assume this shared project is an isolated release environment. Isolation/history reconciliation needs a separate operational decision.
- Supabase/Postgres skill guidance materially shaped this work: explicit privileges, private helpers, RLS, empty security-definer search paths, short transactions, migration tests and post-deployment advisor checks.

## Verification receipt

| Check | Result / limitation |
|---|---|
| TypeScript | Passed |
| Jest | 17 suites, 60 tests passed |
| PostgreSQL/WASM | Full application migration chain, 76 assertions passed |
| Native PostgreSQL | Isolated PostgreSQL 17 migration/policy suite passed |
| Production UI lint | Zero warnings/errors |
| New hooks/functions/native plugin/notification settings lint | Zero warnings/errors |
| Whole repository lint | Zero errors, 428 legacy warnings |
| Deno edge-function check | Passed with pinned Deno 2.9.6 and dependency lock |
| Expo SDK package alignment | Passed |
| Native JavaScript exports | iOS and Android passed; about 8.08 MB each at the measured checkpoint |
| Secondary web export | Passed; about 5.43 MB JS at the measured checkpoint |
| iOS native compilation | Debug simulator target built successfully on Xcode 27.0, arm64, signing disabled; reproducible pod-floor fix used, no command-line deployment-target override required in the final build |
| Interactive iPhone Simulator | **Blocked:** Simulator.app is absent from the available Xcode installation; no native visual/VoiceOver acceptance claimed |
| Android native binary / device UX | Not run |
| Hosted privileges | New tables have RLS; anonymous routine creation denied; client entitlement grant denied; service reconciliation allowed; payer table direct reads revoked; entitlement realtime publication confirmed |
| Secret hygiene / environment | Public client configuration validated without printing values; tracked-source guard run before publication |
| Paid lifecycle | Not tested against stores/providers; accounts are not set up |

An initial contrast test exposed a dark-theme button ratio below 4.5; the token was corrected and the contrast test passed. A service-role assertion initially failed because the isolated test harness lacked permission to use the test schema; test-only privileges were corrected. Neither failure was hidden as a passing result.

Compatible dependency remediation removed one additional high advisory. The final measured npm audit still reports **27 findings: 9 high, 18 moderate, 0 critical**, primarily inherited SDK/toolchain dependencies. No forced Expo major upgrade was applied. This is still a release gate, not a clean security bill of health.

Hosted advisors reported no ERROR-level findings at the checked checkpoint, but did report intended authenticated RPC/schema surfaces, unused indexes, and disabled leaked-password protection. Revoke unnecessary exposure, retain indexes justified by future workload rather than deleting solely because they are currently unused, and review the remaining Auth protection before public launch. References: [authenticated GraphQL schema exposure](https://supabase.com/docs/guides/database/database-linter?lint=0027_pg_graphql_authenticated_table_exposed), [security-definer RPC review](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Remaining release gates — do not mark completed

1. Restore the full Xcode/Simulator app; execute the Golden UI task oracles on populated native screens. VoiceOver/TalkBack, dark/light, maximum text, keyboard, focus return, reduced motion, touch targets, narrow phones and tablets need direct evidence and human acceptance.
2. Finish durable offline commands, conflict-resolution UI, scoped local-data retention and restart recovery. Failed drafts are retained in the current screen; this is not a durable offline queue.
3. Complete remaining recurrence/series capabilities, pagination/history, consistent stale-state handling in every account/wallet screen, and legacy UI migration/bundle reduction.
4. Implement/configure push delivery, quiet hours, receipt retries and token cleanup; finish media preprocessing, idempotent uploads, orphan cleanup and verified deletion.
5. Complete auth/provider/onboarding/Storage/Realtime two-device E2E, concurrent role/removal/write races, dependency remediation, security review, restore drill, load/quota tests and monitored release rollback.
6. Approve support/privacy/terms/child-data/retention policies and store disclosures; configure the three commercial accounts. Validate paid-feature value with pilot households before expanding paid acquisition.
7. Deploy and qualify billing functions with secrets stored server-side, approved store products/prices and real sandbox lifecycle tests. Keep `EXPO_PUBLIC_BILLING_ENABLED=false` until **all** paid gates are passed.

These are concrete remaining tasks. They are not all unavoidable external blockers, and this phase must not be described as finishing the entire 96-item improvement backlog.

## Next launch command

After restoring the full Xcode app:

```sh
rtk proxy npm --prefix /Users/haewonkim/home/development/homehuddle/HomeHuddle run ios:simulator
```

For detailed setup, expected behavior and a short test walkthrough, use [the iPhone Simulator guide](../iphone-simulator.md).
