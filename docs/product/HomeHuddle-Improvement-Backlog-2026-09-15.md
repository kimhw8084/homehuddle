# HomeHuddle — Current-State Review & Improvement Backlog

> Implementation update (September 15 local / September 16 UTC): the baseline findings below are preserved as the original review, not current pass/fail results. Persisted core workflows, auth/sync/integrity fixes, directory separation, tests and hosted forward migrations have since been implemented. See [implementation checkpoint](HomeHuddle-Implementation-Checkpoint-2026-09-15.md) for evidence and incomplete release gates. Backlog acceptance criteria remain binding; a partial implementation does not automatically close an item. GitHub publication is still pending the history/visibility decision.

Version 1.0 · September 15, 2026

Based on [HomeHuddle Product Design, Architecture & Production Plan](HomeHuddle-Project-Design-and-Production-Plan-2026-09-15.md), referred to below as **Design**.

## 1. How to use this backlog

The current project contains an ambitious interface and a partial shared backend. The highest-return work is to make its core household loop reliable, then connect planning, chores and groceries so users do less work. This backlog contains **96 actionable improvement items and 25 expansion experiments**, covering functionality, UI/UX, backend, performance, operations, directory organization, Git and monetization.

**Nothing in this file is a claim that a listed fix has been implemented.** Existing source edits were preserved. The deliverables from this review are the two documents. GitHub synchronization is unresolved: the target repository lookup returned 404 under `kimhw8084`, and the local repository has no remote.

Baseline: app/Git root `/Users/haewonkim/home/development/homehuddle/HomeHuddle`; detached `91f50ea`; local main `dcf30b3`; 302 commits unique to HEAD and seven unique to main; 22 modified tracked paths and ten untracked entries. The structural inventory covers 82 first-party JS/TS/TSX files and approximately 30,805 lines, plus SQL/config/history review.

Validation: TypeScript passed. Jest passed 19/21 tests; the two failures concern OTP mocks missing the returned session object. Lint reports 57 errors and 415 warnings, including ten Rules of Hooks errors. Web export passed and emitted an approximately 5.25 MB uncompressed entry bundle. No hosted database migration, live authorization test, customer data mutation, native UI validation, purchase, deployment or hosted load test was run.

### Labels

- **Observed:** directly supported by source, repository state, or executed local checks.
- **Inferred:** a probable runtime consequence of reviewed code/SQL, awaiting isolated verification.
- **New:** a proposed product or engineering capability.
- **P0:** blocks safe/credible external launch or preservation of work.
- **P1:** necessary for the useful, complete v1 product.
- **P2:** important improvement after core contracts stabilize.
- **P3:** experiment or later expansion, requiring evidence before implementation.

Effort is a rough engineering sizing band, not a quote: **XS** ≤0.5 day, **S** 1–2 days, **M** 3–5 days, **L** 1–2 weeks, **XL** split into multiple deliverables. It excludes external approvals, legal review and unusual data recovery. Items overlap; do not add their estimates mechanically.

IDs are stable planning references, not existing Linear/GitHub issue numbers. Acceptance criteria describe completion. Every UI feature includes persistence, authority, error/offline state, and verification when relevant.

## 2. First execution order

| Order | Deliverable | Backlog IDs | Why first |
|---:|---|---|---|
| 1 | Preserve current work and establish repository/schema truth | GIT-01–04, DB-01–02 | Prevent losing work or deploying the wrong migration lineage |
| 2 | Restore meaningful green checks | QA-01–03 | Gives subsequent refactors a trustworthy baseline |
| 3 | Fix identity, access and data lifecycle boundaries | AUTH-01–05, DB-03–06, DATA-01–02 | Shared data must belong to the right user/household |
| 4 | Complete durable task/points/reward loop | TASK-01–06, ECON-01–04 | Makes existing main features usable for signed-in households |
| 5 | Deliver weekly planning and shopping | SHOP-01–04, MEAL-01–04 | Strongest subscription value: removing repeated planning work |
| 6 | Complete notifications, billing and recovery | OPS-01–04, BILL-01–04, PRIV-01–03 | Required before charging for a dependable service |
| 7 | Refine and expand based on usage | UX items, GROW items, EXP items | Polish and growth should reinforce validated workflows |

UI primitives and module extraction accompany these slices. Do not turn the list into a simultaneous rewrite of every screen. Design sections 15 and 18 define release gates and milestones.

## 3. Git, repository synchronization and organization

### GIT-01 — Preserve the detached working state

**P0 · Observed · S · Design §17.** The active commit is detached and substantial account/backend changes are uncommitted. Attach it to a uniquely named recovery branch and create a verified local backup including untracked source; a Git bundle alone is insufficient for dirty work. Review `.claude/` and private transcripts separately before publication.

**Done when:** all intended work is recoverable from an attached branch plus verified local backup, with no unrelated files deleted or overwritten. No automatic blanket staging.

### GIT-02 — Reconcile the two local histories

**P0 · Observed · M · Depends GIT-01.** HEAD has 302 unique commits; main has seven unique commits concerning Home layout/cards/automation/widget styling. Compare their behavior in an isolated worktree and merge or reapply valuable changes deliberately.

**Done when:** each main-only change has a recorded retain/superseded decision, conflicts are resolved, and current intended behavior passes checks. No force-reset or silent loss of either history.

### GIT-03 — Resolve the intended GitHub destination

**P0 · Observed external prerequisite · XS–S · Design §17.** GitHub CLI identifies `kimhw8084`, but repository GraphQL lookup fails and REST returns 404 for `kimhw8084/homehuddle`; no matching repository was returned by the inspected list.

**Done when:** owner/repository existence, access and visibility are confirmed. If absent, create it only with the chosen visibility; if existing, inspect its history first. A 404 alone does not distinguish absence from access restrictions.

### GIT-04 — Synchronize verified history without overwriting remote work

**P0 · New · S–M · Depends GIT-02/03, QA baseline.** Configure origin only after verification, fetch and compare, publish a review branch, reconcile remote history if present, and establish upstream tracking.

**Done when:** intended local branch and remote branch have identical commit IDs, zero ahead/behind, a clean intended worktree, passing CI, and preserved required history. Deployment/database version alignment is recorded separately.

