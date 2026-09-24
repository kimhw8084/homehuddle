# HomeHuddle on your iPhone — no cable

HomeHuddle now targets **Expo SDK 57**, matching the SDK 57 Expo Go installed on your iPhone. Xcode, a simulator, Apple developer enrollment, and store accounts are not needed for this preview. The app's minimum supported iOS version is now 16.4.

## Start on this Mac

1. Stop the old Expo server with **Control-C** in its Terminal window. Close the old HomeHuddle session in Expo Go.
2. Connect the Mac and iPhone to the same Wi-Fi.
3. Run this command and keep Terminal open:

```sh
rtk proxy npm --prefix /Users/haewonkim/home/development/homehuddle/HomeHuddle run start:go -- --clear
```

4. Scan the new Terminal QR code with the iPhone's **Camera** app, then tap **Open in Expo Go**. Allow Local Network access if asked. The first bundle can take a little longer.
5. If Expo Go shows its developer-menu introduction, tap **Continue**, then close the menu. HomeHuddle should show its welcome/sign-in screen.

Dependencies and the existing private `.env` are already configured on this Mac. For a fresh checkout, use Node 22.13 or newer (Node 22 is the CI baseline), run `npm ci`, and create `.env` from `.env.example` with only public client configuration. Run `npm run check:env`. Never include server/service-role secrets.

## If it cannot connect

Check iPhone Settings → Apps → Expo Go → Local Network. VPNs, guest Wi-Fi isolation, or the Mac firewall can block LAN access. Stop the LAN server with Control-C, then use the tunnel command:

```sh
rtk proxy npm --prefix /Users/haewonkim/home/development/homehuddle/HomeHuddle run start:go:tunnel -- --clear
```

Scan the **new** QR code. Tunnel mode needs internet and a third-party relay; it can be slower and its availability is external to HomeHuddle. Treat the URL as private while the development server is running.

If the mismatch message still says SDK 54, you opened an old server or recent-project entry. Use the command above from the exact project path and scan its new QR. Do not downgrade Expo Go or change only the manifest's SDK number.

If Terminal says it is using a development build, use `start:go`, not `start:simulator`; this explicitly selects Expo Go even though the project also supports native development builds.

## What this preview verifies

Use email sign-in and an owned disposable test household. The original **Market and Wallet** now save real household changes. Test reward creation, purchase, bag use/gift/refund, and savings-goal deposits/cancellation. Purchases use household points, not real money. Verify the changed balance and inventory again after reloading and on a second signed-in device.

The original **Home and Chores are still design previews** with a visible sample-data notice; their edits reset on reload and do not award real points. Their integration is not finished. The hidden development bypass also uses sample data throughout; tap its **PREVIEW** control and **Exit preview and sign in** to test persistence. Do not confuse the earlier simulator walkthrough's planned coverage with a completed original-screen integration. See [current implementation status](implementation-status.md).

Paid checkout is deliberately unavailable in Expo Go, even if billing environment flags are accidentally present. Store purchases/restore, provider-specific native authentication, and production push delivery require separate configured development/release builds and qualification. The SDK upgrade is not a claim that the full production roadmap is complete.

Expo Go 57 startup was checked on the Mac's iOS 26.5 simulator runtime. Actual iPhone interaction, email delivery, photo permissions, and two-device synchronization still need your device walkthrough.

References: [Expo SDK upgrades](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/), [Expo development server](https://docs.expo.dev/get-started/start-developing/).
