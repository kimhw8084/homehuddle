import { getAuthRedirect } from '../utils/auth-route';
import { Session } from '@supabase/supabase-js';
import { useAuthStore } from '../store/authStore';

describe('auth route decisions', () => {
  it('sends initialized unauthenticated app routes to login', () => {
    expect(getAuthRedirect({
      isInitialized: true,
      isAuthorized: false,
      onboardingDone: false,
      segments: ['(app)', '(tabs)', 'chores'],
    })).toBe('/login');
  });

  it('keeps initialized unauthenticated users on login', () => {
    expect(getAuthRedirect({
      isInitialized: true,
      isAuthorized: false,
      onboardingDone: false,
      segments: ['login'],
    })).toBeNull();
  });

  it('keeps initialized unauthenticated users on the canonical auth root', () => {
    expect(getAuthRedirect({
      isInitialized: true,
      isAuthorized: false,
      onboardingDone: false,
      segments: ['index'],
    })).toBeNull();
  });

  it('sends authorized users with incomplete onboarding to onboarding', () => {
    expect(getAuthRedirect({
      isInitialized: true,
      isAuthorized: true,
      onboardingDone: false,
      segments: ['login'],
    })).toBe('/onboarding');
  });

  it('sends authorized users with completed onboarding from login to app Home', () => {
    expect(getAuthRedirect({
      isInitialized: true,
      isAuthorized: true,
      onboardingDone: true,
      segments: ['login'],
    })).toBe('/(app)/(tabs)');
  });

  it('sends authorized users with completed onboarding from the auth root to app Home', () => {
    expect(getAuthRedirect({
      isInitialized: true,
      isAuthorized: true,
      onboardingDone: true,
      segments: [],
    })).toBe('/(app)/(tabs)');
  });

  it('keeps authorized users in the app group', () => {
    expect(getAuthRedirect({
      isInitialized: true,
      isAuthorized: true,
      onboardingDone: true,
      segments: ['(app)', '(tabs)', 'chores'],
    })).toBeNull();
  });

  it('makes no route decision before auth initialization', () => {
    expect(getAuthRedirect({
      isInitialized: false,
      isAuthorized: false,
      onboardingDone: false,
      segments: ['(app)', '(tabs)', 'chores'],
    })).toBeNull();
  });

  it('routes a signed-out app session to login after clearing session and dev bypass', () => {
    const session = { user: { id: 'route-test-user' } } as unknown as Session;
    const auth = useAuthStore.getState();
    auth.setSession(session);
    auth.setInitialized(true);
    auth.setDevBypass(true);
    auth.signOut();

    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isDevBypass).toBe(false);
    expect(getAuthRedirect({
      isInitialized: state.isInitialized,
      isAuthorized: Boolean(state.session || state.isDevBypass),
      onboardingDone: true,
      segments: ['(app)', 'profile'],
    })).toBe('/login');
  });
});