### GIT-05 — Maintain canonical documentation in Git

**P1 · New · S · Design §§16–17.** The requested iCloud documents are currently external deliverables. Put approved copies under `docs/product/` during repository cleanup and designate one canonical editing location.

**Done when:** design, backlog and concise architecture decisions are versioned; exported iCloud copies include version/date/checksum; no two independently edited specifications compete.

### ORG-01 — Establish one clear project root

**P1 · Observed · S.** The outer folder is not the Git root, which makes commands and tool assumptions error-prone. Update contributor instructions and workspace configuration to the actual root first. Evaluate flattening later as a dedicated move.

**Done when:** a new developer can identify the root immediately, install and run from README, and CI uses the same paths. No incidental `.git` move.

### ORG-02 — Split monolithic feature routes incrementally

**P1 · Observed · XL · Design §16.** `chores.tsx` is 6,844 lines; Home is 3,622; Market 2,008; Wallet 1,784; weekly meals and games are each about 2,000. They mix domain logic, forms, motion, data calls and layout.

**Done when:** route composition delegates to coherent feature modules; recurrence/ledger/merging rules are independently testable; changed flows retain behavior. Extract by responsibility, not arbitrary file length.

### ORG-03 — Separate domain, server state, UI state and demo fixtures

**P1 · Observed · L · Depends DATA-01/02.** `store/huddleStore.ts` combines recipes, wallet, people, machines, automations, mock data and UI preferences. Introduce feature contracts, a server-state cache and an explicit demo provider.

**Done when:** every state field has a documented owner and persistence policy; production does not import live demo defaults; derived display state cannot overwrite server truth.

### ORG-04 — Archive historical code and remove starter clutter safely

**P2 · Observed · S–M.** Tracked `chores_split_aa`–`ae`, `claude.txt`, unused Expo starter components/assets, and obsolete SQL increase confusion and publication risk. Review content/references before archival/removal. Keep worthwhile product history readable.

**Done when:** active source tree contains only current executable code/config/assets; history is recoverable in Git or a reviewed archive; secrets/private notes are excluded from publication. Record what was moved or removed.

### ORG-05 — Replace the generic README and ambiguous scripts

**P1 · Observed · S.** README is the Expo starter text and advertises `reset-project`. `scripts/seed.ts` targets old schema and prints an unverified explanation about auth rate limits.

**Done when:** README covers setup, environment values, demo versus real data, local database, checks, folders and deploy boundaries. Scripts have narrow names and explicit environment guards; historical reset/seed material cannot be mistaken for production setup.

### ORG-06 — Document toolchain and dependency policy

**P2 · Observed/New · S.** Pin/test a supported Node/npm version, use `npm ci`, maintain lockfile, and isolate dependency upgrades. Evaluate deprecated or redundant animation/media dependencies when their feature is touched.

**Done when:** clean setup is reproducible, CI matches local tooling, and an SDK upgrade has a compatibility checklist rather than being bundled into a feature rewrite.

## 4. Authentication, identity and privacy

### AUTH-01 — Preserve stable member identity end to end

**P0 · Observed · L · Design §§7–8.** `lib/household-adapters.ts:7` drops member IDs and maps owner into Parent; screens resolve people by display name. Preserve member ID, auth ID, household ID and actual role. Use names only for rendering.

**Done when:** duplicate names and renames do not alter assignment, credits, votes, wallet ownership or permissions; owner controls remain distinguishable from parent controls.

### AUTH-02 — Make session initialization and callbacks recoverable

**P0 · Observed/Inferred · M.** `app/_layout.tsx:19` lacks a rejection recovery path for initial session loading; deep-link errors are swallowed. `signInWithProvider` expects an authorization code while client flow configuration should be verified against that expectation.

**Done when:** fresh install, cold/warm callback, cancelled OAuth, expired link, failed storage/network and session refresh have clear states; browser and native flows are verified with the configured callback protocol. No indefinite gate.

### AUTH-03 — Replace global onboarding completion with account-aware routing

**P1 · Observed · M.** Onboarding persistence is one boolean; backend membership is discovered later; completion retry reconciliation uses names. Preserve create/join intent and account-specific drafts, and make membership the authoritative routing input.

**Done when:** returning account, new account, missing membership and lookup failure are distinct; retry does not duplicate households/children; a second same-named child remains a separate person.

### AUTH-04 — Make invitation acceptance a link-based journey

**P1 · Observed/New · M.** `app/onboarding/accept-invite.tsx` asks for a raw token; invitation state needs to survive login. Add safe link parsing, role/household context, expiry/revocation/reissue and wrong-account recovery.

**Done when:** an invited person can join from a link without copying technical tokens; acceptance is atomic; invitation details are visible only to appropriate administrators/recipients.

### AUTH-05 — Enforce one v1 membership and adult-only ownership

**P0 · Observed/Inferred · M · Depends DB-03.** Current create/join rules do not consistently enforce one household; `getMyHouseholdId` takes one match. Ownership transfer currently accepts a teen. Implement the chosen adult owner and membership invariants.

**Done when:** concurrent create/join/transfer attempts leave one consistent active membership and exactly one adult owner; account routing is deterministic; member removal cannot strand the household.

### AUTH-06 — Design shared-device access before exposing kiosk mode

**P2 · New · L.** Legacy specifications describe a PIN/profile switch, but changing local identity is insufficient access isolation. Use a restricted server session and an adult unlock/revocation process.

**Done when:** a child-scoped session cannot access adult administration or another member’s balance/actions; expiry, attempt limits, reset and device revocation work. Until then, do not market secure kiosk mode.

### PRIV-01 — Complete export and deletion across every domain

**P0 for paid launch · Observed · L · Design §11.** Current exports share raw JSON, omit several domains, and may expose internal member fields through broad serialization. Account deletion retains member data and does not demonstrate full storage/provider cleanup.

**Done when:** allowlisted structured export is downloadable; personal/household scope is distinct; deletion jobs remove or appropriately anonymize data/media and report completion; retained shared history and backup expiry are explained.

### PRIV-02 — Define child-feature privacy and consent policy

