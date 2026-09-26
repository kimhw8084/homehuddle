# Wallet visual review

Candidate `857ea0ce5de1fd69ddf5c07da39718f89d17487e` compared with AR-88 baseline `refs/heads/project-os-artifacts/homehuddle/homehuddle-ui0-atlas-failure-recovery-v1` at `b1f3af00863dafaa036c056e60393dc41c54edcc`. The same mobile and desktop viewport sizes were inspected.

## Intended changes

- The active `Sleep In Day` fixture whose no-year expiry is `Sun, Mar 14` now resolves in UI year 2026, appears under Reward History with `EXPIRED` treatment, and has no Use/Gift/Resell row actions. `Pizza Night` remains active and its Use confirmation with note input still opens.
- At 1440×900, the graph now fills the balance-card content width (1,350 CSS px). The baseline screenshot showed the graph constrained to a mobile-width strip. At 390×844, the graph remains 300 CSS px wide and retains its authored height and mobile density.
- The Wallet/My Bag sliding pill matches the selected segment at both sizes. Runtime measurements show zero x/width difference from its selected half.

## Canonical candidate screenshots

- `screenshots/wallet-points--mobile-390x844.png`
- `screenshots/wallet-points--desktop-1440x900.png`
- `screenshots/wallet-reward-bag--mobile-390x844.png`
- `screenshots/wallet-reward-bag--desktop-1440x900.png`

The reward bag candidate differs from the baseline at the effective expired reward and the switcher geometry. The wallet points candidate differs at desktop graph width and switcher geometry. No other visible product surface changed in the inspected Wallet pages.

## Stress review

Lossless captures cover 360×800, 1536×864, and a 200% effective zoom viewport (720×450 CSS px at DPR 2) on Wallet and My Bag. Measured document horizontal overflow was 0 CSS px in all tested viewports. Additional captures show the expired history row and the nonexpired Use/note confirmation.
