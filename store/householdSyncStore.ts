import { create } from 'zustand';

type HouseholdSync = { refreshing: boolean; isOffline: boolean; lastSyncedAt?: number; error?: string };
export const useHouseholdSync = create<HouseholdSync>(() => ({ refreshing: false, isOffline: false }));
