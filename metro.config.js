const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Prevent Metro from using the "source" field in package.json exports,
// which can cause duplicate module instances and broken React contexts.
config.resolver = config.resolver ?? {};
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: "./global.css" });
