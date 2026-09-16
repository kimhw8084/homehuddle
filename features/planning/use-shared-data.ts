import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useHuddleStore } from '../../store/huddleStore';
import { createSnapshotSynchronizer } from '../../lib/snapshot-synchronizer';
import { onHouseholdRefresh, requestHouseholdRefresh } from '../../lib/household-events';

export function useSharedData<T>(tables: readonly string[], load: (householdId: string) => Promise<T>) {
  const householdId = useHuddleStore(state => state.householdId);
  const userId = useAuthStore(state => state.user?.id);
  const [result, setResult] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  useEffect(() => {
    setResult({ loading: true });
    if (!householdId || !userId) return;
    let active = true;
    const sync = createSnapshotSynchronizer({
      load: () => load(householdId), refresh: async value => value,
      apply: data => { if (active && useAuthStore.getState().user?.id === userId) setResult({ data, loading: false }); },
      onError: error => { if (active) setResult(old => ({ ...old, loading: false, error: error instanceof Error ? error.message : 'Unable to sync. Check your connection.' })); },
    });
    const channel = supabase.channel(`planning:${tables.join('-')}:${householdId}`);
    tables.forEach(table => channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `household_id=eq.${householdId}` }, () => sync.request()));
    channel.subscribe(status => {
      if (!active) return;
      if (status === 'SUBSCRIBED') sync.request();
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setResult(old => ({ ...old, error: 'Live updates are delayed. Pull to refresh.' }));
    });
    const unsubscribe = onHouseholdRefresh(id => { if (id === householdId) sync.request(); });
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') sync.request(); });
    let offline = false;
    const network = NetInfo.addEventListener(state => {
      const connected = state.isConnected !== false && state.isInternetReachable !== false;
      if (connected && offline) sync.request();
      offline = !connected;
      if (offline) setResult(old => ({ ...old, error: 'You are offline. Reconnect before saving changes.' }));
    });
    sync.request();
    return () => { active = false; sync.dispose(); unsubscribe(); foreground.remove(); network(); void supabase.removeChannel(channel); };
  }, [householdId, userId, tables, load]);
  return { ...result, householdId, refresh: () => { if (householdId) requestHouseholdRefresh(householdId); } };
}
