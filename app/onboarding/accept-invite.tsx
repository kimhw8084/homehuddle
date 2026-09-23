import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { accountApi } from '../../lib/account';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useAuthStore } from '../../store/authStore';
import { Action, Field, usePlanningStyles } from '../../components/ui/PlanningUI';

export default function AcceptInviteScreen() {
  const s = usePlanningStyles();
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const onboarding = useOnboardingStore();
  const user = useAuthStore(state => state.user);
  const [token, setToken] = useState(params.token ?? onboarding.pendingInvite ?? '');
  const [name, setName] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  useEffect(() => { if (params.token) { setToken(params.token); useOnboardingStore.getState().setPendingInvite(params.token); } }, [params.token]);

  async function accept() {
    if (lock.current) return;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token.trim())) { setError('Enter a valid invitation token from your household owner.'); return; }
    lock.current = true; setBusy(true); setError('');
    try {
      await accountApi.acceptInvite(token.trim(), name.trim(), undefined, confirmed);
      onboarding.setPendingInvite(null);
      onboarding.setCompleted(true);
      router.replace('/(app)/(tabs)');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <SafeAreaView style={s.page}><View style={[s.content, { paddingTop: 36 }]}>
    <Text accessibilityRole="header" style={s.title}>Join your household</Text>
    <Text style={s.muted}>Sign in with the email address invited by your household owner.</Text>
    <Field label="Invitation token" value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} maxLength={36} editable={!busy} />
    {!user ? <Action label="Sign in to accept" onPress={() => { onboarding.setPendingInvite(token.trim()); router.push('/'); }} /> : <>
      <Field label="Your display name" value={name} onChangeText={setName} maxLength={30} editable={!busy} />
      <Action secondary label={confirmed ? 'Age confirmation: yes, I am at least 13' : 'Confirm: I am at least 13 (for teen invitations)'} disabled={busy} onPress={() => setConfirmed(value => !value)} />
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      <Action label="Join household" busy={busy} disabled={!token.trim() || !name.trim()} onPress={() => { void accept(); }} />
    </>}
    <Action label="Back" secondary disabled={busy} onPress={() => router.back()} />
  </View></SafeAreaView>;
}
