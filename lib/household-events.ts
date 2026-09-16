// Mutations invalidate the single serialized household loader. Screens never race
// independent full snapshots into shared state.
const listeners = new Set<(householdId: string) => void>();
export function requestHouseholdRefresh(householdId: string) {
  listeners.forEach(listener => listener(householdId));
}
export function onHouseholdRefresh(listener: (householdId: string) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
