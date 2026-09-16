import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import HouseholdChores from '../features/chores/HouseholdChores';
import HouseholdMarket from '../features/rewards/HouseholdMarket';
import { resetHouseholdState, useHuddleStore } from '../store/huddleStore';
import { useAuthStore } from '../store/authStore';
import { householdApi } from '../lib/household';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../lib/supabase', () => ({ supabase: { auth: { signOut: jest.fn() } } }));
jest.mock('../lib/household', () => ({ householdApi: { createChoreV2: jest.fn(), updateChore: jest.fn(), submitCompletion: jest.fn(), purchaseReward: jest.fn(), createReward: jest.fn() } }));
jest.mock('../lib/household-proofs', () => ({ householdProofs: { upload: jest.fn() } }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => '00000000-0000-4000-8000-000000000123') }));
jest.mock('expo-image-picker', () => ({ requestMediaLibraryPermissionsAsync: jest.fn(), launchImageLibraryAsync: jest.fn() }));

describe('signed-in production screens', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    resetHouseholdState();
    useAuthStore.setState({ user: { id: 'user-a' } as any, isDevBypass: false });
    useHuddleStore.setState({ householdId: 'household-a', currentMemberId: 'member-a', currentUser: 'Alex', familyMembers: [
      { id: 'member-a', authUserId: 'user-a', householdRole: 'owner', name: 'Alex', avatar: '👤', role: 'Parent', pool: 'Parents', stats: { pointsEarned: 100, choresCompleted: 0, streak: 0 } },
    ] });
  });

  it('validates chore dates and prevents duplicate save requests', async () => {
    let finish!: () => void;
    (householdApi.createChoreV2 as jest.Mock).mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
    const screen = render(<HouseholdChores />);
    fireEvent.press(screen.getByText('Add chore'));
    fireEvent.changeText(screen.getByLabelText('What needs doing?'), 'Wash dishes');
    fireEvent.changeText(screen.getByLabelText('Due date (YYYY-MM-DD)'), '2026-02-31');
    fireEvent.press(screen.getByText('Save chore'));
    await waitFor(() => expect(screen.getByText('Enter a valid date in YYYY-MM-DD format.')).toBeTruthy());
    expect(householdApi.createChoreV2).not.toHaveBeenCalled();
    fireEvent.changeText(screen.getByLabelText('Due date (YYYY-MM-DD)'), '2026-09-16');
    fireEvent.press(screen.getByText('Save chore'));
    fireEvent.press(screen.getByLabelText('Save chore'));
    expect(householdApi.createChoreV2).toHaveBeenCalledTimes(1);
    expect(householdApi.createChoreV2).toHaveBeenCalledWith(expect.objectContaining({ householdId: 'household-a', title: 'Wash dishes', dueDate: '2026-09-16', requestId: expect.any(String) }));
    await act(async () => { finish(); });
    await waitFor(() => expect(screen.getByText('Chore saved to your household.')).toBeTruthy());
  });

  it('does not offer adult chore management to a teen', () => {
    useHuddleStore.setState({ familyMembers: [{ ...useHuddleStore.getState().familyMembers[0], householdRole: 'teen', role: 'Teen' }] });
    const screen = render(<HouseholdChores />);
    expect(screen.queryByText('Add chore')).toBeNull();
    expect(screen.getByText('An adult can add and assign household chores.')).toBeTruthy();
  });

  it('reuses a persisted purchase request after a lost response', async () => {
    useHuddleStore.setState({ marketItems: [{ id: 'reward-a', name: 'Movie night', emoji: '🎁', pts: 20, category: 'Rewards', desc: '', purchaseCount: 0, stock: null, expiresInDays: null, eligibleMembers: [], curators: [], createdBy: '', priceHistory: [] }] });
    const purchase = householdApi.purchaseReward as jest.Mock;
    purchase.mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce('inventory-a');
    const screen = render(<HouseholdMarket />);
    fireEvent.press(screen.getByText('Get this reward'));
    fireEvent.press(screen.getByText('Confirm purchase'));
    await waitFor(() => expect(screen.getByText('Connection lost')).toBeTruthy());
    const key = 'homehuddle:purchase:user-a:member-a:reward-a';
    const requestId = await AsyncStorage.getItem(key);
    expect(requestId).not.toBeNull();
    fireEvent.press(screen.getByText('Confirm purchase'));
    await waitFor(() => expect(screen.getByText('Purchase confirmed. Your reward is in your wallet.')).toBeTruthy());
    expect(purchase.mock.calls).toEqual([
      ['reward-a', 'member-a', requestId, 20], ['reward-a', 'member-a', requestId, 20],
    ]);
    expect(await AsyncStorage.getItem(key)).toBeNull();
  });
});