**P0 for child-facing launch · Observed/New · External review + M.** Teen age confirmation and adult-created child records are not a complete policy. Minimize age/photo collection and evaluate applicable obligations for the actual product/jurisdiction.

**Done when:** launch audience, notice/consent, guardian controls, deletion and retention are reviewed and implemented; no child-targeted sales/analytics leakage. See Design §11 and its FTC source.

### PRIV-03 — Finish media ownership and lifecycle

**P1 · Observed · M–L.** `lib/household-proofs.ts` uploads raw buffers with inferred type and timestamp paths; proof paths are not a full asset lifecycle. Add byte/type limits, compression, metadata, authorized attachment, expiry and orphan cleanup.

**Done when:** oversized/invalid assets fail clearly, legitimate private proofs load on demand, old signed URLs refresh, retained objects follow policy, and media cleanup/restore are verified independently from database backups.

### PRIV-04 — Minimize sensitive household data and logging

**P1 · Observed/New · S–M.** Demo family content includes Wi-Fi credentials and unnecessary sensitive-widget concepts. Define an analytics/logging allowlist and exclude content, tokens and media links.

**Done when:** release bundles contain no private example data; logs are useful without household text/email/photo content; sensitive future features require their own design decision.

## 5. Database and backend correctness

### DB-01 — Establish one canonical deployable schema

**P0 · Observed · M · Design §7.4.** Migrations, `schema.sql`, `phase3_schema.sql`, and seed code disagree. The first migration is explicitly destructive. Inventory deployed versions read-only, then rehearse fresh and upgrade paths on disposable data.

**Done when:** production deployment has an unambiguous forward migration path; historical reset/public-storage scripts are excluded from ordinary execution; fresh install and upgrade tests agree with generated types.

### DB-02 — Verify and repair helper execution permissions

**P0 · Inferred from SQL · M.** `20260818014647_restrict_core_rpc_execution.sql` broadly revokes function execution and only regrants RPCs; read policies call helpers not listed. This can break authenticated reads after the final migration.

**Done when:** a clean local migration run supports intended app-role reads and denies unauthorized scopes; helper/API permissions are explicit and minimal. Verify behavior, not just function existence. Deployed state is currently unknown.

### DB-03 — Implement action-level authorization consistently

**P0 · Observed/Inferred · M–L.** Core completion and reward functions do not fully encode self versus parent-on-behalf policy. Derive actor from session, check active role, subject and household, and keep entitlement checks server-side.

**Done when:** the Design §8 role matrix is enforced for each command; UI and backend agree; removed members lose access promptly. Use isolated synthetic permission tests, without live probing.

### DB-04 — Add idempotent commands and atomic results

**P0 for launch · Observed/New · M–L.** RPCs lack a uniform operation key/result contract. UI disabled states alone cannot resolve timeout retries or concurrent actions.

**Done when:** a repeated operation returns its original committed result, conflicting reuse is rejected, and simultaneous review/purchase/routine actions preserve invariants. Adopt the common receipt/error/version contract in Design §9.

### DB-05 — Resolve zero-point approval and rejection/resubmission conflicts

**P0 · Inferred from constraints · M.** Chores permit zero points, while `point_ledger.amount` forbids zero. Approval inserts an award unconditionally. A rejected completion still occupies the unique chore/date key, with no resubmission command.

**Done when:** a zero-point chore approves without an invalid ledger insert; a requested-change submission can be retried with preserved history and only one eventual award.

### DB-06 — Make removal and closure compatible with history

**P0 for account lifecycle · Inferred · M.** Direct member deletion interacts with restrictive ledger/completion foreign keys; ownership/invite references complicate account deletion. Prefer deactivation/archive for routine member removal, and a deliberate purge workflow for deletion.

**Done when:** members with historical activity can leave/be removed without corrupting records; owner transfer/closure and deletion complete under representative fixtures; access ends immediately even when history is retained.

### DB-07 — Add cross-household integrity constraints and versioning

**P1 · New · M.** Repeated household IDs need consistent relation checks; mutable entities need conflict detection. Add composite integrity where appropriate, explicit actor/subject references, version columns and constraint coverage.

**Done when:** impossible relation combinations are prevented at the data layer; concurrent edits return a typed conflict; stable IDs survive all UI adapters.

### DB-08 — Make queries bounded and history complete

**P1 · Observed · M.** Bootstrap uses unbounded chores plus independent 100-row history limits. Add page/cursor contracts, date-window queries and targeted indexes. Fetch submitted approvals and available inventory independently of history pagination.

**Done when:** a household with thousands of records can reach older history, still see every pending approval/available reward, and load Today without the entire database slice. Query plans demonstrate the intended indexes.

### DB-09 — Replace schema-presence checks with behavioral checks

**P1 · Observed · M.** `phase1_staging_checks.sql` checks selected functions/RLS/grants but cannot prove command semantics, helper grants or isolation.

**Done when:** fresh and upgrade CI run synthetic membership, recurrence, points, removal and outbox behavior checks; success means usable contracts rather than matching names.

## 6. State, synchronization and performance

### DATA-01 — Eliminate production demo data and cross-account residue

**P0 · Observed · M.** `huddleStore` starts with recipes/groceries/family widgets and other samples; bootstrap overwrites only selected domains. `authStore.signOut` resets auth/onboarding, not household state.

**Done when:** empty authenticated households show real empty states, no prior household remains after account switch, drafts/cache are namespaced, and explicit demo mode is isolated from production repositories.

### DATA-02 — Adopt one server-state owner with coherent updates

**P1 · Observed/New · L.** The snapshot adapter sets several store slices separately; many screens independently reload whole snapshots. It also does not update the Market catalog from `snapshot.rewards`, so the shared realtime refresh path does not itself refresh that catalog. Introduce account/household-scoped query ownership and shared command result updates.

**Done when:** one mutation has one authoritative cache path, related updates render coherently, and old asynchronous responses cannot overwrite new account/household data.

### DATA-03 — Recover from realtime gaps and refresh races

**P1 · Observed/Inferred · M.** Bootstrap debounces table refreshes but concurrent batches can build from stale snapshots; connection status is logged without robust reconnect reconciliation. A refresh error can replace the app with a gate.

