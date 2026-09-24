const mockNativeLoads = jest.fn();
let mockEnvironment = 'storeClient';
const originalEnv = { ...process.env };

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { get executionEnvironment() { return mockEnvironment; } },
  ExecutionEnvironment: { StoreClient: 'storeClient' },
}));
jest.mock('../lib/supabase', () => ({ supabase: {} }));
jest.mock('../store/authStore', () => ({ useAuthStore: { getState: () => ({ user: { id: 'test-user' } }) } }));
jest.mock('react-native-purchases', () => {
  mockNativeLoads();
  return { __esModule: true, default: { configure: jest.fn(), getOfferings: async () => ({ current: null }) } };
});

beforeEach(() => {
  jest.resetModules();
  mockNativeLoads.mockClear();
  mockEnvironment = 'storeClient';
  process.env = {
    ...originalEnv,
    EXPO_PUBLIC_BILLING_ENABLED: 'true',
    EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: 'test-public-key',
    EXPO_PUBLIC_TERMS_URL: 'https://example.com/terms',
    EXPO_PUBLIC_PRIVACY_URL: 'https://example.com/privacy',
  };
});
afterAll(() => { process.env = originalEnv; });

it('never loads the native purchase module in Expo Go, even with billing configuration present', async () => {
  const billing = await import('../lib/billing');
  expect(billing.billingAvailable).toBe(false);
  await expect(billing.getBillingPackages('test-user')).rejects.toThrow('Subscriptions are not enabled');
  expect(mockNativeLoads).not.toHaveBeenCalled();
});

it('loads the native module on demand in a configured development build', async () => {
  mockEnvironment = 'bare';
  const billing = await import('../lib/billing');
  expect(billing.billingAvailable).toBe(true);
  expect(mockNativeLoads).not.toHaveBeenCalled();
  await expect(billing.getBillingPackages('test-user')).resolves.toEqual([]);
  expect(mockNativeLoads).toHaveBeenCalledTimes(1);
});
