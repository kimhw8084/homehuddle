import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useOnboardingStore } from './onboardingStore';
import { resetHouseholdState, useHuddleStore } from './huddleStore';
import { useRandomGamesStore } from './randomGamesStore';

interface AuthState {
  session: Session | null;
  user: User | null;
  isInitialized: boolean;
  isDevBypass: boolean;
  setSession: (session: Session | null) => void;
  setInitialized: (initialized: boolean) => void;
  setDevBypass: (bypass: boolean) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isInitialized: false,
  isDevBypass: false,
  setSession: (session) => {
    if (get().user?.id !== session?.user.id || (session && get().isDevBypass)) {
      resetHouseholdState();
      useRandomGamesStore.setState({ log: [] });
      useOnboardingStore.getState().bindAccount(session?.user.id ?? null);
    }
    set({ session, user: session?.user || null, isDevBypass: session ? false : get().isDevBypass });
  },
  setInitialized: (initialized) => set({ isInitialized: initialized }),
  setDevBypass: (isDevBypass) => {
    if (!__DEV__ || get().session) return;
    if (isDevBypass) useHuddleStore.getState().resetToMockData();
    else resetHouseholdState();
    set({ isDevBypass });
  },
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    resetHouseholdState();
    useRandomGamesStore.setState({ log: [] });
    useOnboardingStore.getState().bindAccount(null);
    useOnboardingStore.getState().restart();
    set({ session: null, user: null, isDevBypass: false });
  },
}));
