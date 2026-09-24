import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import MarketScreen from '../app/(app)/(tabs)/market';
import WalletScreen from '../app/(app)/(tabs)/wallet';
import { useAuthStore } from '../store/authStore';
import { resetHouseholdState } from '../store/huddleStore';
import { applyHouseholdSnapshot } from '../lib/household-sync';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HouseholdSnapshot } from '../types/household';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('../hooks/use-accessibility-preferences', () => ({ useAccessibilityPreferences: () => ({ reduceMotion: true }) }));
jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(), impactAsync: jest.fn(), notificationAsync: jest.fn(), ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' }, NotificationFeedbackType: { Success: 'success', Error: 'error' } }));
jest.mock('../lib/supabase', () => ({ supabase: { rpc: jest.fn(), auth: { signOut: jest.fn() } } }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'request-a') }));
jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return { Swipeable: View };
});

function fixture(): HouseholdSnapshot {
  return {
    householdId: 'h', members: [
      { id: 'parent', household_id: 'h', auth_user_id: 'user-a', display_name: 'Morgan', avatar: '👤', role: 'owner', wallet_balance: 100 },
      { id: 'teen', household_id: 'h', auth_user_id: 'user-b', display_name: 'Sam', avatar: '🧑', role: 'teen', wallet_balance: 900 },
    ], chores: [], completions: [], inventory: [], ledger: [],
    rewards: [{ id: 'r', household_id: 'h', title: 'Choose dinner', cost: 20, description: 'Pick your favorite', active: true, created_at: '2026-09-20T12:00:00Z', emoji: '🍽️', category: 'Family', stock: 3, version: 1 }],
  };
}

beforeEach(async () => {
  jest.clearAllMocks(); await AsyncStorage.clear(); resetHouseholdState();
  useAuthStore.setState({ user: { id: 'user-a' } as any, isDevBypass: false });
  applyHouseholdSnapshot(fixture(), 'user-a');
});

it('renders the authored catalog with actual household data, not the Dad/Mom sample', () => {
  const screen = render(<MarketScreen />);
  expect(screen.getByText('Choose dinner')).toBeTruthy();
  expect(screen.queryByText('Dad')).toBeNull();
  expect(screen.queryByText('Ice Cream')).toBeNull();
  expect(screen.getAllByText('100 pts').length).toBeGreaterThan(0);
});

it('only celebrates a confirmed purchase and reuses the request after a lost response', async () => {
  const rpc = supabase.rpc as jest.Mock;
  rpc.mockResolvedValueOnce({ error: { message: 'Connection lost', code: '' }, data: null }).mockResolvedValueOnce({ error: null, data: 'inventory' });
  const screen = render(<MarketScreen />);
  fireEvent.press(screen.getByLabelText('Choose dinner, 20 points'));
  fireEvent.press(screen.getByLabelText('Confirm Choose dinner for 20 points'));
  await waitFor(() => expect(screen.getByText('Connection lost')).toBeTruthy());
  expect(screen.queryByText('−20 pts')).toBeNull();
  fireEvent.press(screen.getByLabelText('Choose dinner, 20 points'));
  fireEvent.press(screen.getByLabelText('Confirm Choose dinner for 20 points'));
  await waitFor(() => expect(screen.getByText('−20 pts')).toBeTruthy());
  expect(rpc.mock.calls).toEqual([
    ['purchase_reward_v2', { target_reward_id: 'r', target_member_id: 'parent', expected_cost: 20, request_id: 'request-a' }],
    ['purchase_reward_v2', { target_reward_id: 'r', target_member_id: 'parent', expected_cost: 20, request_id: 'request-a' }],
  ]);
  screen.unmount();
});

it('viewing a teen wallet never grants a parent permission to spend it', async () => {
  const screen = render(<MarketScreen />);
  fireEvent.press(screen.getByText('Sam'));
  fireEvent.press(screen.getByLabelText('Choose dinner, 20 points'));
  expect(supabase.rpc).not.toHaveBeenCalled();
  expect(screen.getByText(/Their purchases require their own account/)).toBeTruthy();
});

it('does not carry a purchase confirmation across a changed price', async () => {
  const screen = render(<MarketScreen />);
  fireEvent.press(screen.getByLabelText('Choose dinner, 20 points'));
  await act(async () => { const next = fixture(); next.rewards[0].cost = 30; next.rewards[0].version = 2; applyHouseholdSnapshot(next, 'user-a'); });
  expect(screen.queryByText('Confirm?')).toBeNull();
  expect(screen.getByLabelText('Choose dinner, 30 points')).toBeTruthy();
});

it('renders actual wallet history and balance without fabricated purchases', () => {
  const screen = render(<WalletScreen />);
  expect(screen.queryByText('Dad')).toBeNull();
  expect(screen.queryByText('Wash Bottles')).toBeNull();
  expect(screen.getAllByText('100').length).toBeGreaterThan(0);
});

it('retains the authored reward editor and draft when the server rejects a save', async () => {
  (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: { message: 'Reward changed on another device', code: 'P0001' } });
  const screen = render(<MarketScreen />);
  fireEvent.press(screen.getByLabelText('Open market actions'));
  fireEvent.press(screen.getByLabelText('Add a reward'));
  fireEvent.changeText(screen.getByPlaceholderText('Item name'), 'Pick dessert');
  fireEvent.changeText(screen.getByPlaceholderText('e.g. 150'), '35');
  fireEvent.press(screen.getByLabelText('Save reward'));
  await waitFor(() => expect(screen.getAllByText('Reward changed on another device').length).toBeGreaterThan(0));
  expect(screen.getByPlaceholderText('Item name').props.value).toBe('Pick dessert');
  expect(supabase.rpc).toHaveBeenCalledWith('save_market_reward', expect.objectContaining({ expected_version: 0, draft: expect.objectContaining({ name: 'Pick dessert', pts: 35, stock: null, expiresInDays: null }) }));
});