**Done when:** disconnect/reconnect, background/foreground, rapid mixed-table events and member removal converge to server state; cached views remain usable with a freshness message during transient errors.

### DATA-04 — Add a durable offline operation queue

**P1 for shopping · New · L.** The current in-memory store is not an offline persistence strategy. Queue explicit set/add operations with IDs and versions for low-risk actions; keep sensitive operations online.

**Done when:** grocery edits survive app termination and reconnect, retries do not toggle items twice, account switch cannot send another account’s queued commands, and conflicts have a clear resolution UI.

### PERF-01 — Remove proof-signing amplification from bootstrap

**P1 · Observed · M.** `household-data.ts` signs up to two media URLs per loaded completion, including records not currently viewed. Move signing/loading to visible proof requests with bounded caching.

**Done when:** ordinary Today load does not issue per-history-photo signing calls; a visible proof loads/reloads correctly after expiry; failed media does not prevent other household data from rendering.

### PERF-02 — Reduce initial web and heavy-screen work

**P2 · Observed · M–L.** Exported entry is about 5.25 MB uncompressed. Games/charts, broad store subscriptions and many timers add work. Measure compressed payload, parsing and screen interaction before choosing an optimization.

**Done when:** optional heavy features defer work until opened, core lists remain responsive on reference devices, measured startup budgets pass, and no optimization sacrifices accessibility.

### PERF-03 — Replace date-string and locale assumptions

**P1 · Observed · M–L.** Adapters slice UTC date strings; chore creation uses local noon; display-formatted dates enter wallet state; recurrence exists in a large route and utilities.

**Done when:** date-only versus instant semantics are explicit, time zones/DST/month-end/count/until tests pass, sorting uses machine values, and preview matches generated occurrences.

## 7. Core tasks, points and rewards

### TASK-01 — Introduce templates and independent occurrences

**P1 prerequisite to reliable recurrence · Observed/New · L.** Current backend stores one status on a chore, while the UI projects recurring instances. Split template from occurrence and maintain stable date/slot identities.

**Done when:** approving Tuesday’s task does not complete next Tuesday’s task; recurrence generation is duplicate-safe; history survives future-series edits. See Design §5.1.

### TASK-02 — Finish signed-in task edit/delete/reschedule/assign

**P1 · Observed · L · Depends TASK-01, DB-03/04.** `chores.tsx` explicitly displays “Not available yet” for these central actions. Add reviewed server commands and bind existing controls to them.

**Done when:** each supported action persists across restart/two devices, respects role and version, has pending/error/undo policy, and handles one-instance versus future-series scope.

### TASK-03 — Preserve accurate submission and review status

**P1 · Observed · M.** `toChore` maps submitted and approved to completed and drops review context. Model waiting review, needs changes and approved separately, with reviewer notes and attempts.

**Done when:** task list, inbox, history and wallet tell the same story; submitting does not promise points; requested changes can be acted on immediately.

### TASK-04 — Make quick add and bulk actions honest and efficient

**P1 · Observed/New · M.** Quick-add/editor logic is duplicated between `chores.tsx` and `ChoreModals.tsx`; bulk behaviors mix local/server paths. One validated contract must power all entry points.

**Done when:** common task creation needs minimal input, advanced options are optional, errors preserve drafts, and bulk results show successes/failures without silently partially applying an ambiguous operation.

### TASK-05 — Implement routine reuse and safe linked restocking

**P1 Plus value · Observed/New · L.** Home automations and linked restock concepts exist locally, including an unimplemented editor. Persist versioned routines with preview, unique run IDs and editable results.

**Done when:** a household reuses a weekly routine without duplicate chores/items, can edit/pause it, and sees what each run changed. No external spending occurs automatically.

### TASK-06 — Add vacation/illness exceptions with humane defaults

**P2 · Observed/New · M.** A local vacation state exists, but scheduling/points/streak rules need durable exceptions. Show affected tasks and let an adult choose pause, reassign or keep.

**Done when:** return dates restore intended schedules, missed paused days do not create punitive streak breaks, and the same plan is visible on every device.

### TASK-07 — Persist fair assignment and optional game results

**P2 · Observed · M–L.** Games calculate locally and write an in-memory audit log; IDs/names and displayed game definitions also need a consistency review. Record a single eligible assignment result on the server and animate it.

**Done when:** replay/close/retry does not redraw the assignment, adult overrides have reasons, accessibility offers a no-animation path, and work distribution uses effort/availability rather than raw task count.

### ECON-01 — Make ledger history and balances authoritative

**P0/P1 · Observed/New · M.** Wallet balance is represented as `stats.pointsEarned`, mixing a net balance with an earned-total concept. Introduce distinct balance, lifetime earned, pending and spent values from validated sources.

**Done when:** the balance equals ledger-derived totals, duplicate approvals cannot award twice, charts do not use synthetic history for signed-in users, and a reconciliation report can explain discrepancies.

### ECON-02 — Align catalog UI with server-supported reward fields

**P1 · Observed · M.** Market edit/delete/stock/sale controls update local state, while purchase uses server base cost and adapters default away richer fields. Either implement each field fully or remove its production control.

**Done when:** displayed price/stock/eligibility match the server quote and final debit; edits persist and sync; unsupported discounts never appear as a charged-price promise.

### ECON-03 — Snapshot purchased reward terms

**P1 · Observed/Inferred · M.** Inventory display joins active rewards and current catalog price/title. Archived rewards or changes can remove/misrepresent prior purchases.

**Done when:** a purchased item retains its original title, paid points and expiry policy after catalog edit/archive; available inventory is not lost behind a 100-record history cap.

### ECON-04 — Complete redemption/refund semantics before gifting/goals

**P1 · Observed/New · M.** Redemption exists, but some notes are local, resell/gift are blocked, and ledger uniqueness needs a deliberate refund model. Use explicit legal transitions and compensation entries.

**Done when:** redemption occurs once; permitted refunds reverse the correct purchase once; notes/history persist; goals and gifting remain unavailable until their own balanced, authorized contracts exist.

### ECON-05 — Simplify the first rewards experience

