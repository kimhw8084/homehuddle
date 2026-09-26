# HomeHuddle UI0 audit findings

Source: 46bd155dd55cbd85a29db5722c96d96c4946952b / tree a66760b6df143a87e894d5fe636f152ea73f6bea. Package status: FAILED_BLOCKED.

## HH-UI0-001 — P1 — Chores task/action content is clipped at desktop and landscape heights

Surface Keys: chores-reschedule, chores-today-all

Impact: At 1440x900 the Chores reschedule header/confirm controls are clipped. At 844x390 the first task row is covered by the persistent tab bar and input attempts do not scroll it into the usable viewport, blocking ordinary chore actions.

Root authority: composition. Bounded fix: Correct Chores vertical composition and scroll ownership at short heights so the task list scrolls above the persistent tab bar; independently constrain the month sheet and keep title/close/primary action visible.

Closure: 1440x900 and 1366x768 reschedule anchors; 1536x864 holdout; 390x844 and 844x390 task row is visible and hit-testable; wheel and touch/pointer scroll moves Chores content above tabs; keyboard path; task oracle for Check Mail and selected reschedule date

## HH-UI0-002 — P1 — Weekly voting cannot be reopened from the seeded results phase

Surface Keys: family-meal-voting, family-meal-results

Impact: Family cannot start the next weekly vote through an ordinary visible action in audited runtime; voting workflow cannot be verified.

Root authority: Product contract. Bounded fix: Add an explicit next-cycle transition at the weekly boundary while preserving prior results and schedule.

Closure: ordinary results-to-next-week path; no/partial/all vote, schedule, cycle, repeat and stale-state oracles; both viewport anchors

## HH-UI0-003 — P2 — Expired reward remains actionable under Active Rewards

Surface Keys: wallet-reward-bag, wallet-reward-use

Impact: Household sees contradictory reward status and can attempt to use an expired item.

Root authority: interaction-state. Bounded fix: Remove expired rewards from actionable Active list or disable Use and provide explanation/history.

Closure: same object active/expiring/expired/used/history; assert no expired reward has actionable Use; retain notes and identity

## HH-UI0-004 — P2 — Seeded Market curator names do not match fixture household identities

Surface Keys: market-item-detail, market-item-restock

Impact: Expected manager cannot use some seeded Market actions; QA used a labeled disposable in-memory item. This does not establish production authorization behavior.

Root authority: Product contract. Bounded fix: Bind seeded curators to deterministic member IDs while preserving non-owner restrictions.

Closure: owner/non-owner checks; eligible purchaser; empty/out-of-stock

## HH-UI0-005 — P3 — Repeated animation and deprecated-style warnings remain

Surface Keys: family-meal-results

Impact: No user-visible jank proven; repeated warnings reduce runtime fault signal.

Root authority: shared component. Bounded fix: Remove render-time shared-value reads and replace deprecated web style props after task blockers.

Closure: sound/faulty warning controls; affected route no longer warns; motion/reduced-motion parity

## HH-UI0-006 — P3 — Nested settings route and browser animation fallback require closure

Surface Keys: profile-center, settings-personal-info, settings-privacy-security, settings-notifications, settings-household, settings-invite, settings-chore-history-completed, settings-chore-history-deleted, settings-help, settings-about

Impact: Direct link, Back and return-state closure remains incomplete.

Root authority: navigation. Bounded fix: Correct only the nested route ownership and web fallback configuration after blocker fixes.

Closure: direct-link/Back/return matrix; desktop warning-free route; six-tab navigation unchanged

## HH-UI0-007 — P2 — Auth screen displays an unproven fixed social-proof count

Surface Keys: auth-entry

Impact: New households may interpret a hard-coded claim as a current real platform metric. It creates trust risk at the first entry point.

Root authority: copy. Bounded fix: Remove the number or replace it with a live, sourced, privacy-safe aggregate whose time window and provenance are supportable.

Closure: source-backed metric definition and refresh path, or claim removed; desktop/mobile auth anchors; runtime data is not implied by a local fixture

## HH-UI0-008 — P2 — Household Settings presents inert Add, Manage and member-row affordances

Surface Keys: settings-household

Impact: Household managers may try to add or edit members from Settings and receive no response. The screen has no keyboard role for the apparent controls.

Root authority: interaction-state. Bounded fix: Wire Add and Manage to real supported workflows or render them as non-actionable status; make member rows keyboard-operable only if their chevrons promise navigation.

Closure: pointer and keyboard probes produce same intended action; semantic roles/names and focus visible; add/edit/save/cancel and return path for the same fixture member

## Package and audit blockers

- BLOCK-001 STATE_UNREACHABLE_IN_DETERMINISTIC_FIXTURE: family-meal-voting missing at both anchors; current results screenshots show all three fixture members voted; no ordinary next-cycle action; store reset method has no visible caller.
- BLOCK-002 SURFACE_MANIFEST_ARTIFACT_PATH_COLLISION: family-member-create and family-member-editor both point to editor screenshots in frozen manifest; distinct key-named create PNGs exist, but frozen mapping cannot be corrected.
- BLOCK-003 AUDIT_CLAUSE_CATALOG_UNAVAILABLE: Retained run and accessible local inputs have no authoritative Golden UI v3 clause IDs or JOIN-01..09 definitions; no numeric mappings are invented.
- BLOCK-004 STRESS_PROFILE_COVERAGE_INCOMPLETE: 200 percent browser zoom and short-height open-keyboard/IME remain unverified. Long chore name was captured in a disposable context; list ellipsizes while DOM retains full text.
- BLOCK-005 CAPTURE_EVENT_RETENTION_GAP: Rolling capture-progress writer kept valid rows but replaced earlier event arrays; only final voting attempt events survive.

## Optional hypothesis HYP-UI0-001: Long Chores names in the dense list

A 78-character QA title is ellipsized in the list, while full text remains in the DOM and the row expands. Test two same-prefix names and search/edit recovery before changing row height. This is a follow-up hypothesis, not a mandatory defect. Evidence: stress-evidence/stress-long-text-390x844--chores.png.

## Protect during convergence

Preserve the six destinations Home, Chores, Family, Wallet, Market and Restock; Home digest/widgets; Chores categories, assignment, calendar, bulk selection and games; Family member, heatmap and activity capability; Wallet points, history and bag; Market catalog/sales/redemption; and Restock category organization, quick add and completed history. The evidence does not support flattening these workflows.
