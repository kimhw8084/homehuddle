# Operations and release runbook

## Applied environment changes

The existing HomeHuddle Supabase project was restored from inactivity on September 16 UTC; its organization remained on the **free plan**. No new project, paid plan or paid service was purchased.

Applied forward migrations:

- 20260916035641_production_integrity.sql
- 20260916035654_shared_planning.sql
- 20260916035953_cover_tenant_foreign_keys.sql

Drafts originated with the CLI migration generator, were locally tested, then applied through the connected migration tool because the CLI lacked an access token. Local filenames now match the tool-recorded versions. Do not replay earlier draft filenames.

Exact before/after counts were unchanged: 3 auth users, 1 household, 1 member, 1 chore, 1 reward, no storage objects. No hosted fixture users, purchases, invitations or sign-in emails were created/sent during verification.

## Database deployment

1. Compare the exact linked project and hosted/local migration histories. Investigate drift; do not blindly use include-all.
2. Inspect exact counts, column compatibility, duplicate active identities and tenant relationships. Estimated row counts are insufficient.
3. Take a proper backup and rehearse restoration before public release. The private row/schema snapshot from this run is not a full restore-tested backup.
4. Create new files with `supabase migration new`, test in isolation and review RLS/grants.
5. Discover CLI flags via help. With CLI authentication, inspect `supabase db push --linked --dry-run --skip-vault` first. If using a connected migration tool, immediately reconcile its recorded version locally.
6. Apply reviewed forward migrations only. Large tables need staged validation/lock budgets/concurrent index builds; this release's transactional indexes were appropriate for the verified tiny dataset.
7. Recheck counts, authenticated RPCs, grants, advisors and client compatibility without printing user rows or credentials.

**Never run 202608100001_reset_test_schema.sql on existing hosted data.** It is a destructive historical reset used only in fresh isolated tests. Never run linked db reset as a deployment/repair step. Do not delete new tables to “roll back”; use reviewed forward repair or a verified restore plan.

## Auth and configuration

- Use public client URL/key only; `check:env` rejects server secrets without printing values.
- Configure exact native/web callback allowlists. Native scheme: homehuddle; route: /auth/callback. Web hosting needs SPA fallback.
- Verify email template and SMTP/rate limits. An OTP screen does not make the backend template contain a code. Test expiry, replay, cross-device opening and cancelled sign-in. [Supabase passwordless documentation](https://supabase.com/docs/guides/auth/auth-email-passwordless).
- Apple/Google need registered providers/credentials and native identifiers. Flags alone do not configure them.
- Account deletion removes sessions/identity linkage, but access tokens may last until expiry; membership checks must continue denying detached users. [Sign-out semantics](https://supabase.com/docs/guides/auth/signout).
- Use owned test accounts; never send test messages to real household members without a scoped workflow.

## Advisor review

Post-migration warnings remain:

- 15 authenticated GraphQL-visible application tables: expected client SELECT is RLS-scoped, but review whether GraphQL should be exposed. [Remediation](https://supabase.com/docs/guides/database/database-linter?lint=0027_pg_graphql_authenticated_table_exposed).
- 37 authenticated SECURITY DEFINER functions: authorized commands are intentional, but each remains a security-review surface. Do not blanket-dismiss this warning or call it an independent clean audit. [Remediation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- Leaked-password protection disabled: primarily passwordless UI, but check all enabled auth methods and available plan controls. No paid upgrade made. [Remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

All 10 uncovered foreign-key findings were resolved. Remaining unused-index notices are informational on a tiny, recently restored project; do not remove necessary indexes solely because they have not yet been used.

## Required release evidence

| Gate | Evidence |
|---|---|
| Build | Fresh Node 22 npm ci; all checks; hosted CI; actual native release build |
| Auth | Owned test accounts on two devices; OTP/link/providers, expiry, sign-out/account switch, invite callback |
| Authorization | Full role matrix; removal/transfer/closure/session behavior |
| Core | Simultaneous edits; proof/rejection/resubmission; exactly-once award/purchase; disconnect recovery |
| SQL concurrency | Separate-connection purchase/approval/role-removal races |
| Visual/accessibility | Narrow/wide web; iOS/Android; keyboard/large text/screen reader/reduced motion/modal focus |
| Data operations | Full restore drill, quotas/alarms, orphan cleanup and verified media erasure |
| Security | Privileged RPC review, history secret scan, remaining dependency advisories |
| Reliability | PII-scrubbed error monitoring, incident owner, measured latency and representative load |
| Billing | Store products/agreements; entitlement webhook; renewal/refund/restore/reconciliation |
| Push | Worker credentials; opt-in/quiet hours; receipts, deduplication and token cleanup |
| Policy | Approved privacy/terms/support, child-data handling, retention and store disclosures |

## Incident rules

- Stale UI: refresh and inspect snapshot/Realtime errors; never patch balances client-side.
- Ambiguous purchase: retry the persisted ID, not a new ID; reconcile inventory/ledger.
- Version conflict: refresh and reapply intent, never silently overwrite.
- Removed membership: clear old state and reroute; never show prior-account cache/demo data.
- Failed migration: stop, inspect history/schema and use forward repair; never rerun reset.
- Unreferenced proof: retain for reviewed cleanup. No automated orphan worker exists yet.

## Machine limitations

Docker/OrbStack stopped responding during local startup. Only task-started processes were stopped; no unrelated container was deliberately restarted. Homebrew PostgreSQL 17 stalled after partially installing binaries/dependencies; no PostgreSQL service was started. Repair this local toolchain separately before relying on native tests. Successful database results used the isolated [PostgreSQL/WASM harness](https://pglite.dev/docs/api), not native Supabase services.

The computer-use service exposed no browser/native surface, so visual QA is incomplete.

## Cost paths

Current implementation remains on the existing free project. Free pilot operation still needs quota monitoring, independent backups, limited cohorts and realistic availability/email expectations. The lean paid path in the design document prioritizes dependable database operations, email and observability. Confirm current pricing and validate retention/time saved before committing funds. No price hypothesis is validated willingness to pay.
