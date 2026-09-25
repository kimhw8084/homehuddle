import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  isInitialized: boolean;
  isDevBypass: boolean;
  setSession: (session: Session | null) => void;
  setInitialized: (initialized: boolean) => void;
  setDevBypass: (bypass: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isInitialized: false,
  isDevBypass: false,
  setSession: (session) => set({ session, user: session?.user || null }),
  setInitialized: (initialized) => set({ isInitialized: initialized }),
  setDevBypass: (isDevBypass) => set({ isDevBypass }),
  signOut: () => set({ session: null, user: null, isDevBypass: false }),
}));