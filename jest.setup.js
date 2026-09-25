jest.mock('expo', () => ({
  Constants: {},
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
