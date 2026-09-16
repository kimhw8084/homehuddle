# Git and publication workflow

## Preserved starting state

Started detached at 91f50eaff57ba7fe43981d6555d4dd9f0dd716f1 with existing user edits. Local main was dcf30b3677933b8856f8e785a1dde2ba91fcb7b9, diverged by 302 versus 7 unique commits. This is not a fast-forward situation.

Implementation branch: implementation/production-foundation-20260915. Original history and working files were backed up outside the repository. Existing account/onboarding/foundation work was integrated, not reset. No rebase, hard reset, forced checkout or force push was performed.

Development transcripts (claude.txt) and split scratch copies (chores_split_*) are local-only, not release source. Removing them from the index does not purge historical copies. Environment/agent folders, generated outputs and credentials are ignored.

The tracked-source hygiene script checks local-only filenames and selected credential patterns without printing matching values. CI runs it, but it is not a historical secret audit and cannot guarantee absence of every secret type.

## Requested destination

kimhw8084/homehuddle was not accessible at inspection; this repository has no configured remote. GitHub authentication is available, but **no repository was created or pushed** in this checkpoint.

Publication needs the owner's history decision:

1. Private clean snapshot of reviewed source, while retaining old repository/history bundle locally.
2. Preserved history after scanning all historical commits for secrets/personal data/large artifacts and reconciling divergent main.

Never push history first and assume deleting files later removes secrets. Never force-push just to make branches match. Synchronization is complete only after remote/local commit equality and hosted CI are verified.

## Ongoing workflow

- Short-lived feature/fix/implementation branches; focused follow-up PRs.
- Required checks: types, tests, SQL regressions, lint, Expo alignment, web compile; native/service integration for release candidates.
- UI PRs include screenshots/accessibility evidence using the provided PR template.
- Actions SHA-pinned; lockfile committed; Dependabot weekly npm/action checks.
- Protect main with review/status checks and no force pushes once the remote exists. Remote protections are not configured yet.
- Never edit an applied migration in place; generate a forward migration.
- Tag reviewed releases with migrations/build IDs/recovery notes. Do not label this preview production-ready.
