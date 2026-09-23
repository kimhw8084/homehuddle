# Run HomeHuddle on your Mac’s iPhone Simulator

## One-time prerequisite

Install and open the **full Xcode app**, not only Command Line Tools. In Xcode:

1. Settings → Locations → Command Line Tools: select the installed Xcode.
2. Settings → Components: install an iOS simulator runtime if missing.
3. Window → Devices and Simulators: ensure an iPhone simulator exists.

On the September 23 validation environment, Xcode 27.0, CocoaPods 1.17.0 and an iOS 26.5 runtime were present, but `Xcode.app/Contents/Developer/Applications/Simulator.app` was missing. The native app **compiled successfully**, but interactive Simulator launch could not be completed. Installing/restoring the full Xcode application is required to clear this specific error. No App Store Connect, Play Console or RevenueCat setup is needed for the free app’s simulator build.

## Run

The project already has dependencies, generated native files and private Supabase environment configuration on this Mac. From Terminal, run:

```sh
rtk proxy npm --prefix /Users/haewonkim/home/development/homehuddle/HomeHuddle run ios:simulator
```

This checks Xcode, Simulator.app, CocoaPods and available devices, picks an already-running iPhone or the first available iPhone, compiles, installs and starts Metro. Keep the terminal open. First compilation can take several minutes. Select another installed simulator by name if desired:

```sh
rtk proxy npm --prefix /Users/haewonkim/home/development/homehuddle/HomeHuddle run ios:simulator -- "iPhone 17 Pro"
```

For a fresh checkout, first run `rtk proxy npm --prefix /PATH/TO/HomeHuddle ci`, create an untracked `.env` from `.env.example`, and supply only the public Supabase URL and publishable/anon key. Do not paste service-role or RevenueCat server secrets into this file. Run `check:env` before starting. Node 22 is the project/CI baseline.

Once the native app is installed, you can restart only Metro with:

```sh
rtk proxy npm --prefix /Users/haewonkim/home/development/homehuddle/HomeHuddle run start:simulator
```

Open HomeHuddle in Simulator and select the local development server. Native dependency/config changes require `ios:simulator` again; ordinary TypeScript changes use Fast Refresh.

## What to test first

Use an owned test account and an explicitly disposable test household. Sign in normally; the hidden developer bypass opens preserved prototypes and is **not** evidence for the signed-in production UI.

1. Today → review the household summary and refresh status.
2. Plan → Chores → create, edit, submit and approve a small test chore.
3. Plan → Routines → add a free daily or weekly routine; confirm separate upcoming dates. Pause preserves already-generated chores. Archive skips one date.
4. Plan → Dinners → save a recipe and dinner; check cook selection and unsaved-change confirmation.
5. Shop → add a fractional quantity, mark purchased and undo an archive.
6. Rewards → purchase with household points and find it in Your wallet and activity. Household points are not money.
7. Household → Your household plan: subscriptions must say they are not enabled. There must be no paid checkout in this build.
8. Repeat with dark mode, larger text, reduced motion, keyboard open, and VoiceOver. Use a second device/account for cross-device synchronization; unit tests are not a substitute.

Do not turn on paid checkout during this walkthrough. Remote push notifications, physical-camera behavior, Apple sign-in, store purchase/restore and real multi-device UX still need their respective provider/device tests.

## Troubleshooting

- **Simulator.app missing:** restore the full Xcode app and select its tools as described above. The project script prints the exact missing path. Do not change app source to bypass this prerequisite.
- **No matching iPhone:** install a runtime and create a device in Xcode; rerun without an explicit device name.
- **CocoaPods missing:** install CocoaPods for your Mac’s Ruby setup, then rerun. CocoaPods is already available in the validated environment.
- **Deployment target below 15:** the committed prebuild plugin raises third-party pod targets to Expo 54’s iOS 15.1 floor. If using old generated native files, run `rtk proxy npx expo prebuild --platform ios` from the app directory, then rebuild. Do not use `--clean` on hand-edited native projects.
- **Unable to load household:** verify `.env`, internet access and the target database migrations. Do not reset the hosted database.
- **Changes seem to use old screens:** exit developer bypass and sign in to an actual test account. Production has five destinations: Today, Plan, Shop, Rewards, Household.

Reference: [Expo’s local development builds](https://docs.expo.dev/guides/local-app-development/) and [SDK 54 platform requirements](https://docs.expo.dev/versions/v54.0.0/).
