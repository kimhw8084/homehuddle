import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistedCommand } from '../lib/persisted-command';
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'request-1') }));
beforeEach(async () => { jest.clearAllMocks(); await AsyncStorage.clear(); });

it('retries a lost acknowledgement with the same durable request ID', async () => {
  const send = jest.fn().mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce({ data: 'saved', error: null });
  await expect(persistedCommand('a', { price: 20 }, () => true, send)).rejects.toThrow('Connection lost');
  expect(await AsyncStorage.getItem('a')).not.toBeNull();
  await expect(persistedCommand('a', { price: 20 }, () => true, send)).resolves.toBe('saved');
  expect(send.mock.calls).toEqual([['request-1'], ['request-1']]);
  expect(await AsyncStorage.getItem('a')).toBeNull();
});
it('does not reinterpret an unknown purchase result as a different purchase', async () => {
  const send = jest.fn().mockRejectedValue(new Error('Timeout'));
  await expect(persistedCommand('a', { price: 20 }, () => true, send)).rejects.toThrow();
  await expect(persistedCommand('a', { price: 30 }, () => true, send)).rejects.toThrow('previous change');
  expect(send).toHaveBeenCalledTimes(1);
});
it('allows correcting an input after a definite server rollback', async () => {
  const send = jest.fn().mockResolvedValue({ data: null, error: { message: 'Stock changed', code: 'P0001' } });
  await expect(persistedCommand('a', {}, () => true, send)).rejects.toThrow('Stock changed');
  expect(await AsyncStorage.getItem('a')).toBeNull();
});
it('resolves a previous quote without charging for a newly displayed quote', async () => {
  const send = jest.fn().mockRejectedValueOnce(new Error('Timeout'));
  await expect(persistedCommand('a', { price: 20 }, () => true, send)).rejects.toThrow();
  const resume = jest.fn().mockResolvedValue({ data: 'original-purchase', error: null });
  await expect(persistedCommand('a', { price: 30 }, () => true, send, resume)).rejects.toThrow('earlier change is confirmed');
  expect(resume).toHaveBeenCalledWith('request-1', { price: 20 });
  expect(send).toHaveBeenCalledTimes(1);
  expect(await AsyncStorage.getItem('a')).toBeNull();
});
it('keeps the original request when resolving it also loses the connection', async () => {
  const send = jest.fn().mockRejectedValue(new Error('Timeout'));
  await expect(persistedCommand('a', { price: 20 }, () => true, send)).rejects.toThrow();
  await expect(persistedCommand('a', { price: 30 }, () => true, send, send)).rejects.toThrow('Timeout');
  expect(JSON.parse((await AsyncStorage.getItem('a'))!).intent).toBe(JSON.stringify({ price: 20 }));
});
it('clears a definitively rejected previous quote so the current quote can be confirmed', async () => {
  const send = jest.fn().mockRejectedValue(new Error('Timeout'));
  await expect(persistedCommand('a', { price: 20 }, () => true, send)).rejects.toThrow();
  const resume = jest.fn().mockResolvedValue({ data: null, error: { code: 'P0001', message: 'Price changed' } });
  await expect(persistedCommand('a', { price: 30 }, () => true, send, resume)).rejects.toThrow('Price changed');
  expect(await AsyncStorage.getItem('a')).toBeNull();
});
it('retains the ID for an ambiguous HTTP failure', async () => {
  const send = jest.fn().mockResolvedValue({ data: null, error: { message: 'Gateway timeout', code: '504' } });
  await expect(persistedCommand('a', {}, () => true, send)).rejects.toThrow();
  expect(await AsyncStorage.getItem('a')).not.toBeNull();
});
it('does not send after the account or role scope changes', async () => {
  const send = jest.fn();
  await expect(persistedCommand('a', {}, () => false, send)).rejects.toThrow('session changed');
  expect(send).not.toHaveBeenCalled();
});
it('serializes simultaneous taps before storage completes', async () => {
  let finish!: (value: { data: string; error: null }) => void;
  const send = jest.fn(() => new Promise<{ data: string; error: null }>(resolve => { finish = resolve; }));
  const first = persistedCommand('a', {}, () => true, send);
  await expect(persistedCommand('a', {}, () => true, send)).rejects.toThrow('already being saved');
  while (!finish) await Promise.resolve();
  finish({ data: 'saved', error: null });
  await first;
  expect(send).toHaveBeenCalledTimes(1);
});
