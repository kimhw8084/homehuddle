import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';

interface OnboardingState {
  accountId: string | null;
  pendingInvite: string | null;
  setPendingInvite: (token: string | null) => void;
  bindAccount: (accountId: string | null) => void;
  hasCompleted: boolean;
  hasHydrated: boolean;
  setCompleted: (v: boolean) => void;
  setHydrated: (v: boolean) => void;
  restart: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      accountId: null,
      pendingInvite: null,
      setPendingInvite: (pendingInvite) => set({ pendingInvite }),
      bindAccount: (accountId) => {
        if (get().accountId !== accountId) set({ accountId, hasCompleted: false });
      },
      hasCompleted: false,
      hasHydrated: false,
      setCompleted: (v) => set({ hasCompleted: v }),
      setHydrated: (v) => set({ hasHydrated: v }),
      restart: () => set({ hasCompleted: false }),
    }),
    {
      name: 'homehuddle-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ hasCompleted, accountId }) => ({ hasCompleted, accountId }),
      onRehydrateStorage: () => (state) => {
        if (state) state.setHydrated(true);
        else useOnboardingStore.setState({ hasHydrated: true });
      },
    }
  )
);
