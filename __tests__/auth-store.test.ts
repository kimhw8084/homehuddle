import { useAuthStore } from '../store/authStore';
import { useOnboardingStore } from '../store/onboardingStore';
import { supabase } from '../lib/supabase';
import { resetHouseholdState, useHuddleStore } from '../store/huddleStore';
import { useRandomGamesStore } from '../store/randomGamesStore';
import type { Session } from '@supabase/supabase-js';

jest.mock('../lib/supabase', () => ({
  supabase: { auth: { signOut: jest.fn() } },
}));

describe('authStore.signOut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetHouseholdState();
    useAuthStore.setState({ session: null, user: null, isDevBypass: true });
    useOnboardingStore.setState({ hasCompleted: true });
  });

  it('starts without sample household data', () => {
    expect(useHuddleStore.getState().familyMembers).toEqual([]);
    expect(useHuddleStore.getState().chores).toEqual([]);
    expect(useHuddleStore.getState().restockItems).toEqual([]);
    expect(useHuddleStore.getState().wifi.password).toBe('');
  });

  it('clears all household domains when switching accounts', () => {
    useAuthStore.getState().setSession({ user: { id: 'first' } } as Session);
    useHuddleStore.setState({ currentUser: 'Private name', recipes: [{ id: 'private-recipe' }] as any, wifi: { ssid: 'Private', password: 'private' }, householdId: 'old' });
    useRandomGamesStore.setState({ log: [{ id: 'private-game' }] as any });
    useOnboardingStore.getState().setCompleted(true);
    useAuthStore.getState().setSession({ user: { id: 'second' } } as Session);
    expect(useHuddleStore.getState()).toMatchObject({ currentUser: '', recipes: [], householdId: null, wifi: { ssid: '', password: '' } });
    expect(useRandomGamesStore.getState().log).toEqual([]);
    expect(useOnboardingStore.getState()).toMatchObject({ accountId: 'second', hasCompleted: false });
  });

  it('preserves household state during a token refresh for the same account', () => {
    const session = { user: { id: 'same' } } as Session;
    useAuthStore.getState().setSession(session);
    useHuddleStore.setState({ currentUser: 'Keep me' });
    useAuthStore.getState().setSession({ ...session, access_token: 'refreshed' });
    expect(useHuddleStore.getState().currentUser).toBe('Keep me');
  });

  it('forces onboarding for the next signed-in account', async () => {
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

    await useAuthStore.getState().signOut();

    expect(useOnboardingStore.getState().hasCompleted).toBe(false);
    expect(useAuthStore.getState().isDevBypass).toBe(false);
  });
});
