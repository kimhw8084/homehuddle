import { create } from 'zustand';

interface OnboardingState {
  hasCompleted: boolean;
  setCompleted: (v: boolean) => void;
  restart: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  hasCompleted: true,
  setCompleted: (v) => set({ hasCompleted: v }),
  restart: () => set({ hasCompleted: false }),
}));
