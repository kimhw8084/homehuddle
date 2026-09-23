# HomeHuddle — Golden UI Qualification Review & Plan Addendum

Review date: September 23, 2026 (UTC)

Product source baseline: c7af0ab957dd31c67f2c9b22c65a6fcec487aed9

Status: **UI qualification incomplete; no claim of UI perfection or production UX certification.**

Companions: [Product design and production plan](HomeHuddle-Project-Design-and-Production-Plan-2026-09-15.md), [Improvement backlog](HomeHuddle-Improvement-Backlog-2026-09-15.md), and [implementation status](https://github.com/kimhw8084/homehuddle/blob/c7af0ab957dd31c67f2c9b22c65a6fcec487aed9/docs/implementation-status.md).

## 1. Decision

The supplied Golden UI material is a strong, useful review framework. Reading it does not qualify HomeHuddle. The current product has a substantially improved engineering foundation, but source-level UI defects, incomplete interaction contracts, and missing product/device/human evidence prevent a confident “UI perfection” conclusion.

Use **Golden UI v2 as the active reference**, with the v3 rc.2 Visual Director, task-oracle and evidence-integrity refinements as a provisional supplement. This follows the authority stated by the [candidate root](https://app.notion.com/p/3e4c564c8d0481a4b3f3ca195f9f94b0) and [active v2 parent](https://app.notion.com/p/3e0c564c8d048164821cdd25d4912ae1). Do not silently promote rc.2, import its demonstration product’s visual identity, or require HomeHuddle to implement a compiler/Fabric workflow.

Three distinct conclusions matter:

| Question | Conclusion |
|---|---|
| Is the reference sufficiently concrete to guide better engineering? | Yes: it makes interaction ownership, whole-task outcomes, platform boundaries and evidence explicit. |
| Is Golden UI rc.2 itself fully qualified? | No. Its readiness assessment retains provisional status and unresolved comparative/independent evaluation limits. |
| Is HomeHuddle now visually excellent and reliably usable on supported platforms? | Not established. Existing checks are valuable but insufficient, and the findings below need closure. |

The rc.2 assessment reports 609 records plus 18 additional source-bound event cases. These are mixed compiler, fixture, event and evidence checks, not 627 independent HomeHuddle journeys or human approvals. It leaves G4/G5 unproven and G8 partial; its browser/Tk/Python work does not establish React Native device behavior. These are reported source results, not experiments reproduced during this review. The downloadable full research bundle was not available as an attached Notion ZIP and was not executed here. [rc.2 readiness](https://app.notion.com/p/3e4c564c8d048127a4c9dafa966f0d14), [historical qualification evidence](https://app.notion.com/p/3e4c564c8d04810f8268efa3fdbfa8d6).

G4/G5 concern the reference’s comparative qualification. HomeHuddle need not prove a model-level advantage before shipping a bounded, well-tested product; it must prove its own acceptance criteria.

## 2. Review coverage and evidence limits

### Reference coverage

Read the supplied root, all five direct child pages, and the active v2 parent plus its seven modules: **14 pages total**. Child-page links and a scoped Notion search agreed on the five candidate children; no further child pages were exposed below those children. The source register’s external links, ancestors and recovery-copy siblings are references, not additional descendants. Five directly relevant official platform/standards pages were also checked; the entire historical source register was not independently revalidated.

The complete page inventory and source timestamps are in section 10. The original Notion pages were not edited.

### Product coverage

Inspected the current production navigation, all six production feature screens, meal editor, shared primitives, planning read lifecycle, household bootstrap/reset boundaries, relevant screen tests, CI workflow, and the design/backlog sections they implement. This is a targeted UI qualification review of the current source, not a repeat of the original whole-codebase audit or a fresh backend/security audit. Legacy settings/onboarding remain in the release inventory and need their own complete interaction and pixel pass.

Current application dependencies include Expo 54, React Native 0.81.5 and React Native Web 0.21.0. Adapt guidance to those pinned versions. The reference’s old React/browser fixtures and an older RN documentation link are not dependency recommendations. The version-matched [RN 0.81 testing guide](https://reactnative.dev/docs/0.81/testing-overview) explicitly distinguishes JavaScript component tests from native execution.

The existing [GitHub CI run](https://github.com/kimhw8084/homehuddle/actions/runs/35087548890) was rechecked: both application and native PostgreSQL jobs succeeded for c7af0ab. The recorded checkpoint includes 13 Jest suites / 39 tests, type checking, lint and web export. These results establish only their tested scope. No new application test execution, rendered screenshot review, screen-reader session, physical-device test or usability study was performed for this addendum. The UI surface inventory was queried, but inventory availability is not UI acceptance evidence.

### Claims vocabulary

- **Observed source gap:** directly visible implementation or test omission.
- **Inferred consequence:** follows from reviewed control flow; not yet reproduced through real user input.
- **Evidence gap:** the implementation may work, but the required proof was not found.
- **Proposed target:** a design or acceptance choice, not an implemented or measured result.

Do not turn any of these into an invented defect count from runtime testing. No numerical “perfection score” is assigned.

## 3. What the existing plans already get right

The September 15 plan already calls for semantic tokens, dark mode, all meaningful async states, accessible input, reduced motion, responsive layouts, device checks and measurable release gates. The backlog already contains UX-01–09 and QA-04–06 addressing much of this work. The new reference strengthens **how completion is demonstrated**, rather than making all of those goals new.

Preserve the following implementation gains:

- Persistent labels and explicit button names in shared primitives.
- Busy guards, draft retention on failed shopping/dinner saves, and consequential purchase confirmation.
- Stable identifiers, versioned edits and persisted reward retry identity.
- Real shared household data, a user-keyed navigation stack, read-synchronizer disposal and coherent core snapshots.
- Explicit points-not-money language, reversible shopping archive, and truthful “submitted for review” wording.
- Existing tests for invalid input, request deduplication, failed draft retention and lost purchase responses.

Evidence: [shared primitives](https://github.com/kimhw8084/homehuddle/blob/c7af0ab957dd31c67f2c9b22c65a6fcec487aed9/components/ui/PlanningUI.tsx), [planning tests](https://github.com/kimhw8084/homehuddle/blob/c7af0ab957dd31c67f2c9b22c65a6fcec487aed9/__tests__/planning-screens.test.tsx), [production screen tests](https://github.com/kimhw8084/homehuddle/blob/c7af0ab957dd31c67f2c9b22c65a6fcec487aed9/__tests__/production-screens.test.tsx), [app gate](https://github.com/kimhw8084/homehuddle/blob/c7af0ab957dd31c67f2c9b22c65a6fcec487aed9/app/(app)/_layout.tsx), [read lifecycle](https://github.com/kimhw8084/homehuddle/blob/c7af0ab957dd31c67f2c9b22c65a6fcec487aed9/features/planning/use-shared-data.ts).

The work below extends these safeguards. It does not authorize an unrelated framework replacement or a cosmetic rewrite of every screen.

## 4. Prioritized findings against the current candidate

Priority is for the UI qualification program. “P0 gate” means an acceptance claim is blocked; it does not mean a production incident or security exploit was demonstrated. File locations refer to c7af0ab.

| ID / priority | Evidence and assessment | Required closure / existing backlog |
|---|---|---|
| **GUI-01 / P0 gate** Product-level qualification absent | CI runs static/unit/database checks and a web export. Planning screen tests mock the data hook/API. No device/browser journey, pixel review or manual AT evidence is attached to the candidate. **Evidence gap.** | Add source-bound product journeys and per-platform evidence. Keep native, browser, assistive and human results separate. QUAL-01/02/07, PLAT-02/04; QA-04/06. |
| **GUI-02 / P1** Editing can continue during dinner save | MealPlanner lines 67–70 leave cook choices enabled while Save is busy. The request captures the earlier meal draft; success then clears the editor. A newly selected cook can therefore disappear without being saved. **Observed source gap; runtime consequence inferred.** | Freeze all submitted values during pending work, or retain a newer draft revision and reconcile the acknowledgement without closing it. Test delayed save → change cook → settle → next edit. STATE-06, JOIN-01/03/04; MEAL-02, UX-07. |
| **GUI-03 / P1** Choice state is color-only | Action exposes disabled/busy but no selected/checked state. Chore filters/assignees, shopping filters and dinner recipe/cook choices distinguish selection through the secondary palette. **Observed source gap.** | Give each choice a coherent selected/checked contract and visible non-color cue; verify actual web and native semantics. ACC-05, FORM-06, CMP-03/06/09; UX-04/07. |
| **GUI-04 / P1** Empty, failed and no-match states overlap | ShoppingScreen lines 26/68 default missing data to an empty list and show “You’re all stocked up” after an initial load error. MealPlanner lines 44–56 also renders unplanned dinners while loading; recipe filtering has no explicit no-match result. **Observed conditions; rendered consequence inferred.** | Render “empty” only after a successful authoritative load. Preserve last valid data with a stale marker on refresh failure. Provide no-match explanation and clear-query recovery. STATE-01/02/07, CMP-19; UX-05. |
| **GUI-05 / P1** Modal and dirty-dismissal contract incomplete | Editor lines 21–28 uses RN Modal, a modal accessibility hint and keyboard avoidance, but has no explicit name/initial-focus/eligible-return-focus contract. Meal editor onClose immediately drops the draft. **Contract/evidence gap; no claim that RN’s built-in focus behavior universally fails.** | Verify platform defaults first; supply missing naming/focus behavior per adapter. Define dirty Back/Escape/cancel policy, background exclusion and a fallback when the opener disappears. OVR-01–04/08, JOIN-02/03; UX-07. |
| **GUI-06 / P1** Form errors and submission need adapters | Field lines 36–37 provides a persistent label and accessibilityLabel, but no shared required/invalid/error-association contract. Forms display general alert text; the shared layer has no web form/Enter submission boundary. **Observed shared-layer gap.** | Associate field errors, retain values, focus a useful correction target, expose constraints and requiredness, and qualify Enter/autofill/paste/IME behavior on web and native. Do not make every small form use an oversized error summary. FORM-01–04, ACC-10/12; UX-04/07. |
| **GUI-07 / P1** Planned theme system not integrated | PlanningUI lines 5–18 hardcodes a light palette. Tab layout lines 15–33 fixes a light blur/background; existing theme hooks are not consumed there. **Observed plan-to-code gap.** | Extend one semantic token authority into primitives and navigation, then all admitted screens. Verify light/dark, contrast, disabled/error/selected states and web forced colors using actual pixels. VIS-02/08, ACC-02/13; UX-03/04. |
| **GUI-08 / P1** Navigation and usable geometry unqualified | Six current tabs retain Family/Restock names while their screens say Household/Shopping. Tabs specify height 85, bottom padding 25 and 11-point labels; shared content uses fixed bottom padding 120. These constants are not proof of clipping, but do not prove safe-area/large-text/IME behavior either. **Observed mismatch and evidence gap.** | Resolve task names and validate the existing five-destination proposal with users. Use measured insets/available space; test small/short screens, text growth, keyboard and tablet resize with real input. TASK-02, LAY-02–08, PLAT-03; UX-01/08. |
| **GUI-09 / P1** Motion preferences not wired into shared flows | Editor unconditionally uses slide animation. Chore/shopping edit actions explicitly request animated scrolling. No reduced-motion branch exists at these call sites. **Observed source gap.** | Honor system preferences through shared policy while preserving meaningful status/focus feedback. Verify interrupted transitions and reduce-transparency fallback for tab materials. ACC-09, VIS-09; UX-09. |
| **GUI-10 / P1; P0 if disclosure/wrong effect reproduced** Full async write lifetime unproven | Read synchronization has disposal and account checks; the app stack is keyed by user. However, feature mutation helpers directly update notice/error/busy/draft after awaiting work without an explicit operation/draft validity contract. **Evidence gap, not proof of cross-account leakage.** | Test all result sinks under A→B→A, role change, removal, unmount and old acknowledgement/new draft. Reuse existing ownership boundaries; add a generation/revision mechanism only where tests show it is needed. JOIN-01/03, STATE-03/08; DATA-01–03, QA-04. |
| **GUI-11 / P1** Refresh and freshness contract incomplete | Home/Chores RefreshControl uses refreshing=false. useSharedData exposes loading/error/data but no last-success timestamp or explicit refreshing state. **Observed source gap.** | Distinguish initial load, refresh, stale/offline, denied and reconnecting states without erasing authorized content. Confirm user-invoked refresh started/finished and prevent false synchronized claims. STATE-01/02/10, DATA-01; UX-05, DATA-03. |
| **GUI-12 / P1** Craft, perception and task-speed evidence absent | Shared styles and screenshots from another project cannot establish HomeHuddle’s density, optical balance, scannability, focus visibility or time saved. Repeated row actions such as Edit/Archive also need contextual accessibility review. **Evidence gap.** | Review populated and adverse-state pixels independently, measure actual hit regions, and observe representative users completing core tasks. Bind performance and comprehension findings to an exact build/data profile. VIS-01/05/12, JOIN-06, ACC-03/05, QUAL-05/06/10; UX-04/08, QA-05/06. |

Direct source pointers: [MealPlanner](https://github.com/kimhw8084/homehuddle/blob/c7af0ab957dd31c67f2c9b22c65a6fcec487aed9/features/meals/MealPlanner.tsx), [ShoppingScreen](https://github.com/kimhw8084/homehuddle/blob/c7af0ab957dd31c67f2c9b22c65a6fcec487aed9/features/shopping/ShoppingScreen.tsx), [HouseholdChores](https://github.com/kimhw8084/homehuddle/blob/c7af0ab957dd31c67f2c9b22c65a6fcec487aed9/features/chores/HouseholdChores.tsx), [HouseholdHome](https://github.com/kimhw8084/homehuddle/blob/c7af0ab957dd31c67f2c9b22c65a6fcec487aed9/features/household/HouseholdHome.tsx), [PlanningUI](https://github.com/kimhw8084/homehuddle/blob/c7af0ab957dd31c67f2c9b22c65a6fcec487aed9/components/ui/PlanningUI.tsx), [tab layout](https://github.com/kimhw8084/homehuddle/blob/c7af0ab957dd31c67f2c9b22c65a6fcec487aed9/app/(app)/(tabs)/_layout.tsx), [CI](https://github.com/kimhw8084/homehuddle/blob/c7af0ab957dd31c67f2c9b22c65a6fcec487aed9/.github/workflows/ci.yml).

Important calibration: Action’s minHeight of 46 does **not** by itself prove its rendered touch target is smaller than 48; content/padding can increase its actual size. Measure effective, non-overlapping targets. Platform baselines are distinct: [Apple guidance](https://developer.apple.com/design/tips/) uses 44×44 points, [Android guidance](https://developer.android.com/guide/topics/ui/accessibility/apps) recommends 48×48 dp for touch, and [WCAG 2.2 AA target sizing](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) uses 24×24 CSS pixels with defined exceptions. Do not convert these into one universal unit or claim a full accessibility audit from this measurement.

The shopping badge was also traced: the core snapshot now maps shopping records into restockItems. The old baseline badge finding must not be restated as a current disconnected-data defect without a new reproduction.

## 5. HomeHuddle Visual Director contract

These are proposed product-specific choices, extending Design §4. They are hypotheses to validate with real screens and tasks, not approved pixel evidence. The [Visual Director reference](https://app.notion.com/p/3e4c564c8d04815a9b6cf011edd97728) calls for explicit choices and challenges; its example style is not HomeHuddle’s required brand.

Product task: a busy adult can settle the household’s next actions, dinner and shopping without sending follow-up messages. A collaborator or teen can understand their responsibility immediately. Repeated work should require fewer decisions, while permissions and consequences remain visible.

| Decision | HomeHuddle direction | Challenge before acceptance |
|---|---|---|
| Character | Warm, calm and dependable; playful only where it supports participation. | Adults can scan urgent work without decorative competition; teens are not patronized. |
| Typography | Platform-friendly text, a small semantic scale and content-driven growth. | Long household names, 200% web text and native accessibility sizes remain usable. |
| Density | Comfortable daily view; compact optional list treatment where repeated scanning benefits. | Measure shopping use with 40–100 real-length items, not three sample cards. |
| Hierarchy | One dominant next action per task region; due/review work ahead of optional rewards. | Users find what matters without interpreting six equal visual priorities. |
| Spacing | Shared spacing roles for fields, groups, sections and navigation. | Narrow/large-text layouts preserve grouping without excessive scrolling. |
| Surfaces | Cards group an actual decision or record; simple lists handle repeated comparison. | Remove a wrapper experimentally and compare clarity, not just code size. |
| Borders/radii | Restrained shared shape vocabulary; visible structure in all admitted themes. | Focus, selection and controls remain distinguishable when shadows disappear. |
| Color | Semantic indigo action, neutral surfaces and restrained status colors. | Selected/error/success meaning survives grayscale, forced colors and theme changes. |
| Emphasis | Weight, position and concise language before ornament. | Multiple urgent records do not become a wall of badges or saturated panels. |
| Icons | Consistent existing icon family; visible labels for ambiguous destinations. | Users understand actions without memorizing symbols; names remain useful to AT. |
| Imagery | Proof images and useful household context; decorative assets have a clear role. | Missing/expired images cannot look like approved evidence; support safe retry. |
| Motion | Brief purposeful transitions, preference-aware; feedback survives no-motion mode. | Rapid repeat input/interruption does not strand focus or change the target. |
| Data density | Label point balances, dates, ownership and freshness; never imply points are cash. | Missing data is not zero; limited history is disclosed; row actions retain context. |
| Content tone | Specific, kind, short: what happened, what is safe, what happens next. | Conflict, denial, offline and partial success each provide a real recovery path. |
| Responsive composition | Preserve task/object/draft while changing layout; avoid stretched phone-only design. | Short viewport + keyboard, tablet resize and long labels retain reachable actions. |

Monetization must follow demonstrated time savings. Gate premium convenience by transparent household value and adult consent; never make destructive recovery, basic accessibility, cancellation or a child’s participation depend on an upsell. Test weekly reuse, routine planning and reduced coordination effort before claiming time saved. Feature quantity, streak pressure and manufactured urgency are not substitutes for utility. This extends Design’s existing commercial strategy; no new paid offer is launched by this review.

## 6. Component and relationship inventory

### Component families

This is a bounded inventory of inspected production flows plus declared release scope. “Not admitted” means do not certify or add it merely to satisfy the lawbook. A legacy/demo occurrence must be reclassified if it becomes reachable in a release. This table uses the [36-family reference](https://app.notion.com/p/3e0c564c8d04813e9a37e27591d12b02) without imposing a new runtime framework.

| Families | HomeHuddle mapping / disposition |
|---|---|
| CMP-01 actions; CMP-02 navigation links | Action, row commands, auth/help/settings destinations. Audit navigation semantics separately from commands. |
| CMP-03 choices; CMP-04 text/password | Filters, assignees, cook choices, proof switch; shared Field and auth input. |
| CMP-05 quantities; CMP-06 selection | Shopping quantities, points/reward costs, recipe/member selection. Locale and selection semantics required. |
| CMP-07 dates; CMP-08 ranges/specialized values | Civil-date chore entry and dinner dates apply. Sliders/color pickers not admitted to the inspected core. |
| CMP-09 search; CMP-10 forms | Recipe queries, filters, editors and onboarding. Need no-match, dirty-state and submission contracts. |
| CMP-11 navigation; CMP-12 toolbars | Tabs, deep links, Back and grouped commands apply. A command palette/ribbon is not required. |
| CMP-13 disclosure; CMP-14 dialogs | Settings/help disclosure must be inventoried; confirmations and meal dialogs are in scope. |
| CMP-15 sheets; CMP-16 help | Editor/picker presentation and inline prerequisites apply. Hover-only help is not an accepted sole path. |
| CMP-17 menus; CMP-18 feedback | No dedicated command menu qualified in the inspected core; banners, notices, alerts and badges apply. |
| CMP-19 lifecycle surfaces; CMP-20 lists/cards | All feature screens. Add complete state and stable-identity coverage. |
| CMP-21 tables; CMP-22 grids; CMP-23 trees | Not admitted to current core. Do not add a grid/tree framework to obtain checklist coverage. |
| CMP-24 metrics; CMP-25 planning | Point balances/history and week planning apply; advanced demo charts are not production evidence. |
| CMP-26 spatial editors; CMP-27 rich editors | Not admitted. Plain recipe instructions remain a text-field contract, not a rich editor. |
| CMP-28 drag/resize; CMP-29 media | Drag interfaces not admitted to current core. Proof images require meaningful labels/failure states; no video/audio contract implied. |
| CMP-30 files; CMP-31 identity/permission | Photo picker/upload and household export; authentication, invitations, role/permission changes. |
| CMP-32 consequential effects; CMP-33 AI | Purchase/redeem/review/archive apply. AI/chat is not admitted to current core. |
| CMP-34 collaboration; CMP-35 onboarding | Shared updates, conflict/reconnect, first-use/invite/help. Presence is not proof of synchronization. |
| CMP-36 specialized devices | Watch/TV/spatial/automotive/kiosk explicitly unsupported until separately qualified. |

### Six relationship contracts, bound to existing owners

| Relationship | Existing owner / affected path | Acceptance obligation |
|---|---|---|
| async_scope | Auth/bootstrap, snapshot synchronizer, useSharedData, each feature mutation helper | Principal + household + object + operation/draft lifetime govern data, errors, notices, caches and pending controls. Read guards alone do not close write evidence. |
| modal_stack | Editor and platform modal/navigation adapters; system photo picker handoff | Topmost layer owns focus, Back/Escape and scroll. Returning focus has an eligible invoker or meaningful fallback. |
| presentation_state | Screen/editor draft and selection state | Preserve authorized work across resize/theme; deliberately reset object changes; purge on revoked authority. Document intentional discard separately from accidental loss. |
| shared_consumer | PlanningUI → Home, Chores, Planner/MealPlanner, Shopping, Market, Wallet | Primitive changes require the complete affected screen/state regression set. Expand to legacy consumers only when actually migrated. |
| task_effect | Feature command → server acknowledgement → refresh → user feedback | Correct target/effect, no duplicate effect, truthful uncertainty and an operable next action; callback counts are insufficient. |
| geometry_action | Navigation, safe area, keyboard, scroll container and editor | The control is perceptible and actually reachable by ordinary supported input, not merely inside a mathematical viewport rectangle. |

Keep these records near feature tests/docs. A global state manager, universal focus framework or mandatory token-format migration is not required. Reuse the smallest existing authority that can satisfy the contract. See [compiler/adapter limits](https://app.notion.com/p/3e4c564c8d0481949865de3b680f0b70) and [prompt adapter](https://app.notion.com/p/3e0c564c8d04810081d0e7ae278cd3b4).

## 7. Complete acceptance oracles

Each oracle must be executed through actual supported input on an isolated test household. Pair UI observations with authoritative effects; do not mutate a real household to manufacture test evidence.

1. **Create or edit a chore.** Preconditions: authorized adult, known household/member, existing version for an edit. Enter title/date/points/assignee; submit twice rapidly. Observe validation beside the relevant field or one pending operation, then a saved record with correct values. Exactly one intended record/effect; no wrong assignee/date or silent conflict overwrite. Invalid/network failure retains safe input. After success, create a different chore to prove the lock cleared.
2. **Plan dinner during delayed save.** Open a known day, select recipe/cook, submit with delayed acknowledgement, attempt a cook change, then settle. Either the change is clearly unavailable while saving or the newer revision remains unsaved and recoverable. Read-back matches the acknowledged payload; no newer intent is silently erased. Reopen and make another legitimate edit.
3. **Reuse a week and generate shopping.** Start with a partially filled target week. Copy last week; confirm only empty dates change and dates/cooks are correct. Generate ingredients twice; verify declared deduplication and honest counts in Shopping. On conflict/failure, existing dinners remain. User can adjust quantities and complete a purchase afterward.
4. **Shopping failure, archive and undo.** Enter a fractional quantity, force invalid input and then a transport failure. Field context and draft survive; unknown data never becomes “all stocked up.” Retry resolves to the same intended item. Archive it, undo with the correct version, and confirm exactly the intended record returns. Mark purchased and buy again as the next task.
5. **Proof → review → points.** Use an assigned chore requiring proof; deny picker access, then permit a supported image. Selection/upload/submitted/review states remain distinct. An adult can inspect valid proof, reject with feedback, receive a resubmission and approve. Verify one correct points effect; unavailable proof is not a successful review. Participant can inspect the resulting history.
6. **Reward purchase with lost acknowledgement.** Show target reward, exact cost and resulting balance before confirmation. Drop the response after server commit, retry, and reconcile the same request identity. One debit and one inventory item; no “not purchased” certainty when outcome is unknown. Changed terms require review. User opens the wallet and redeems the intended reward once.
7. **Identity/authority transition.** With drafts and delayed reads/writes, change principal or revoke membership/role; include A→B→A. Confirm every data/error/status/pending sink remains in its valid context. No old notice unlocks a newer action; no unauthorized draft/data remains visible. Server enforcement and UI reconciliation are checked separately. New authorized work remains possible after recovery.
8. **Overlay/input/geometry intersection.** Open recipe editor, enter long multilingual text with a real IME, enlarge text and shorten the viewport; move through fields with keyboard/AT. Save/cancel/error and active field stay perceivable and reachable. Back/Escape follows the declared dirty policy; return focus works if opener is hidden/removed. No unintended IME Enter submit, background activation or draft loss; reopen and continue.

For each: record fixture, exact source/build, input sequence, visible result, semantic result, authoritative effect, prohibited effects, recovery and next action. Existing unit tests cover portions, not the complete set.

Challenge important oracles with representative isolated faults: allow cook edits without revision retention; replace failed-load data with empty; remove selection semantics; drop a scope-validity check; hide error text; leave Save locked after success; cover a button with a transparent interceptor. A meaningful check must reject the intended fault and accept its sound counterpart. A crash, timeout caused by the harness, or a forced click bypass is not sufficient. This operationalizes the [v2 evidence lessons](https://app.notion.com/p/3e0c564c8d0481d986dae6098cbba251); no universal mutation-count quota is implied.

## 8. Evidence matrix and release gates

### Required evidence by platform

| Layer / profile | Current evidence | Remaining proof |
|---|---|---|
| Source and JS component logic | Reviewed; existing scoped CI successful | Add regressions for findings and all meaningful transitions. |
| Web compile | Existing Expo export succeeded | Real served-app browser journeys, URL/Back, native web submission, keyboard, zoom/reflow and input behavior. |
| Browser coverage | No candidate-bound journey evidence reviewed | Chromium plus Safari/WebKit and other declared engines; pin exact versions. Do not claim desktop Safari from Chromium alone. |
| iOS / iPadOS | No device qualification reviewed | Release-like native build, safe areas, Dynamic Type, keyboard/picker, VoiceOver, interruption and tablet adaptation. |
| Android | No device qualification reviewed | Release-like build, TalkBack, font scaling, system Back, keyboard/insets and a representative lower-end device. |
| Appearance / perception | Source styles only | Light/dark, forced colors on web, focus, disabled/error/selected states, actual contrast and readable populated screens. |
| Cross-feature recovery | Some unit/domain coverage | Two authorized test clients, delayed/failed/out-of-order work, reconnect, role changes, version conflict and lost acknowledgement. |
| Human usability / craft | Not measured | Independent populated-screen critique and observed adult/collaborator task completion; include accessibility needs. |
| Field performance / time saved | Not established | Real task latency, error/recovery and retention observations with privacy-safe instrumentation. |

Use risk-based intersections: short height + keyboard + long validation; large text + narrow tabs; offline + pending save; permission loss + stale result; forced colors + selected/focus; locale/RTL text + identifiers; tablet resize + dirty modal. Native RTL/locale support must be explicitly admitted and tested; do not advertise universal language support from a single stress fixture.

A web pilot may qualify a narrower web-only scope. It must name excluded native capabilities and still meet its applicable accessibility, truthfulness and data-safety criteria. Narrowing distribution is different from marking an untested platform as passed.

### Staged execution and exit criteria

**Stage A — Reproducible foundation.** Freeze c7af0ab as the source baseline; retain existing good checks. Create non-production fixtures and component/relationship/claim inventory. Record which support profiles are admitted. Exit: each critical task has an owner and complete oracle, with actual tests distinguished from planned checks.

**Stage B — Truth and input correctness.** Reproduce and fix GUI-02/03/04 first, then close form, dirty-editor and async-lifetime gaps. Preserve server idempotency and read isolation. Exit: targeted failures are permanent regressions; complete tasks and next actions pass, with negative controls demonstrating important checks are sensitive.

**Stage C — Shared craft and platform behavior.** Migrate semantic tokens; finish focus/selection/error contracts, preference-aware motion and content-adaptive layouts. Review all affected production consumers. Exit: actual populated/adverse-state pixels and ordinary-input journeys pass on the admitted browser/native matrix, with no known material accessibility or task blocker.

**Stage D — Independent use and release.** Freeze holdout combinations after tuning; ask an independent reviewer to inspect pixels and representative users to attempt tasks without coaching. Measure completion, errors, recovery, effort and comprehension. Proposed small initial formative cohort: five adult coordinators plus collaborators/accessibility participants as available; this is a discovery study, not statistical proof of universal preference. Exit: no unresolved material failure in accepted scope; new failure classes enter permanent regression. Unmeasured field outcomes remain explicitly unmeasured.

No aesthetic average compensates for an inaccessible Save button, wrong-household effect, erased draft or false success. An honest release claim is “qualified for these tasks/platforms/build under these checks,” with limitations—not “perfect everywhere.” [Qualification laws](https://app.notion.com/p/3e0c564c8d0481d6a205e895bb385250).

### Free and economical paths

- **Path A, no incremental vendor spend:** use existing local hardware, open-source test tooling, isolated local fixtures and available CI allowance; begin with a web-only pilot if native signing/device access is unavailable. Keep artifact size and retention bounded. Real human review still costs time and cannot be replaced by an automated beauty score. Free service quotas are constraints, not an unlimited guarantee.
- **Path B, minimum-spend convenience:** buy the specific missing evidence/reliability first—targeted device access, a focused accessibility/usability review, or managed test execution when maintenance would cost more. Establish a spend cap before purchase. More backend spend or a paid test dashboard does not fix poor task design.
- Neither path needs a paid Supabase upgrade just to write contracts, add unit tests, inspect local renders or qualify isolated UI fixtures. Current vendor pricing/quotas were not repriced in this addendum; the original plan’s dated cost observations remain historical.

## 9. Repository, evidence and planning integration

Keep the current feature-first structure. Add narrowly scoped assets as implementation proceeds; the following is a **proposed layout**, not a claim those files already exist:

~~~text
docs/product/
  HomeHuddle-Golden-UI-Qualification-Review-2026-09-23.md
docs/quality/ui/
  scope-and-claims.md
  component-relationships.md
  task-oracles.md
  visual-decisions.md
  evidence-manifest.json
__tests__/
  [focused component/state regressions beside current tests]
e2e/
  web/
  native/
  fixtures/
components/ui/
  [shared semantics/theme primitives with platform adapters where needed]
~~~

The manifest should identify source commit/tree, dependency lock hash, build/artifact hash, test version, fixture hash, OS/browser/device/font versions, viewport/text scale/theme/locale/input/network profile, timestamps, outcome, reviewer and artifact checksum. Validate required case identities, duplicates, missing/stale evidence and semantic failure status; process exit code alone is insufficient. Do not put customer records, signed proof URLs, auth tokens or production credentials in fixtures or screenshots.

Keep screenshots and recordings in bounded CI artifacts unless small stable goldens justify versioning. Rebaseline only with a reviewed explanation and matching task/semantic proof; do not increase tolerance to hide regressions. Pin baseline and best-so-far and retest the actual shared-consumer closure. Genuinely new holdouts become regressions once inspected.

Map GUI findings into existing backlog items rather than replacing the 96-item plan. Each implementation PR should identify the GUI IDs, changed consumers, source-bound evidence and remaining gaps. Keep main buildable, make reversible commits, preserve prior history and sync the matching iCloud document exports. This addendum updates design and acceptance criteria only; it does not mark any GUI finding fixed.

## 10. Source register and review trail

All Notion pages below were retrieved and read for this review on September 23 UTC. Timestamps are the connector’s page_last_edited_at, not a promise that a living page will never change. Links resolve to the current page; freeze an authorized source snapshot before implementing a future candidate if exact historical text is needed.

| Ref | Page | Last edited (UTC) |
|---|---|---|
| N1 | [Golden UI v3.0.0-rc.2 candidate root](https://app.notion.com/p/3e4c564c8d0481a4b3f3ca195f9f94b0) | 2026-09-23 03:43:35.977 |
| N2 | [Visual Director & Product-Task Contract](https://app.notion.com/p/3e4c564c8d04815a9b6cf011edd97728) | 2026-09-23 02:40:53.875 |
| N3 | [Executable Compiler, Component Contracts & Platform Adapters](https://app.notion.com/p/3e4c564c8d0481949865de3b680f0b70) | 2026-09-23 03:43:46.779 |
| N4 | [Audit, Source Refresh & Learning Ledger](https://app.notion.com/p/3e4c564c8d0481c9ad77d670406165df) | 2026-09-23 02:40:53.875 |
| N5 | [Qualification Evidence, Gates & Reproducible Bundle](https://app.notion.com/p/3e4c564c8d04810f8268efa3fdbfa8d6) | 2026-09-23 03:44:10.010 |
| N6 | [rc.2 Executed readiness assessment — PROVISIONAL](https://app.notion.com/p/3e4c564c8d048127a4c9dafa966f0d14) | 2026-09-23 03:43:02.730 |
| N7 | [Active Golden UI Engineering Lawbook v2](https://app.notion.com/p/3e0c564c8d048164821cdd25d4912ae1) | 2026-09-23 03:44:04.536 |
| N8 | [Universal, Craft, Layout & Platform Laws](https://app.notion.com/p/3e0c564c8d04814eb84fea626a3f554b) | 2026-09-19 15:01:25.115 |
| N9 | [Accessibility, State & Form Laws](https://app.notion.com/p/3e0c564c8d04817784f3cd5152f0f671) | 2026-09-19 15:01:25.115 |
| N10 | [Overlays, Data, Advanced & Qualification Laws](https://app.notion.com/p/3e0c564c8d0481d6a205e895bb385250) | 2026-09-19 15:01:25.115 |
| N11 | [Component & Relationship Contracts](https://app.notion.com/p/3e0c564c8d04813e9a37e27591d12b02) | 2026-09-19 15:01:25.115 |
| N12 | [Authoritative Source Register](https://app.notion.com/p/3e0c564c8d0481bbb6cadb1d083bc8ff) | 2026-09-19 15:01:25.115 |
| N13 | [v2 Qualification Evidence & Limits](https://app.notion.com/p/3e0c564c8d0481d986dae6098cbba251) | 2026-09-23 02:44:29.101 |
| N14 | [Prompt Authoring Adapter](https://app.notion.com/p/3e0c564c8d04810081d0e7ae278cd3b4) | 2026-09-19 15:02:13.999 |

Additional official checks: RN 0.81 testing, WCAG target-size explanation, Android accessibility guidance, Apple UI design tips and the [APG modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). APG is implementation guidance; platform guidance and the project’s stronger policies must not be mislabeled as WCAG normative requirements.

Review outcome: reference coverage complete for the exposed child tree and inherited active modules; source-backed gaps documented; platform/visual/human acceptance remains open. Application behavior and source Notion pages were not changed by this assessment.
