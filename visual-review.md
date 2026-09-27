# Visual review

Candidate: `5924fb4af4033e6e7ca1042948bdbee221c182c2` (tree `719cf4a0051a6b0af390b7b8703bd5e62e1c22cc`).
Captures are lossless Chrome PNGs at DPR 1. Normal and canonical bulk screens retain the Chores structure and density; the overlay priority correction is localized to the dev launcher.

## Candidate captures

- `screenshots/chores-today-all--desktop-1440x900.png` — normal Chores, desktop.
- `screenshots/chores-today-all--mobile-390x844.png` — normal Chores, mobile.
- `screenshots/chores-bulk-selection--desktop-1440x900.png` — bulk actions, desktop.
- `screenshots/chores-bulk-selection--mobile-390x844.png` — bulk actions, mobile.
- `screenshots/chores-bulk-selection--stress-360x800.png` — bulk actions, narrow stress viewport.
- `screenshots/chores-bulk-selection--stress-200-percent-195x422.png` — effective 200% stress viewport; all five actions are visible and Defer is unobscured.

All five action centers hit their matching action or descendant at 1440x900, 390x844, 360x800, and 195x422. The action bar remains above the tab bar, and none of these documents has horizontal overflow. At 195x422 the launcher is fully hidden/accessibility-hidden while covered; after Exit it returns at its normal 44x44 position and opens the existing Dev Tools modal.

## Same-state comparison to exact R1 predecessor

The predecessor screenshots were captured from the exact R1 DevToolsOverlay source with the same candidate Chores files, browser, locale, timezone, and interaction sequence. RGB exact pixel counts:

| View | Changed pixels | Ratio | Changes outside prior FAB rectangle |
|---|---:|---:|---:|
| normal-1440x900 | 104 | 0.00008 | 104 |
| normal-390x844 | 102 | 0.00031 | 102 |
| bulk-1440x900 | 283 | 0.000218 | 43 |
| bulk-390x844 | 300 | 0.000911 | 12 |
| bulk-360x800 | 297 | 0.001031 | 8 |
| bulk-195x422 | 1576 | 0.019152 | 0 |

Normal views differ only by 104 pixels at 1440x900 and 102 pixels at 390x844 (under 0.04% in each image), with no visible body or density redesign. In canonical bulk captures, most changed pixels are within the old 44x44 FAB rectangle; 43 / 12 / 8 pixels fall outside it at desktop / 390 / 360, consistent with small raster/timing differences. At 195x422 all 1,576 changed pixels are inside the old FAB rectangle; R1 visibly placed the wrench over Defer, while R2 yields that area to the action bar.

The original R1 screenshots used for comparison are included under `predecessor/screenshots/` and are named `r1-...png`. Browser and native assistive technology are not represented by these screenshots; native VoiceOver/TalkBack and a non-gesture alternative remain unproven.
