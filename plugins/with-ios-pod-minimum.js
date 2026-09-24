const { withPodfile } = require('expo/config-plugins');

// Keep resource-bundle pod targets compatible with Xcode 27 and Expo's
// iOS minimum. SDK 56 and 57 require iOS 16.4.
module.exports = function withIosPodMinimum(config) {
  return withPodfile(config, mod => {
    const marker = '# HomeHuddle: keep every pod target at the Expo iOS minimum';
    if (mod.modResults.contents.includes(marker)) return mod;
    const hook = /(post_install do \|installer\|[\s\S]*?)(\n  end)/;
    if (!hook.test(mod.modResults.contents)) throw new Error('Expected Expo post_install hook; review the iOS minimum plugin after the SDK upgrade.');
    mod.modResults.contents = mod.modResults.contents.replace(hook, `$1
    ${marker}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        current = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current.nil? || Gem::Version.new(current) < Gem::Version.new('16.4')
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '16.4'
        end
      end
    end$2`);
    return mod;
  });
};