**P2 · New · M.** Combine Wallet and Market into a coherent Rewards destination with optional household points. Remove financial-return language and prioritize earned privileges/time together.

**Done when:** an adult can set up three meaningful rewards quickly, a teen understands earn/buy/use, and an all-adult household can disable the entire reward layer without losing core planning.

## 8. Shopping, meals and household coordination

### SHOP-01 — Persist and synchronize the shopping list

**P1 · Observed · L · Depends DATA-02/04, DB-03/04.** `restock.tsx:817` reads/writes only the local household store. Introduce lists/items/events with stable IDs, household rules and sync.

**Done when:** two adults can edit/check items concurrently, lists survive restart, offline pending changes are clear, and one device’s stale list cannot overwrite another’s additions.

### SHOP-02 — Add quantity-aware deduplication and pantry review

**P1 · Observed/New · M.** The local classifier is useful, but item entry floors quantity to one and ingredients are strings. Permit decimal quantities and compatible-unit consolidation, with confirmation for ambiguity.

**Done when:** half-units work, duplicate compatible ingredients merge safely, incompatible units/variants stay distinct, and pantry confirmations prevent unwanted list additions. See Design §5.2.

### SHOP-03 — Make shopping mode fast and accessible

**P1 · Observed/New · M.** Preserve category/store grouping, but simplify one-handed check/add/undo, keep bought items available, and make drag optional. Offer an explicit trip completion and useful history.

**Done when:** a user can shop without opening item-edit dialogs for routine actions, large targets/keyboard/screen reader work, and store-specific views preserve shared truth.

### SHOP-04 — Learn reusable staples without requiring AI

**P2 · Observed/New · M.** Replace seeded fallback suggestions with transparent household purchase history and user-pinned staples. Suggest likely replenishment, never silently order products.

**Done when:** repeat purchases can be re-added in one action, dismissed suggestions stop recurring excessively, and users can correct categories/units and disable learned suggestions.

### MEAL-01 — Persist recipes and structured ingredients

**P1 · Observed · L.** `WeeklyMenuSection.tsx` and store recipes are local; ingredient strings lack quantity/servings semantics. Add household recipe ownership, ingredient rows, servings and optional source attribution.

**Done when:** recipes survive restart, permissions apply, quantities scale predictably, and third-party images/content have appropriate usage rights or are replaced with owned content.

### MEAL-02 — Use dated meal plans and server-controlled voting

**P1 · Observed · M–L.** Current menus use weekday keys and rollover logic that depends on device clock/app activity. Use week start, calendar date, plan version and explicit draft/voting/review/confirmed states.

**Done when:** a week advances without requiring a Monday app opening, year boundaries/time zones work, votes are unique by member ID, and confirmed history does not drift after recipe edits.

### MEAL-03 — Connect confirmed meals to shopping

**P1 Plus value · New · L · Depends MEAL-01/02, SHOP-01/02.** Generate an editable ingredient diff, combine quantities, account for pantry choices and preserve manually entered shopping items.

**Done when:** rerunning the same plan adds no duplicates, serving changes update the preview coherently, users can exclude items, and the list records where each generated item came from.

### MEAL-04 — Create “repeat last week” and a five-minute weekly plan

**P1 Plus value · New · M.** Reuse meals/routines, adjust availability, resolve missing cooks/tasks, and confirm a clear summary. This is the principal paid-value experiment.

**Done when:** returning pilot households can complete the workflow within five minutes in observed sessions; changes persist as one coherent plan version; user feedback confirms reduced coordination work.

### HOME-01 — Persist handoffs and availability

**P2 · Observed/New · L.** Legacy vision and Home UI imply shift coordination. Implement explicit available/away overrides and short handoff notes/checklists with optional acknowledgment.

**Done when:** adults can tell who owns the next action, an acknowledgment has a timestamp/actor, and reminders respect quiet hours. No location tracking is needed.

### HOME-02 — Persist machine states and run history

**P2 · Observed · M.** Home machines are local mutable objects. Introduce versioned state transitions and time-based reminders, labeled as user-reported.

**Done when:** simultaneous updates resolve predictably, run timers survive restart, history is useful, and the app never claims sensor-confirmed status without an actual integration.

### HOME-03 — Make announcements readable and actionable

**P2 · Observed · M.** Multiple decorative announcement styles exist, but state remains local. Prioritize audience, expiry, pinned importance and optional acknowledgment over additional animation styles.

**Done when:** announcements sync, expire correctly, are screen-reader friendly, and users can tell whether an important household message was acknowledged.

### HOME-04 — Consolidate secondary widgets under the routine model

**P2/P3 · Observed/New · M per selected slice.** Pets, deliveries, birthdays and goals duplicate state/interaction concepts. Reuse responsibilities, reminders and events where the semantics match.

**Done when:** only validated useful widgets ship, each has durable data and clear ownership, and Today remains focused. A decorative widget is not a reason to create a new backend subsystem.

## 9. UI and UX improvement program

### UX-01 — Reorganize six tabs into five task-oriented destinations

**P1/P2 · Observed/New · M · Design §4.** Current Home/Chores/Family/Wallet/Market/Restock navigation splits connected tasks. Test Today/Plan/Shop/Rewards/Household with existing users before migrating.

**Done when:** users find common actions quickly, old deep links route correctly, badges reflect real pending work, and each destination has a distinct purpose.

### UX-02 — Fix the shopping badge contract

**P1 · Observed · XS.** `app/(app)/(tabs)/_layout.tsx:10` looks for nested `cat.items[].needed`, while the store contains flat items with `isCompleted`. Use one typed selector for the intended pending count.

**Done when:** empty, active, checked and restored item states show the correct badge on every device, without `any` hiding the mismatch.

### UX-03 — Establish shared semantic design tokens

**P1/P2 · Observed · M.** Theme constants, CSS variables and per-screen palettes coexist; hard-coded light tab backgrounds undermine dark mode. Consolidate colors/type/spacing/motion and shared components.

**Done when:** representative screens match in light/dark themes, contrast is measured, and new UI does not invent parallel token sets. See Design §4.3.

### UX-04 — Make accessibility part of each core flow

