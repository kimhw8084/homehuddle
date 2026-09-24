import { useRef, useState } from 'react';
import { useHouseholdContext } from './use-household-context';
import { useOperationScope } from './use-operation-scope';
import { requestHouseholdRefresh } from '../lib/household-events';

export function useHouseholdCommand() {
  const context = useHouseholdContext();
  const capture = useOperationScope();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run(action: (current: () => boolean) => Promise<unknown>): Promise<boolean> {
    if (lock.current) return false;
    if (!context.userId || !context.householdId) { setError('Sign in to save shared household changes.'); return false; }
    const current = capture();
    if (!current()) return false;
    lock.current = true; setBusy(true); setError('');
    try { await action(current); return current(); }
    catch (reason) {
      if (current()) setError(reason && typeof reason === 'object' && 'message' in reason ? String(reason.message) : 'Unable to confirm the change. Check your connection and retry.');
      return false;
    } finally {
      lock.current = false;
      if (current()) { setBusy(false); requestHouseholdRefresh(context.householdId); }
    }
  }
  return { ...context, busy, error, setError, run };
}
