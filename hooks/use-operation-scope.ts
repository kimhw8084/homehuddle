import { useCallback, useEffect, useRef } from 'react';
import { currentHouseholdContextKey, currentHouseholdContextRevision, useHouseholdContext } from './use-household-context';

// An A→B→A transition does not resurrect work started in the first A. Call the
// returned guard after every await before continuing a multi-step mutation.
export function useOperationScope() {
  const { key } = useHouseholdContext();
  const lifecycle = useRef({ key, revision: 0, mounted: true });
  if (lifecycle.current.key !== key) {
    lifecycle.current.key = key; lifecycle.current.revision++;
  }
  useEffect(() => {
    const state = lifecycle.current;
    state.mounted = true;
    return () => { state.mounted = false; state.revision++; };
  }, []);
  return useCallback(() => {
    const revision = lifecycle.current.revision;
    const contextRevision = currentHouseholdContextRevision();
    return () => lifecycle.current.mounted && lifecycle.current.revision === revision && currentHouseholdContextRevision() === contextRevision && currentHouseholdContextKey() === key;
  }, [key]);
}