**P1 · Observed/New · L across slices.** The major route files have no explicit accessibility properties in the structural scan; custom gestures and icon controls need review. Add roles/names/state, modal focus, keyboard alternatives, large-text support and announcements.

**Done when:** invite, task completion/review, grocery shopping and rewards work with screen reader/keyboard/reduced motion. Code scans alone do not establish compliance.

### UX-05 — Use truthful asynchronous states

**P1 · Observed · M.** Some success feedback precedes a durable result; a global loading gate can hide cached data after refresh errors. Standardize pending/committed/offline/conflict/error states.

**Done when:** users can distinguish saved, queued, submitted and approved; drafts survive errors; retry is available; no button reports persistence for a local-only action.

### UX-06 — Simplify Today around next actions

**P2 · Observed/New · M.** Home has many animated widgets and nested actions. Prioritize next tasks, approvals, tonight’s meal and urgent exceptions; make optional modules discoverable but quiet.

**Done when:** first-time and returning users locate their next action within ten seconds in usability sessions; empty/error states never resemble “all done” falsely.

### UX-07 — Unify forms, sheets and undo behavior

**P1/P2 · Observed · M–L.** Editors/calendars/undo rings are repeated. Use shared field validation, keyboard-safe sheets, accessible dismiss controls and recoverable changes.

**Done when:** forms are usable on small phones and 200% text, cancel/dismiss preserves or deliberately discards drafts, and restore remains available beyond a short toast where appropriate.

### UX-08 — Add adaptive layouts and long-content handling

**P2 · Observed/New · M.** Several layouts depend on captured window dimensions, portrait assumptions and small fixed labels. Test wide/tablet/web and long names/text.

**Done when:** layout responds to resizing/orientation, forms have readable widths, tablet views use available space, and content does not collide with safe areas or the keyboard.

### UX-09 — Reduce animation and haptic fatigue

**P2 · Observed · S–M.** Authentication uses gyroscope parallax and repeated animations; many controls vibrate. Keep feedback optional and purposeful, with reduced-motion paths.

**Done when:** sign-in is immediately usable, reduced motion disables nonessential movement, animation does not block actions, and background screens stop unnecessary work.

### UX-10 — Replace seeded statistics with useful household insights

**P1 for truthfulness, P2 for polish · Observed · M.** Wallet/family presentation combines seed history, computed UI stats and server balances. Show only defensible values, explain unavailable history, and emphasize useful workload/plan trends.

**Done when:** chart totals reconcile with actual records, time filters have clear bounds, and a new household sees guidance instead of fictitious achievements.

### UX-11 — Add household-wide search and fast capture

**P2 · New · M.** Search tasks, recipes and list items within authorized scope, with recent actions and templates. Start with indexed database queries; avoid an external search service initially.

**Done when:** users find common household content quickly, removed members cannot search it, and capture supports a short manual path before optional natural-language assistance.

## 10. Billing, monetization and growth

### BILL-01 — Wire an actual purchase and restore flow

**P0 for paid release · Observed · L.** `lib/billing.ts` exists without found configuration/purchase callers. Implement platform-supported checkout, logged-in identity binding, products, pending states and restore.

**Done when:** sandbox buy/restore/cancel/error journeys work on each shipped platform and the web path does not execute unsupported native purchasing code.

### BILL-02 — Reconcile provider events to server entitlements

**P0 for paid release · Observed/New · L.** An entitlement table exists, but no webhook receiver/reconciler was found. Implement verification, event deduplication/order handling and sponsor-household mapping.

**Done when:** renewal, billing issue, cancellation-until-expiry, expiration, refund and repeated/out-of-order events converge to correct server authorization. Client state cannot grant Pro.

### BILL-03 — Replace the blanket recurrence paywall with a capability catalog

**P1 · Observed/New · M.** Current migration requires Pro for any recurrence. Design proposes basic daily/weekly recurrence free and advanced scheduling/routines as paid convenience.

**Done when:** product limits are consistent across UI/backend, upgrade is available where offered, downgrades retain user data, and each premium prompt names the concrete time-saving feature.

### BILL-04 — Handle billing sponsorship and household transitions

**P1 · New · M.** Ownership transfer, sponsor departure and household closure need subscription semantics separate from family roles.

**Done when:** payer/beneficiary are clear, departing sponsors see cancellation/transfer options, entitlement is not duplicated, and another adult is never silently charged.

### GROW-01 — Validate the price and strongest paid workflow

**P1 · New · Research + S instrumentation.** Test the proposed $5.99 monthly/$49.99 annual household offer after users experience weekly reuse or connected shopping. The price is a hypothesis, not established demand.

**Done when:** at least ten pilot households voluntarily pay, reasons are recorded, cancellation is easy, and conversion is evaluated with retention/refunds rather than alone.

### GROW-02 — Instrument a privacy-preserving funnel

**P1 · New · M.** Track create/join, second participant, first task/review, weekly plan, repeated grocery use, upgrade and churn with safe event fields.

**Done when:** activation/retention/conversion cohorts are reproducible, no sensitive household content enters analytics, and events are not inflated by retries or duplicate devices.

### GROW-03 — Measure time saved with actual users

**P1 · New · Research.** Observe before/after planning and shopping tasks; use short optional surveys for reminder burden. Avoid claiming every completed chore equals time saved.

**Done when:** positioning and premium features are backed by observed workflow improvements, with limitations disclosed and poor-performing features revised or removed.

### GROW-04 — Introduce contextual onboarding and templates

**P2 · New · M.** Offer a small set of starter routines based on household type and explicitly selected needs, then adjust with feedback. Do not auto-populate a fake family.

**Done when:** time to first shared success improves without higher abandonment; templates remain editable, culturally flexible and inclusive of different abilities.

### GROW-05 — Add a simple adult referral loop after retention

**P3 · New · S–M.** A satisfied adult can share an invitation to try HomeHuddle; distinguish household-member invites from customer referrals. Any incentive is disclosed and bounded.

**Done when:** referred households activate and retain, fraud/cost is measured, and no contact scraping or unsolicited messages are needed.

### GROW-06 — Optimize annual conversion and cancellation learning

