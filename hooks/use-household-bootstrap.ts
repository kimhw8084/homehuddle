import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useHouseholdSync } from '../store/householdSyncStore';

export function useHouseholdBootstrap() {
  const userId = useAuthStore(state => state.user?.id);
  const restartOnboarding = useOnboardingStore(state => state.restart);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'missing' | 'error'>('idle');
  const [syncWarning, setSyncWarning] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const refreshCurrent = useRef<(() => void) | null>(null);
  const retry = useCallback(() => {
    if (refreshCurrent.current) refreshCurrent.current();
    else setAttempt(value => value + 1);
  }, []);

  useEffect(() => {
    if (!userId) { setStatus('idle'); return; }
    let active = true;
    const cleanup: (() => void)[] = [];
    setStatus('loading');
    setSyncWarning(false);
    useHouseholdSync.setState({ refreshing: true, isOffline: false, lastSyncedAt: undefined, error: undefined });
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
          useHouseholdSync.setState({ refreshing: false, lastSyncedAt: Date.now(), error: undefined });
        },
        onError: (_error, hasSnapshot) => {
          if (!active) return;
          recordRuntimeMetric('household_bootstrap', { success: false });
          setSyncWarning(hasSnapshot);
          useHouseholdSync.setState({ refreshing: false, error: 'Updates are delayed. Your last loaded data may be out of date.' });
          if (!hasSnapshot) setStatus('error');
        },
      });
      const request = () => {
        if (!active || useAuthStore.getState().user?.id !== userId) return;
        useHouseholdSync.setState({ refreshing: true });
        sync.request();
      };
      refreshCurrent.current = request;
      cleanup.push(onHouseholdRefresh(id => { if (id === householdId) request(); }));
      // Subscribe first so events arriving during the initial load are retained.
      let changeTimer: ReturnType<typeof setTimeout> | undefined;
      const channel = householdData.subscribe(householdId, () => {
        if (changeTimer) clearTimeout(changeTimer);
        changeTimer = setTimeout(request, 150);
      }, realtimeStatus => {
        if (!active) return;
        recordRuntimeMetric('realtime_status', { status: realtimeStatus });
        if (realtimeStatus === 'SUBSCRIBED') request();
        if (realtimeStatus === 'CHANNEL_ERROR' || realtimeStatus === 'TIMED_OUT') {
          setSyncWarning(true);
          useHouseholdSync.setState({ error: 'Live updates are delayed. Refresh to check for changes.' });
        }
      });
      const foreground = AppState.addEventListener('change', state => { if (state === 'active') request(); });
      let wasConnected = true;
      const network = NetInfo.addEventListener(state => {
        if (!active) return;
        const connected = state.isConnected !== false && state.isInternetReachable !== false;
        if (connected && !wasConnected) request();
        if (!connected) setSyncWarning(true);
        useHouseholdSync.setState({ isOffline: !connected });
        wasConnected = connected;
      });
      // Renew private proof URLs and recover any missed events during long sessions.
      const reconcile = setInterval(() => { if (AppState.currentState === 'active') request(); }, 5 * 60_000);
      cleanup.push(() => { sync.dispose(); if (changeTimer) clearTimeout(changeTimer); void householdData.unsubscribe(channel); foreground.remove(); network(); clearInterval(reconcile); });
      request();
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; refreshCurrent.current = null; cleanup.forEach(dispose => dispose()); };
  }, [attempt, restartOnboarding, userId]);

  return { status, retry, syncWarning };
}
