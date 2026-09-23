import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import HouseholdRoutines from '../features/chores/HouseholdRoutines';
import HouseholdSubscription from '../features/household/HouseholdSubscription';
import { routinesApi } from '../features/chores/routines';
import { useSharedData } from '../features/planning/use-shared-data';
import { useHuddleStore } from '../store/huddleStore';
import { useAuthStore } from '../store/authStore';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('../features/planning/use-shared-data', () => ({ useSharedData: jest.fn() }));
jest.mock('../features/chores/routines', () => ({ routinesApi: { list: jest.fn(), create: jest.fn(), setActive: jest.fn() } }));
jest.mock('../lib/billing', () => ({ billingAvailable: false, billingLinks: {}, getHouseholdBillingStatus: jest.fn(), getBillingPackages: jest.fn(), purchaseHouseholdPlan: jest.fn(), reconcileBilling: jest.fn(), restoreHouseholdPlan: jest.fn() }));
jest.mock('../hooks/use-accessibility-preferences', () => ({ useAccessibilityPreferences: () => ({ reduceMotion: true }) }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'routine-request' }));
beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ user: { id: 'user' } as any });
  useHuddleStore.setState({ householdId: 'household', currentMemberId: 'member', familyMembers: [{ id: 'member', name: 'Alex', avatar: 'A', householdRole: 'owner', role: 'Parent', pool: 'Parents', stats: { pointsEarned: 0, choresCompleted: 0, streak: 0 } }] });
  (useSharedData as jest.Mock).mockImplementation((tables: string[]) => ({ householdId: 'household', data: tables[0] === 'chore_routines' ? [] : { active: false, isSponsor: false, hasSponsor: false, expiresAt: null }, loading: false, refresh: jest.fn() }));
});
test('free daily routine creates a stable, timezone-aware request', async () => {
  (routinesApi.create as jest.Mock).mockResolvedValue(undefined);
  const screen = render(<HouseholdRoutines />);
  fireEvent.press(screen.getByText('Create routine'));
  fireEvent.changeText(screen.getByLabelText('Chore title'), 'Morning tidy');
  fireEvent.press(screen.getByRole('radio', { name: 'Every day' }));
  fireEvent.press(screen.getByText('Save routine'));
  await waitFor(() => expect(screen.getByText('Routine saved. Its upcoming chores are ready.')).toBeTruthy());
  expect(routinesApi.create).toHaveBeenCalledWith('household', expect.objectContaining({ id: 'routine-request', title: 'Morning tidy', frequency: 'daily', interval_count: 1, timezone: expect.any(String) }));
});
test('failed routine saves preserve the draft', async () => {
  (routinesApi.create as jest.Mock).mockRejectedValue(new Error('Connection lost'));
  const screen = render(<HouseholdRoutines />);
  fireEvent.press(screen.getByText('Create routine'));
  fireEvent.changeText(screen.getByLabelText('Chore title'), 'Bins');
  fireEvent.press(screen.getByText('Save routine'));
  await waitFor(() => expect(screen.getByText('Connection lost')).toBeTruthy());
  expect(screen.getByLabelText('Chore title').props.value).toBe('Bins');
});
test('unconfigured billing has no checkout or restore controls', () => {
  const screen = render(<HouseholdSubscription />);
  expect(screen.getByText('Subscriptions are not enabled in this build. No purchase is available and you will not be charged.')).toBeTruthy();
  expect(screen.queryByText('Restore purchases')).toBeNull();
  expect(screen.queryByText(/^Continue with/)).toBeNull();
});
test('teen profiles are not shown an upsell or routine management', () => {
  useHuddleStore.setState({ familyMembers: [{ ...useHuddleStore.getState().familyMembers[0], householdRole: 'teen', role: 'Teen' }] });
  const subscription = render(<HouseholdSubscription />);
  expect(subscription.queryByText('Household Plus')).toBeNull();
  subscription.unmount();
  expect(render(<HouseholdRoutines />).queryByText('Create routine')).toBeNull();
});
