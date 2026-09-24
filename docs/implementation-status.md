# Implementation status

## Current checkpoint — September 23, 2026

The [SDK 57 upgrade](sdk-57-upgrade.md) supersedes the earlier SDK 54 runtime evidence. Use [iPhone + Expo Go over Wi-Fi](iphone-expo-go.md) for the no-cable preview. React Native is now 0.86.3, React 19.2.3, and minimum iOS is 16.4. Core behavior is preserved; paid checkout remains disabled in Expo Go.

See [Native implementation and release-gate handoff](product/HomeHuddle-Native-Implementation-Handoff-2026-09-23.md) for the current evidence: five-tab production UI, shared interaction/theme improvements, recurring chores, disabled-by-default server-verified billing, 60 app tests, 76 database assertions, successful native PostgreSQL and iOS simulator-target compilation. [Run on iPhone Simulator](iphone-simulator.md) provides the streamlined Mac command and the missing-Simulator.app prerequisite.

The owner confirms App Store Connect, Google Play Console and RevenueCat are not set up. No paid checkout or app-store release is enabled. The full design backlog is **not** complete: offline commands, push delivery, media lifecycle, device/visual/human qualification and the listed commercial/operations gates remain.

The remainder of this file is preserved **historical September 15 evidence**, not current pass/fail status.

## Historical checkpoint — September 15, 2026

Local date America/Chicago; hosted migrations September 16 UTC.

Publication update, September 16: a private GitHub repository has been created at kimhw8084/homehuddle, with main based on a clean snapshot of this implementation. The original checkpoint evidence below is historical; see GitHub Actions for current hosted CI results and [Git workflow](git-workflow.md) for preserved local history.

UI assessment update, September 23: [Golden UI qualification review](product/HomeHuddle-Golden-UI-Qualification-Review-2026-09-23.md) records the reference-tree review and remaining source/interaction/platform/visual/human gaps against c7af0ab. Application and native PostgreSQL jobs in [the September 16 CI run](https://github.com/kimhw8084/homehuddle/actions/runs/35087548890) were rechecked as successful. No new rendered/native/human UI acceptance was established by the September 23 assessment; its planned fixes are not implemented by the document update.

## Outcome

A persisted, tested household core replaces local prototype behavior for signed-in users. This is a substantial **engineering preview**, not completion of the whole design roadmap or a certified public/paid production release.

## Implemented

- Production home/review, chores, household/meal, shopping, market and wallet screens; prototypes preserved under features/demo/screens with explicit dev-only routing.
- Stable member identities; empty real-household initialization; account-switch/sign-out reset.
- PKCE/callback deduplication, session error/retry UI, verified-membership routing and invite continuation.
- One-shot chore UUID creation/versioned editing, assignment, civil date, notes, proof, completion, adult review/rejection/resubmission and archival.
- Atomic points/purchases, zero-point correctness, immutable purchase terms, persistent purchase retry IDs, changed-price confirmation and actor permissions.
- Shared shopping: fractional quantities, conflict checks, purchased/archive/undo, refresh and failed-draft retention.
- Recipes/instructions/ingredients, seven-day dinners/cooks, non-overwriting weekly reuse and deduplicated grocery generation.
- Transaction-consistent snapshot; serialized/coalesced refresh; reconnect/foreground recovery and stale-response protection.
- Private proof MIME/size checks and batched signed URLs; soft member removal; adult-only ownership; PIN exclusion.
- Tenant FK/RLS/privilege fixes, covering indexes and shared notification-trigger bug correction.
- Environment validator, pinned Supabase client, compatible dependency remediation, database runners, CI and operations documentation.
- Existing free hosted project resumed; three forward migrations applied; existing counts preserved and role-scoped snapshot checked. No paid services purchased.

## Evidence

| Check | Result |
|---|---|
| TypeScript | Passed |
| Jest | 13 suites / 39 tests passed |
| PostgreSQL/WASM | Full migration chain / 43 assertions passed |
| Whole repo lint | Zero errors; 428 legacy warnings at last full run |
| Production feature lint | Zero warnings/errors |
| Environment validator | Passed without printing secrets |
| Expo alignment | Passed |
| Web export | Passed; entry approximately 4.47 MB versus baseline 5.25 MB |
| Hosted preservation | Exact before/after aggregate counts unchanged |
| Hosted access | Internal helper closed, anonymous snapshot denied, PIN hidden, all public tables RLS, authenticated snapshot readable |
| FK advisor | All 10 uncovered-FK findings resolved |
| Local native PostgreSQL | Not passed: installation/toolchain stalled |
| Hosted CI | Not run: repository not published |
| Visual/native QA | Not completed: computer-use service unavailable |
| Auth/Storage/Realtime E2E | Not completed; hosted verification read-only |

Compatible updates removed the initial two critical advisories. Last npm audit still reported **25: 10 high, 15 moderate, zero critical**. This remains a release gate. Most remaining findings involve Expo 54/toolchain dependencies; upgrading needs a dedicated native compatibility pass.

## Remaining implementation, not merely credentials

1. Durable offline commands, conflict recovery and local-data policy.
2. Real recurring occurrence engine, household timezone/DST, routine templates and exception editing. Current production UI is one-shot.
3. Server-authoritative paid entitlement/webhook/checkout lifecycle; RevenueCat scaffolding alone is not monetization.
4. Push delivery worker, quiet hours, receipt/retry deduplication and invalid-token cleanup. Event rows are not delivered notifications.
5. Media preprocessing, upload retry identity, orphan retention worker and verifiable storage erasure.
6. Lifetime history pagination, richer audit trails, recipe/dinner archive management and normalized ingredient quantity merging.
7. Atomic onboarding under lost responses; broader legacy account/reward command idempotency and role/removal race coverage.
8. Two-device E2E, native race/load tests, security review, restore drill and quota/latency/error monitoring.
9. Full design-system migration, accessibility/responsive/reduced-motion review, legacy warning cleanup and further bundle splitting.
10. Approved legal/support/privacy content, child-data decisions, retention analytics and paid-feature validation.

## External decisions/prerequisites

- GitHub publication uses a private clean snapshot; historical branches remain local. Verify main's remote commit and current CI checks before release.
- Confirm SMTP, email template, OAuth providers and callback URLs using owned test accounts.
- Supply native build/signing/store setup and physical-device QA; no store release made.
- Configure store products, provider account/webhook secrets and approved commercial offer; no charges/subscriptions created.
- Approve privacy/terms/support, retention/child-data policy and deletion expectations.

## Backups and machine effects

Original history/worktree and a pre-migration hosted application-row/schema snapshot were copied into a private durable local backup directory outside the repository. Bundle verification and archive checksum comparison passed. The snapshot excludes auth credentials and is not a full restore-tested database backup. Exact paths are in the handoff; backups were not published.

Docker startup failed; a PostgreSQL Homebrew installation partially completed and stalled. Only task-started processes were stopped, no unrelated service deliberately restarted. See operations.

## Next slice

Finish native/two-device/auth/storage validation and dependency remediation, then implement recurrence and durable offline commands with explicit conflict semantics. Pilot the verified core before claiming the entire design, charging for automation or scaling acquisition.
