const { withPodfile } = require('expo/config-plugins');

// Xcode 27 rejects resource-bundle pod targets below iOS 15. Expo SDK 54
// already requires iOS 15.1, including on older Xcode versions.
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
        if current.nil? || Gem::Version.new(current) < Gem::Version.new('15.1')
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end
      end
    end$2`);
    return mod;
  });
};
