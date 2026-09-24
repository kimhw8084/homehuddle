# HomeHuddle — Expo SDK 57 upgrade

Validated September 23, 2026, America/Chicago. Scope: compatibility with the owner's iPhone Expo Go SDK 57 while preserving the household application. This is an engineering upgrade, not production certification or completion of the full product backlog.

## Outcome and tradeoff

The project was migrated incrementally through SDK 55 and 56 to **Expo 57.0.24**, **React Native 0.86.3**, **React 19.2.3**, and **TypeScript 6.0.3**. The committed lockfile records the complete dependency graph. Use [the wireless iPhone guide](iphone-expo-go.md).

Benefits include matching the installed Expo Go runtime, supported navigation/animation packages, current Expo bug fixes, and removal of the previously reported high-severity npm advisories. No product features were intentionally removed. The unused, obsolete `expo-av` dependency was removed; there were no source imports to migrate.

The platform tradeoff is **iOS 16.4 minimum**, up from 15.1. Node 22.13+ is required; Node 22 is the project/CI baseline. Existing SDK 54 custom development clients must be rebuilt. This does not require new store accounts or a paid Expo/Supabase tier.

## Compatibility work

- Aligned Expo modules, RN native libraries, React renderer, Jest, Babel and TypeScript; removed obsolete unused test dependencies.
- Migrated navigation imports to Expo Router's bundled navigation exports; restored Metro package-export resolution.
- Updated Worklets/Reanimated Babel configuration and the official test mocks. Removed old empty Expo mocks that broke the new runtime's fetch integration.
- Updated removed `StyleSheet.absoluteFillObject` references, color-scheme normalization, and SF Symbols typing.
- Converted core editor dirty-state baselines from render-read refs to React state, preserving unsaved-change prompts.
- Added an explicit Expo Go billing guard and regression tests: the native purchase module must never load in Expo Go, even when billing configuration is present. Custom development builds retain lazy native loading.
- Removed obsolete architecture/edge-to-edge flags. Native prebuild now targets iOS 16.4 and enables the SDK 57 scene-lifecycle backport required by the installed Xcode 27 toolchain.
- Added `start:go` and `start:go:tunnel`; neither needs a cable. Updated active setup documentation without rewriting historical evidence.

No hosted schema, household records, credentials, store products, or paid entitlements were changed by this upgrade. The Supabase review preserved the existing tenant-scoped subscription reset and pinned client version.

## Verification

| Check | Result |
|---|---|
| Clean lockfile install (`npm ci`, Node 22) | Passed |
| TypeScript | Passed |
| App regression tests | 18 suites / 62 tests passed |
| PostgreSQL/WASM migrations and policy tests | 76 assertions passed in isolation |
| Core production lint | Zero errors and warnings |
| Whole-repository lint | Zero errors; 643 warnings, including newly visible legacy Compiler diagnostics |
| Source hygiene | Passed for tracked source |
| Client environment validation | Passed without exposing secret values |
| Expo dependency alignment | Passed |
| Expo Doctor | 21/21 checks passed |
| iOS / Android / web production JS exports | All three passed |
| iOS native prebuild / CocoaPods | Passed; 125 pods installed |
| iOS simulator-target native compilation | Xcode 27 build completed with exit 0 and an app artifact; dependency/toolchain warnings remain |
| Expo Go native runtime smoke test | Expo Go 57.0.9 on iPhone 17 Pro / iOS 26.5 rendered HomeHuddle's welcome screen; served manifest reports `exposdk:57.0.0` |
| npm audit | 15 moderate, zero high, zero critical at validation time |

GitHub Actions independently runs clean `npm ci`, application gates, native PostgreSQL regression tests, Edge Function checks, dependency alignment, and all three platform JS exports. Check the successful run for the upgrade commit before using its evidence as a release gate; CI's dummy-key web artifact is not deployable.

## Known limits and follow-up

The native smoke test establishes startup compatibility, not signed-in end-to-end, accessibility, visual perfection, performance benchmarking, or physical-iPhone qualification. A nonfatal existing Reanimated opacity/layout-animation warning is still emitted on the welcome screen. Native compilation also emits upstream deprecation/Swift warnings.

React Compiler remains disabled, as before the upgrade. SDK 55+ introduced additional Compiler lint rules. Six categories of existing diagnostics are retained as **warnings only in explicitly scoped legacy files**, not hidden globally. Rules of Hooks and dependency checking remain active. The maintained core feature/UI directories retain their zero-warning gate. One documented subscription-reset exception preserves clearing the previous household/loader result before new external subscriptions run. Broader legacy cleanup is a separate task.

The remaining audit advisories involve Expo/tooling and router transitive dependencies. Automated force-fixes proposed incompatible Expo/Router downgrades, so they were not applied. Do not equate zero high/critical advisories with a complete security review.

Paid checkout remains off: store accounts and RevenueCat are not configured. Remote push delivery, durable offline writes/conflict handling, media lifecycle, provider setup, multi-device/device QA, legal/operations gates, and the remaining [production backlog](implementation-status.md) are not resolved by changing the SDK.

## Local machine and recovery

The ignored SDK 54 `ios/` directory was moved, not deleted, to `/tmp/homehuddle-expo57.IPphq0/ios-sdk54-backup` before generating SDK 57 native files. It is a temporary local recovery copy, not a durable backup. New native build products and runtime screenshots are in the same temporary directory; generated native folders remain outside Git.

SDK 57 prebuild cleans native directories by default. Preserve manual native work before rerunning it; this repository's maintained configuration belongs in `app.json` and config plugins. No global Node version or account settings were changed. Expo Go 57 and the newly compiled HomeHuddle development app were installed only in the local simulator; no physical device was modified.

To revert the source upgrade if needed, use a new Git revert commit (never reset shared main), reinstall from the reverted lockfile, and regenerate/rebuild native projects. Reverting to SDK 54 will reintroduce the mismatch with the owner's SDK 57 Expo Go. No database rollback is required for this upgrade.

## Primary references

- [Expo SDK upgrade procedure](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
- [SDK 55 release](https://expo.dev/changelog/sdk-55), [SDK 56 release](https://expo.dev/changelog/sdk-56), [SDK 57 release](https://expo.dev/changelog/sdk-57)
- [Router SDK 55→56 migration](https://docs.expo.dev/router/migrate/sdk-55-to-56/)
- [Expo iOS scene lifecycle](https://github.com/expo/fyi/blob/main/ios-scene-lifecycle.md)
- [Expo React Compiler adoption](https://docs.expo.dev/guides/react-compiler/)
