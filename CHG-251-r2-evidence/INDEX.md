# CHG-251 R2 evidence

- Project: homehuddle
- Request: homehuddle-ui0-runtime-unblock-v2
- Fabric job: CF-271ed28547164d4053c0c3f2
- Candidate: e1a7587b70f19dba471032f9e8b96846ca3efbb3 (tree a66760b6df143a87e894d5fe636f152ea73f6bea)
- Parent/base: f8ea259d2f52aba1bc3d4aba7a034625fff33fb2
- Branch: codex/homehuddle-ui0-runtime-unblock-v2
- Target readback: origin/main = f8ea259d2f52aba1bc3d4aba7a034625fff33fb2
- Changed files: __tests__/auth-audit.test.tsx, app/index.tsx, tailwind.config.js

## Outcome

Auth web runtime fix implemented and verified against the pinned lockfile runtime. Exact-base browser execution reproduced the sensor subscription error, manual color-scheme error, and pre-activation vibration error. Candidate runs at 1440x900 and 390x844 have zero page errors, console errors, LogBox overlay, and HTTP errors. Developer Control requires two logo taps, closes/reopens safely, and theme override transitions light→dark→light. Explicit Mission Control reaches all six role=tab labels.

TypeScript and the auth audit Jest test pass. Full lint reports 62 errors and 424 warnings, all errors in unchanged files; changed files have zero lint errors and auth screen warning counts match exact base.

Evidence includes candidate identity and diff, command logs, exact-base and candidate runtime reports, six full-viewport screenshots and hashes, visual review, package checksums, and deterministic archive. Artifact Bridge is locally prestaged; provider upload/readback is unavailable in this session and is not claimed.