**P2 · New · S–M.** Offer annual plans with transparent total price after successful use. Collect an optional cancellation reason and allow downgrading without data loss.

**Done when:** contribution and retention improve without increased complaints/refunds; users can cancel as easily as they can find their subscription settings.

## 11. Operations, cost control and verification

### OPS-01 — Finish notification delivery and receipts

**P0/P1 for promised reminders · Observed · L.** SQL queues events and `notifications.ts` registers tokens, but no worker sends/reconciles them. Implement leases, preferences, quiet hours, retries, invalid-token cleanup and dead letters.

**Done when:** a real synthetic assignment/review reaches the intended device, failures recover without a notification storm, and stale/removed recipients are suppressed. In-app inbox remains available without push.

### OPS-02 — Configure production telemetry and useful alerts

**P0 for paid operation · Observed · M.** `runtime-metrics.ts` logs only in development. Add redacted error/crash capture, command latency, sync health, queue lag, auth outcomes and billing reconciliation metrics.

**Done when:** a staged synthetic incident produces an actionable alert with release/operation correlation and no sensitive content. An operator has a documented response path.

### OPS-03 — Implement and rehearse database plus media recovery

**P0 for paid operation · New · M.** Define backup schedule/retention/ownership; encrypt off-site exports if used. Database backups alone do not restore storage object bytes.

**Done when:** an isolated restore recovers representative tasks, balances, membership and retained media; actual RPO/RTO are measured. Free pilot recovery reflects the last successful manual/scheduled export, not an assumed SLA.

### OPS-04 — Add environment separation and controlled deployment

**P0 for production · Observed/New · M–L.** Current EAS configuration is minimal and migration lineage is ambiguous. Define local/staging/production variables, sandbox provider accounts, migration gates and artifact identity.

**Done when:** CI and developers cannot accidentally run tests/seed/reset against production, secrets remain server-side, and a release records commit/app/runtime/migration versions with a rollback path.

### OPS-05 — Monitor budgets and gate admissions

**P1 · New · S–M.** Implement measured DB/media/egress/realtime/email usage and month-end forecast. Design’s example household counts are not proven capacity.

**Done when:** alerts fire at staged thresholds, optional costly features can be limited, signups pause before the free path exceeds its envelope, and any paid upgrade has a specific measured trigger.

### OPS-06 — Make the $0 web path genuinely independent of paid services

**P1 for Path A · New · M–L.** Ship static web/PWA on a free subdomain, Google OAuth, shareable invites, in-app reminders, bounded/no proof media and deterministic planning. Avoid silently requiring SMTP/domain/store fees.

**Done when:** the pilot works using the documented zero-incremental-vendor-cost assumptions; browser limitations are visible; no checkout, paid AI, SMS or native store account is required.

### OPS-07 — Build the economical paid deployment with explicit extras

**P1 for Path B · New · M.** Configure managed production, email/domain and appropriate recovery. Keep paid build/monitoring/extra compute optional until justified, and account for staging separately.

**Done when:** a real budget worksheet covers fixed costs, provider variable fees, native registration, backups and support; bills/forecast stay inside the approved ceiling; quality is not inferred from buying a plan.

### OPS-08 — Finish release support and public-facing essentials

**P1 · Observed/New · M.** Verify real terms/privacy/help links, support ownership, owned artwork, store declarations, signing, age rating and release notes.

**Done when:** customers can get help, export/delete/cancel, and understand offline/points/media policies; store review materials use synthetic data and match shipped behavior.

### QA-01 — Repair the OTP test contract and expand meaningful auth coverage

**P0 · Observed · S.** The two current failures occur because `verifyOtp` mocks return only `{error:null}` while code reads `data.session`. Fix fixtures to represent provider responses and assert the returned session and fallback behavior.

**Done when:** tests cover success, fallback, invalid code and accepted-without-session handling; all 21 existing tests pass or are deliberately revised with evidence. A passing mock test is not treated as proof of real email deliverability.

### QA-02 — Resolve hook-rule errors before cosmetic lint debt

**P0 · Observed · M.** Lint includes ten Rules of Hooks errors, ten display-name errors, 36 unescaped-entity errors, and a malformed inline rule-disable comment at `chores.tsx:4477` that ESLint interprets as an unknown rule. Warnings include 120 effect/callback dependency warnings.

**Done when:** hook placement and stale closures are reviewed behaviorally, errors are fixed without blanket disabling, and affected controls have focused regression verification. Clear simple formatting warnings separately.

### QA-03 — Add a green CI baseline

**P0/P1 · Observed/New · M.** No CI workflow is in the inspected tree. Run locked install, typecheck, tests, lint, export, and database contract checks where applicable.

**Done when:** a pull request cannot be mistaken for ready with failed required checks, exact artifacts map to commit IDs, and a clean checkout reproduces the result.

### QA-04 — Add domain and two-device acceptance coverage

**P1 · Observed/New · L.** Nine mostly small test suites do not cover recurrence, local-only domains, real database policy/transactions or native interactions.

**Done when:** the Design §15 critical workflows pass with synthetic data, including concurrent approvals/purchases, role transitions, reconnect/offline, export/deletion and subscription lifecycle.

### QA-05 — Improve load and recovery evidence

**P2 · Observed/New · M.** The existing k6 script measures six reads for one account/household; it omits proof signing, writes, multiple households, sync and notification work.

**Done when:** a bounded authorized staging workload represents actual usage and data sizes; latency/cost/headroom and recovery results support admission decisions. No production stress test is needed to establish this baseline.

### QA-06 — Run observed usability and accessibility sessions

**P1/P2 · New · Research + fixes.** A compiling visual prototype does not establish practical usability. Test actual household tasks on supported devices with large text, reduced motion and assistive input.

**Done when:** task success/time and friction are recorded, severe barriers are fixed, and navigation/paywall decisions respond to evidence rather than aesthetics alone.

## 12. Expansion ideas — deliberately gated by evidence

These are opportunities, not commitments. Evaluate each using observed time saved, repeated use, willingness to pay, delivery effort, privacy/support burden and variable cost. An experiment can be successful by showing that a feature should not be built.

