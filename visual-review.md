# Chores bulk selection web fix — visual review

## Comparison

The candidate normal-state screenshots match the exact-bound-base screenshots pixel for pixel at 1440×900 and 390×844. AR-88's Chores source blob and the bound-base Chores source blob are both `ca54cea2ec318fd64f417c6b4a0e92dd188f09b6`.

AR-88 was captured on Friday, 2026-09-25; this candidate was captured on Saturday, 2026-09-26 in `en-US` / `America/Chicago`. The date strip therefore highlights the next day. The only changed pixels against AR-88 are in the calendar date header (y=62–113): desktop 6,550 / 1,296,000 (0.5054%), mobile 1,796 / 329,160 (0.5456%). The Chores screen body below y=148 is exactly pixel-identical at both sizes.

The normal state has no material visual drift. The intended bulk-selection state now reaches the authored selected circle treatment and existing action bar. No explanatory chrome or screen redesign was added.

## Responsive evidence

At 360×800 the bulk bar occupies y=651–715, above the tab list at y=725; all actions fit. At the 200% effective viewport (195×422) the bar wraps to two rows at y=233–337, above the tab list at y=347; all actions and Exit remain visible and the document width stays 195px. Measurements and screenshots are in `runtime-console-network.json` and `screenshots/`.

## Runtime notes

The exact-base content-zone drag-end crash was reproduced before the fix. Candidate circle-zone entry, toggling, exit, and a no-move content drag complete without page errors or LogBox. A focused browser check confirmed long-press and horizontal swipe on content leave order and selection unchanged while bulk mode is active. The web Assign button is reachable but React Native Web `Alert.alert` renders no confirmation; the existing Defer sheet opened and was canceled. No bulk action was committed.

Native VoiceOver/TalkBack and a non-gesture alternative for long-press-only bulk entry remain unproven.
