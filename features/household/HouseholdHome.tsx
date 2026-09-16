import React, { useRef, useState } from 'react';
import { Image, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useHuddleStore } from '../../store/huddleStore';
import { householdApi } from '../../lib/household';
import { requestHouseholdRefresh } from '../../lib/household-events';
import { Action, Field, Panel, planningStyles as s } from '../../components/ui/PlanningUI';
import { dateKey } from '../planning/dates';

export default function HouseholdHome() {
  const router = useRouter();
  const state = useHuddleStore();
  const member = state.familyMembers.find(item => item.id === state.currentMemberId);
  const adult = member?.householdRole === 'owner' || member?.householdRole === 'parent';
  const today = dateKey(new Date());
  const due = state.chores.filter(chore => chore.status === 'pending' && chore.dueDate <= today);
  const [busy, setBusy] = useState<string | null>(null);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const refresh = () => { if (state.householdId) requestHouseholdRefresh(state.householdId); };
  async function review(id: string, approved: boolean) {
    if (lock.current) return;
    lock.current = true; setBusy(id); setError('');
    try {
      if (approved) await householdApi.approveCompletion(id);
      else await householdApi.rejectCompletion(id, feedback[id] ?? '');
      refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Review not saved. Try again.'); }
    finally { lock.current = false; setBusy(null); }
  }
  return <SafeAreaView style={s.page}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}>
    <Text style={s.muted}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
    <Text accessibilityRole="header" style={s.title}>Hi, {member?.name || 'there'}.</Text>
    <Text style={s.muted}>A little coordination. More time together.</Text>
    <Panel><Text style={s.heading}>{due.length ? `${due.length} household ${due.length === 1 ? 'chore needs' : 'chores need'} attention` : 'You’re caught up for today'}</Text>
      <Text style={s.muted}>{due.length ? 'Start with what is due. Points are awarded after review.' : 'Plan ahead now, then enjoy the time you get back.'}</Text>
      {due.slice(0, 4).map(chore => <View key={chore.id} style={s.row}><Text style={[s.text, { flex: 1 }]}>{chore.title}</Text><Text style={s.muted}>{chore.assignee ?? 'Unassigned'}</Text></View>)}
      <Action label="Open chores" onPress={() => router.push('/(app)/(tabs)/chores')} />
    </Panel>
    <View style={s.row}><Action label="Plan dinner" secondary onPress={() => router.push('/(app)/(tabs)/family')} /><Action label="Open shopping list" secondary onPress={() => router.push('/(app)/(tabs)/restock')} /></View>
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {adult && <Text accessibilityRole="header" style={s.heading}>Ready for review · {state.pendingApprovals.length}</Text>}
    {adult && !state.pendingApprovals.length && <Text style={s.muted}>No pending reviews. Completed chores will appear here.</Text>}
    {adult && state.pendingApprovals.map(approval => <Panel key={approval.id}>
      <Text style={s.heading}>{approval.title}</Text><Text style={s.muted}>{approval.kid} · {approval.points} points · {new Date(approval.submittedAt).toLocaleString()}</Text>
      {approval.comments.map((comment, index) => <Text key={index} style={s.text}>{comment.text}</Text>)}
      {approval.photos?.map(photo => <Image key={photo} accessibilityLabel={`Proof photo for ${approval.title}`} source={{ uri: photo }} resizeMode="contain" style={{ width: '100%', height: 220, borderRadius: 12, backgroundColor: '#F1F5F9' }} />)}
      {approval.photoRequired && !approval.photos?.length && <Text style={s.error}>Photo preview is unavailable. Refresh before approving.</Text>}
      <Field label="Feedback (optional)" value={feedback[approval.id] ?? ''} maxLength={2000} onChangeText={text => setFeedback(old => ({ ...old, [approval.id]: text }))} />
      <View style={s.row}><Action label="Approve completion" busy={busy === approval.id} disabled={!!busy || (approval.photoRequired && !approval.photos?.length)} onPress={() => { void review(approval.id, true); }} />
        <Action label="Request another try" secondary disabled={!!busy} onPress={() => { void review(approval.id, false); }} /></View>
    </Panel>)}
    <Panel><Text style={s.heading}>Your points</Text><Text style={s.title}>{member?.stats.pointsEarned ?? 0}</Text><Text style={s.muted}>Household points are not money and have no cash value.</Text><Action label="View wallet" secondary onPress={() => router.push('/(app)/(tabs)/wallet')} /></Panel>
    <Action label="Household settings" secondary onPress={() => router.push('/(app)/profile')} />
  </ScrollView></SafeAreaView>;
}
