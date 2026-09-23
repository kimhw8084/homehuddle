import { useAuthStore } from '../store/authStore';
import { useHuddleStore } from '../store/huddleStore';
import { useSyncExternalStore } from 'react';

/** A role change invalidates drafts as well as data, even for the same account. */
export function useHouseholdContext() {
  const userId = useAuthStore(state => state.user?.id);
  const householdId = useHuddleStore(state => state.householdId);
  const memberId = useHuddleStore(state => state.currentMemberId);
  const role = useHuddleStore(state => state.familyMembers.find(member => member.id === state.currentMemberId)?.householdRole);
  const contextRevision = useSyncExternalStore(subscribeRevision, currentHouseholdContextRevision, currentHouseholdContextRevision);
  return { userId, householdId, memberId, role, revision: contextRevision, key: [userId, householdId, memberId, role].join(':') };
}

export function currentHouseholdContextKey() {
  const state = useHuddleStore.getState();
  return [useAuthStore.getState().user?.id, state.householdId, state.currentMemberId,
    state.familyMembers.find(member => member.id === state.currentMemberId)?.householdRole].join(':');
}

// Observe every store transition, including A→B→A changes batched into a single
// React render. This module's subscriptions intentionally live for the app run.
let latestKey = currentHouseholdContextKey();
let revision = 0;
const listeners = new Set<() => void>();
const subscribeRevision = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const observeContext = () => {
  const next = currentHouseholdContextKey();
  if (next !== latestKey) { latestKey = next; revision++; listeners.forEach(listener => listener()); }
};
useAuthStore.subscribe(observeContext);
useHuddleStore.subscribe(observeContext);
export const currentHouseholdContextRevision = () => revision;
