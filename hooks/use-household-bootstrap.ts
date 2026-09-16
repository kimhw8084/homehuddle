import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '../store/authStore';
import { useOnboardingStore } from '../store/onboardingStore';
import { resetHouseholdState } from '../store/huddleStore';
import { householdApi } from '../lib/household';
import { householdData } from '../lib/household-data';
import { applyHouseholdSnapshot } from '../lib/household-sync';
import { createSnapshotSynchronizer } from '../lib/snapshot-synchronizer';
import { recordRuntimeMetric } from '../lib/runtime-metrics';
import { onHouseholdRefresh } from '../lib/household-events';

export function useHouseholdBootstrap() {
  const userId = useAuthStore(state => state.user?.id);
  const restartOnboarding = useOnboardingStore(state => state.restart);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'missing' | 'error'>('idle');
  const [syncWarning, setSyncWarning] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(value => value + 1), []);

  useEffect(() => {
    if (!userId) { setStatus('idle'); return; }
    let active = true;
    const cleanup: (() => void)[] = [];
    setStatus('loading');
    setSyncWarning(false);
    householdApi.getMyHouseholdId(userId).then(householdId => {
      if (!active) return;
      if (!householdId) {
        resetHouseholdState();
        setStatus('missing');
        restartOnboarding();
        return;
      }
      const sync = createSnapshotSynchronizer({
        load: () => householdData.load(householdId),
        refresh: (snapshot, table) => householdData.refresh(snapshot, householdId, table),
        apply: snapshot => {
          if (!active || useAuthStore.getState().user?.id !== userId) return;
          if (!snapshot.members.some(member => member.auth_user_id === userId)) {
            resetHouseholdState();
            setStatus('missing');
            restartOnboarding();
            sync.dispose();
            return;
          }
          applyHouseholdSnapshot(snapshot, userId);
          setStatus('ready');
          setSyncWarning(false);
        },
        onError: (_error, hasSnapshot) => {
          if (!active) return;
          recordRuntimeMetric('household_bootstrap', { success: false });
          setSyncWarning(hasSnapshot);
          if (!hasSnapshot) setStatus('error');
        },
      });
      cleanup.push(onHouseholdRefresh(id => { if (id === householdId) sync.request(); }));
      // Subscribe first so events arriving during the initial load are retained.
      let changeTimer: ReturnType<typeof setTimeout> | undefined;
      const channel = householdData.subscribe(householdId, () => {
        if (changeTimer) clearTimeout(changeTimer);
        changeTimer = setTimeout(() => sync.request(), 150);
      }, realtimeStatus => {
        if (!active) return;
        recordRuntimeMetric('realtime_status', { status: realtimeStatus });
        if (realtimeStatus === 'SUBSCRIBED') sync.request();
        if (realtimeStatus === 'CHANNEL_ERROR' || realtimeStatus === 'TIMED_OUT') setSyncWarning(true);
      });
      const foreground = AppState.addEventListener('change', state => { if (state === 'active') sync.request(); });
      let wasConnected = true;
      const network = NetInfo.addEventListener(state => {
        const connected = state.isConnected !== false && state.isInternetReachable !== false;
        if (connected && !wasConnected) sync.request();
        if (!connected) setSyncWarning(true);
        wasConnected = connected;
      });
      // Renew private proof URLs and recover any missed events during long sessions.
      const reconcile = setInterval(() => { if (AppState.currentState === 'active') sync.request(); }, 5 * 60_000);
      cleanup.push(() => { sync.dispose(); if (changeTimer) clearTimeout(changeTimer); void householdData.unsubscribe(channel); foreground.remove(); network(); clearInterval(reconcile); });
      sync.request();
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; cleanup.forEach(dispose => dispose()); };
  }, [attempt, restartOnboarding, userId]);

  return { status, retry, syncWarning };
}
