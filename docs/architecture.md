# Architecture: persisted household core

Status: engineering preview, September 15, 2026 America/Chicago (September 16 UTC).

## Product boundary

The useful loop is **assign → complete/review → earn/redeem**, connected with **plan dinner → reuse a week → generate shopping**. Household points are not money. No real-money checkout is enabled. The target design also includes recurrence, automation, offline operation, billing and analytics; those are not implied by prototype controls or this document.

## Client boundaries

Thin routes select production feature screens. Demo screens and fixtures require development mode, explicit bypass and no real session. Real households start empty; display names are labels, not IDs. The fabricated landing-page activity count was replaced with a product summary.

Auth owns session identity. Changing accounts resets all household state and account-bound onboarding completion. Invite tokens are in-memory only. Root routing verifies actual membership before choosing onboarding/app. PKCE callback handling deduplicates requests with a bounded, expiring cache.

A single `get_household_snapshot` RPC returns a transaction-consistent core read model. Adapters install it with one Zustand update. Synchronization serializes loads, coalesces invalidations, ignores disposed/account-stale responses and refreshes on reconnect, foreground and a periodic timer. Realtime is invalidation, never a speculative balance increment.

Planning screens use bounded feature queries and serialized refresh. Failed writes retain forms; editors expose busy/error/retry states. **All writes require a connection. No durable offline queue exists.**

## Ownership and invariants

| Domain | Tables | Invariant |
|---|---|---|
| Membership | households, household_members, household_invites | One active account membership; ownership adult-only |
| Work | chores, chore_completions | Stable assignee; version conflicts; retry-safe approval/resubmission |
| Points | point_ledger, member wallet_balance | Balance and ledger commit atomically |
| Rewards | rewards, reward_inventory | Purchase title/cost immutable; persisted operation ID |
| Dinner | recipes, meal_plans | Planned ingredients snapshotted; copy does not overwrite |
| Shopping | shopping_items | Positive fractional quantity; source-plan deduplication |
| Proofs | Private storage bucket | Tenant/chore path and object existence validated |

Composite foreign keys enforce tenant consistency, with covering indexes. Member removal anonymizes while preserving ledger history; chore/reward archive retains historical references.

## Command sequence

1. Validate the form; obtain/reuse a request UUID; block duplicate taps.
2. Server derives actor from `auth.uid()`, checks membership/role and supplied relationships.
3. Lock relevant rows; reject stale expected versions. Supported same-payload retries are harmless.
4. Commit business changes and ledger updates atomically.
5. Refresh authoritative state; other devices receive invalidation.

Purchase IDs are persisted before sending and cleared after confirmation. A lost response reuses the same ID; changed prices require confirmation. Adults may act for unauthenticated children, not generally impersonate other authenticated adults. Teens cannot spend siblings' balances.

Some historical account, onboarding and reward-creation RPCs remain non-idempotent. New chore creation uses UUID identity; planning saves use IDs/versions. Native multi-connection race tests remain required.

## Reads and limits

History defaults to 100 entries (allowed 1–500). All pending approvals and available rewards remain visible independently of that history limit. Reviewed completions, redeemed inventory and ledger are bounded history, not lifetime pagination. Owner export includes full application domains and excludes PIN hashes.

Recipes/shopping have 1,000-active-item limits. Ingredient generation checks capacity atomically and deduplicates per planned meal. Ingredient text is not normalized quantity math: “500 g pasta” remains a text item. Cross-recipe unit merging is not implemented; archived generated items are not automatically regenerated.

Civil dates use YYYY-MM-DD and local calendar arithmetic. Existing due timestamps were backfilled using the database timezone; this compatibility conversion is not a household-timezone recurrence engine.

## Security boundaries

Every public application table has RLS. Business mutations use deliberately exposed authenticated RPCs with actor checks and restricted search paths. Privileged RPC exposure is a review surface, not proof of exhaustive safety. Authorization never trusts editable user metadata.

Member SELECT grants and exports exclude PIN hashes. Invite tokens/email are owner-only. Composite/internal helper execution is revoked; private helpers are outside exposed schemas.

Submitted-proof signed URLs expire in ten minutes and are batched. Uploads allow JPEG/PNG/WebP up to 5 MB. Picker EXIF settings and client validation are not a server content scanner or guaranteed metadata scrubber. Orphan cleanup, media erasure, retention and expired-image UX remain release work.

## Paid features

RevenueCat scaffolding is not a complete purchase system; local isPro must not authorize server features. Paid release needs verified, idempotent entitlement events, household lifecycle rules, restore/refund/expiry tests and store-compliant checkout. Charge for measurable time savings only after features exist and willingness to pay is validated.

## Test boundaries

Jest covers auth, state, adapters, sync and form retries. PostgreSQL/WASM applies every migration and tests policies, tenant isolation, ledger transactions and planning. Native PostgreSQL CI runs the SQL again, but a concurrent-connection race suite is still needed. Hosted checks were read-only after migration; no test users/purchases were created. Web compilation is not native, visual, accessibility or service-E2E verification.
