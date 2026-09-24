import AsyncStorage from '@react-native-async-storage/async-storage';
import { marketCommand } from '../features/rewards/market-api';
import { supabase } from '../lib/supabase';

jest.mock('../lib/supabase', () => ({ supabase: { rpc: jest.fn() } }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'durable-create-id') }));

beforeEach(async () => { jest.clearAllMocks(); await AsyncStorage.clear(); });

it.each([
  ['save_market_reward', ['request_id', 'target_reward']],
  ['save_market_sale', ['sale_id']],
  ['create_wallet_fund', ['fund_id']],
] as const)('keeps %s creation identity after a lost acknowledgement and edited draft', async (rpc, identityFields) => {
  const send = supabase.rpc as jest.Mock;
  send.mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce({ data: null, error: null });
  await expect(marketCommand('user', 'household', 'create', 'new', rpc, { name: 'Original' }, () => true, [...identityFields])).rejects.toThrow('Connection lost');
  await expect(marketCommand('user', 'household', 'create', 'new', rpc, { name: 'Edited' }, () => true, [...identityFields])).rejects.toThrow('earlier change is confirmed');
  const expected = { name: 'Original', ...Object.fromEntries(identityFields.map(field => [field, 'durable-create-id'])) };
  expect(send.mock.calls).toEqual([[rpc, expected], [rpc, expected]]);
});