| ID | Idea and paid-value hypothesis | Smallest useful experiment | Gate before production |
|---|---|---|---|
| EXP-01 | Natural-language task capture: reduce form filling | Parse a short instruction into an editable local/deterministic draft first | Date/assignee confirmation, measured accuracy/time benefit; metered AI only if it wins |
| EXP-02 | Recipe import from a user-provided link or text | User pastes ingredients; review servings/units before saving | Rights/source attribution, safe fetch boundaries, editable output and no unsupported dietary guarantees |
| EXP-03 | Receipt-to-staples suggestions | Adult imports a receipt and reviews proposed item names | Explicit consent, remove payment/personal details, delete raw image, cost cap |
| EXP-04 | Calendar read-only import | Import a bounded calendar file or one supported provider | Clear authorization, refresh/revocation, timezone handling and no secret leakage |
| EXP-05 | Calendar export/subscription | Export confirmed household events without task clutter | Private revocable feed, audience and freshness clear; do not imply bidirectional sync |
| EXP-06 | Native widgets and quick actions | Today checklist or shopping shortcut | OS-specific behavior, scoped data on lock screens, battery/performance testing |
| EXP-07 | Siri/Android shortcuts or share-sheet capture | One shortcut to add a shopping item | Explicit account/household resolution, confirmation and duplicate-safe execution |
| EXP-08 | Home-maintenance library | Seasonal filters, smoke-alarm, appliance and garden templates | Editable cadence, accessible instructions, no unsupported safety guarantee |
| EXP-09 | “Leaving home / returning home” routine | A user-triggered checklist, no geolocation needed | Reuse routine engine, measurable forgotten-item reduction |
| EXP-10 | Travel preparation and return reset | Dates produce a reviewed packing/home checklist | Avoid sensitive travel publicity; integrate vacation exceptions safely |
| EXP-11 | Pantry expiry tracking | Manually track a few high-value perishables | Low input burden and reliable reminders; avoid unsafe food-edibility advice |
| EXP-12 | Household supply forecasting | Suggest when recurring staples may be needed | Explainable history, easy dismissal, no automatic purchase or false certainty |
| EXP-13 | Multi-home/caregiver coordination | Interview separated households and caregivers; prototype permission views | Independent consent, per-home isolation, shared-record ownership and safe leaving |
| EXP-14 | Guest/helper limited access | Time-limited access to a selected checklist | Server-enforced scope, no financial/member admin access, expiry and revocation |
| EXP-15 | Roommate mode | Neutral language, chores/groceries, rewards hidden | Segment retention evidence; do not force a parent/child role structure |
| EXP-16 | Household document reminders | Manual reminders for warranties/renewals without storing documents | Only add a document vault if users value it enough to fund its privacy/recovery burden |
| EXP-17 | Budget-aware meal planning | User-entered rough budget and owned recipes | Label estimates, do not claim live retailer prices; no finance-account integration initially |
| EXP-18 | Care routines and pet coordination | Shared feed/walk/checklist templates | Clear caregiver acknowledgment; no medical advice or emergency-service promise |
| EXP-19 | Accessibility-focused routines | Test gentle reminders, clear small steps and flexible timing | Co-design with users; avoid diagnostic/clinical claims or punitive gamification |
| EXP-20 | Workload balance review | Weekly minutes/availability summary for adults | Honest estimates, private conversation aid, no shaming leaderboard |
| EXP-21 | Household planning assistant | Suggest a draft week from selected templates/availability | User confirms all actions, sensitive data minimized, per-household usage cap |
| EXP-22 | Shared goal celebrations | Noncash experiences and household milestones | Positive, optional feedback; ledger-backed contributions if points are used |
| EXP-23 | Adult referral/service partnerships | Optional relevant offers after a completed maintenance workflow | Disclosed incentive, no child targeting/data sale, no unapproved external booking |
| EXP-24 | Multi-language and locale packs | Translate core strings and test one additional locale | Long text, pluralization, units, dates, week-start and local support/policy readiness |
| EXP-25 | Export/import for switching tools | Import user-owned CSV/calendar/task data with preview | Mapping/deduplication/rollback, ownership confirmation and no scraping of private services |

## 13. Prioritization, ownership and issue-writing rules

Score discretionary work only after P0 items are handled. Suggested comparison: expected households helped × frequency × measured minutes saved × confidence, divided by delivery effort plus ongoing support/cost burden. Keep the component values visible; do not fabricate a precise score from untested assumptions.

| Work category | Recommended accountable role | Review partner |
|---|---|---|
| Product scope, pricing, launch budget | Product owner/founder | Research/design and engineering |
| Auth, schema, ledger, sync | Engineering lead | Independent code reviewer when available |
| UI system and core flows | Product designer/engineer | Accessibility/usability participants |
| Privacy, minors, retention | Product owner | Qualified privacy/legal reviewer for launch scope |
| Release, backup, incidents | Named operator | Engineering reviewer |
| Git publication/visibility | Repository owner | Engineering reviewer |

Every implementation issue should contain: one concrete problem, current evidence, intended behavior, exclusions, dependencies, acceptance criteria, relevant tests, migration/rollback impact and size. Do not copy an entire section into one giant ticket. Split XL items by a verifiable vertical outcome.

The highest-value v1 sequence is reliable household identity → complete chore/reward lifecycle → durable groceries and meals → connected weekly reuse → verified billing/notifications/recovery. Games, decorative variants, speculative AI and secondary widgets remain behind that sequence.

## 14. Definition of completion and handoff

An item is complete when its acceptance criteria are met in the shipped path, its domain contracts and permissions are implemented, necessary verification passes, and documentation reflects the result. “UI built,” “SQL written,” or “works in demo mode” is not sufficient for a shared household capability.

The entire production plan is complete only when the applicable Design release gates pass and users can perform the advertised journeys. The codebase is fully synchronized only when the repository conditions in Design §17 are verified. Neither condition is claimed by these planning documents.

Immediate next implementation slice: preserve/reconcile Git state, resolve repository access, validate the migration chain and policy grants locally, repair failing auth contract tests and hook errors, then isolate authenticated state. This gives the feature work a stable base without discarding the considerable UI already built.
