import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../../lib/supabase';
import { createSnapshotSynchronizer } from '../../lib/snapshot-synchronizer';
import { onHouseholdRefresh, requestHouseholdRefresh } from '../../lib/household-events';
import { currentHouseholdContextKey, currentHouseholdContextRevision, useHouseholdContext } from '../../hooks/use-household-context';

type SharedResult<T> = { data?: T; error?: string; loading: boolean; refreshing: boolean; isOffline: boolean; lastSyncedAt?: number };
export function useSharedData<T>(tables: readonly string[], load: (householdId: string) => Promise<T>) {
  const { householdId, userId, key, revision: contextRevision } = useHouseholdContext();
  const scopeKey = `${key}:${contextRevision}`;
  const [result, setResult] = useState<SharedResult<T> & { scope: string; loader: typeof load }>({
    scope: scopeKey, loader: load, loading: true, refreshing: false, isOffline: false,
  });
  useEffect(() => {
    setResult({ scope: scopeKey, loader: load, loading: true, refreshing: false, isOffline: false });
    if (!householdId || !userId) return;
    let active = true;
    let offline = false;
    const revision = currentHouseholdContextRevision();
    const current = () => active && currentHouseholdContextRevision() === revision && currentHouseholdContextKey() === key;
    const sync = createSnapshotSynchronizer({
      load: () => load(householdId), refresh: async value => value,
      apply: data => {
        if (current()) setResult({ scope: scopeKey, loader: load, data, loading: false, refreshing: false, isOffline: offline, lastSyncedAt: Date.now() });
      },
      onError: error => {
        if (current()) setResult(old => ({ ...old, loading: false, refreshing: false,
          error: error instanceof Error ? error.message : 'Unable to sync. Check your connection.' }));
      },
    });
    const request = () => {
      if (!current()) return;
      setResult(old => ({ ...old, refreshing: old.data !== undefined, loading: old.data === undefined }));
      sync.request();
    };
    const channel = supabase.channel('planning:' + tables.join('-') + ':' + householdId);
    tables.forEach(table => channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: 'household_id=eq.' + householdId }, request));
    channel.subscribe(status => {
      if (!current()) return;
      if (status === 'SUBSCRIBED') request();
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setResult(old => ({ ...old, error: 'Live updates are delayed. Refresh to check for changes.' }));
    });
    const unsubscribe = onHouseholdRefresh(id => { if (id === householdId) request(); });
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') request(); });
    const network = NetInfo.addEventListener(state => {
      if (!current()) return;
      const connected = state.isConnected !== false && state.isInternetReachable !== false;
      const reconnect = connected && offline;
      offline = !connected;
      setResult(old => ({ ...old, isOffline: offline }));
      if (reconnect) request();
    });
    request();
    return () => { active = false; sync.dispose(); unsubscribe(); foreground.remove(); network(); void supabase.removeChannel(channel); };
  }, [householdId, userId, key, scopeKey, tables, load]);
  // Never display the preceding household/week even for the render before effect cleanup.
  const visible: SharedResult<T> = result.scope === scopeKey && result.loader === load ? result : { loading: true, refreshing: false, isOffline: false };
  return { ...visible, householdId, refresh: () => { if (householdId) requestHouseholdRefresh(householdId); } };
}
