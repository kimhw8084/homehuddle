# Original UI — development-preview evidence

Captured September 23, 2026 (America/Chicago) in headless Chrome at 390×844 CSS pixels, 2× scale, reduced-motion preference enabled. All images contain sample data entered through the explicit development bypass, not real household data. No browser page errors were observed navigating the four tabs. Screenshots were visually inspected and are not native iPhone, accessibility, signed-in integration, or human design acceptance.

- [Home](home.png): authored dashboard retained; sample-data boundary visible.
- [Chores](chores.png): authored calendar, sorting, overdue panel and detailed cards retained; local-only edit boundary visible.
- [Market](market.png): authored catalog and member strips; preview control no longer overlaps the add button.
- [Wallet](wallet.png): authored chart and bag switcher; preview balance explicitly labeled.

The same Market/Wallet routes use persisted data when signed in. Their signed-in rendering and command behavior have separate component/SQL tests; these images alone do not prove that integration. Full details: [implementation checkpoint](../../original-ui-integration.md).
