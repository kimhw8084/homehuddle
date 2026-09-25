# Pinned theme runtime inspection

Versions from the committed lockfile install: Expo 54.0.33, NativeWind 4.2.2, react-native-css-interop 0.2.2, react-native-web 0.21.2.

The installed NativeWind stylesheet.ts throws when useColorScheme().setColorScheme() is called while the darkMode flag is media. The CSS interop web color-scheme source throws the matching manual-scheme error for media. The installed React Native Web Appearance export exposes getColorScheme and addChangeListener, but no setColorScheme. Setting the existing Tailwind authority to darkMode: class and using NativeWind useColorScheme().setColorScheme supports the current explicit auth override. The NativeWind native appearance observable forwards set requests to React Native Appearance.setColorScheme, preserving the supported native mechanism.

The change affects only the auth surface runtime plus the strategy authority needed for its existing override; no app routes or visual tokens were edited.