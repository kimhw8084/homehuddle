# Git and publication workflow

## Preserved starting state

Started detached at 91f50eaff57ba7fe43981d6555d4dd9f0dd716f1 with existing user edits. Local main was dcf30b3677933b8856f8e785a1dde2ba91fcb7b9, diverged by 302 versus 7 unique commits. This is not a fast-forward situation.

Implementation branch: implementation/production-foundation-20260915. Original history and working files were backed up outside the repository. Existing account/onboarding/foundation work was integrated, not reset. No rebase, hard reset, forced checkout or force push was performed.

Development transcripts (claude.txt) and split scratch copies (chores_split_*) are local-only, not release source. Removing them from the index does not purge historical copies. Environment/agent folders, generated outputs and credentials are ignored.

The tracked-source hygiene script checks local-only filenames and selected credential patterns without printing matching values. CI runs it, but it is not a historical secret audit and cannot guarantee absence of every secret type.

## GitHub destination

On September 16, 2026, the owner requested that GitHub main be brought up to date. The previously absent repository was created as private: [kimhw8084/homehuddle](https://github.com/kimhw8084/homehuddle). Origin points to this repository.

Main starts with a clean source snapshot of implementation checkpoint 94b6546. The old divergent main is preserved locally as archive/main-before-sync-20260916, and the implementation branch and verified history bundles retain the earlier history. Only main is published; development transcripts and their historical commits are intentionally not uploaded. No force push or history deletion is needed.

Check current publication and CI status in GitHub Actions. Publishing source is not a production app deployment or completion of the remaining release gates.

Never push history first and assume deleting files later removes secrets. Never force-push just to make branches match. Synchronization is complete only after remote/local commit equality and hosted CI are verified.

## Ongoing workflow

The September 23 recovery commit `20b6528` mistakenly restored the March 8 snapshot `dcf30b3` and called it the latest authored UI. The owner's Home and Chores screens continued evolving through April 30 commit `c098688`; later full versions were retained in `features/demo/screens/`. The September 24 correction routes Home and Chores back to those preserved versions. Treat `features/demo/screens/` as retained authored product UI, not disposable demos. Improve these screens in place, preserve Market/Wallet's persisted implementation, and do not publish the archived history, which includes historical environment files.

- Short-lived feature/fix/implementation branches; focused follow-up PRs.
- Required checks: types, tests, SQL regressions, lint, Expo alignment, web compile; native/service integration for release candidates.
- UI PRs include screenshots/accessibility evidence using the provided PR template.
- Actions SHA-pinned; lockfile committed; Dependabot weekly npm/action checks.
- Protect main with review/status checks and no force pushes once the remote exists. Remote protections are not configured yet.
- Never edit an applied migration in place; generate a forward migration.
- Tag reviewed releases with migrations/build IDs/recovery notes. Do not label this preview production-ready.
