/* global jest */

jest.mock('expo', () => ({
  Constants: {},
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-sensors', () => ({
  Gyroscope: {
    isAvailableAsync: jest.fn(async () => false),
    setUpdateInterval: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
  openBrowserAsync: jest.fn(),
}));
jest.mock('expo-linking', () => ({ createURL: jest.fn(() => 'homehuddle://auth/callback') }));
jest.mock('expo-blur', () => ({ BlurView: 'BlurView' }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('expo-modules-core', () => {
  const actual = jest.requireActual('expo-modules-core');
  return {
    ...actual,
    NativeModulesProxy: {},
    requireNativeModule: jest.fn(),
    requireNativeViewManager: jest.fn(),
    EventEmitter: jest.fn(),
  };
});
