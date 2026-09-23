import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Action, Panel, ScreenHeading, usePlanningStyles } from '../../../components/ui/PlanningUI';
import { accountApi } from '../../../lib/account';
import { useOperationScope } from '../../../hooks/use-operation-scope';

type Preferences = { push_enabled: boolean; chore_events: boolean; reward_events: boolean };
const defaults: Preferences = { push_enabled: true, chore_events: true, reward_events: true };
export default function NotificationsScreen() {
  const router = useRouter();
  const s = usePlanningStyles();
  const captureScope = useOperationScope();
  const [settings, setSettings] = useState<Preferences | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const lock = useRef(false);
  const load = useCallback(async () => {
    const current = captureScope();
    setError('');
    try {
      const value = await accountApi.notificationPreferences();
      if (current()) setSettings(value ?? defaults);
    } catch { if (current()) setError('Preferences could not be loaded. Retry before making changes.'); }
  }, [captureScope]);
  useEffect(() => { void load(); }, [load]);
  async function toggle(key: keyof Preferences, enabled: boolean) {
    if (!settings || lock.current) return;
    const current = captureScope();
    const next = { ...settings, [key]: enabled };
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      await accountApi.saveNotificationPreferences(next.push_enabled, next.chore_events, next.reward_events);
      if (current()) { setSettings(next); setNotice('Notification preferences saved.'); }
    } catch { if (current()) setError('This preference was not saved. Your previous settings are unchanged.'); }
    finally { lock.current = false; if (current()) setBusy(false); }
  }
  const rows: { key: keyof Preferences; title: string; description: string }[] = [
    { key: 'push_enabled', title: 'Push notifications', description: 'Allow household alerts on registered devices.' },
    { key: 'chore_events', title: 'Chore activity', description: 'Assignments, completion submissions and reviews.' },
    { key: 'reward_events', title: 'Rewards', description: 'Reward purchases and redemptions.' },
  ];
  return <SafeAreaView style={s.page}><ScrollView contentContainerStyle={s.content}>
    <Action label="Back to household" secondary disabled={busy} onPress={() => router.back()} />
    <ScreenHeading title="Notifications" subtitle="Choose the updates that help you, without extra noise." />
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {!settings && <Action label={error ? 'Retry preferences' : 'Loading preferences…'} secondary disabled={!error} onPress={() => { void load(); }} />}
    {!!notice && <Text accessibilityLiveRegion="polite" style={s.text}>{notice}</Text>}
    {rows.map(row => <Panel key={row.key}><View style={s.row}>
      <View style={{ flex: 1, minWidth: 160 }}><Text style={s.heading}>{row.title}</Text><Text style={s.muted}>{row.description}</Text></View>
      <Switch accessibilityLabel={row.title} accessibilityHint={row.description} value={settings?.[row.key] ?? false} disabled={!settings || busy} onValueChange={value => { void toggle(row.key, value); }} />
    </View></Panel>)}
    <Panel><Text style={s.heading}>Device delivery</Text><Text style={s.muted}>These preferences are saved to your account. Push delivery also requires device permission, registration, and the delivery service. Saving a preference does not send a notification.</Text>
      {process.env.EXPO_PUBLIC_PUSH_DELIVERY_ENABLED !== 'true' && <Text style={s.muted}>Remote push delivery is not enabled in this build. You can still see household updates inside the app.</Text>}
    </Panel>
  </ScrollView></SafeAreaView>;
}
