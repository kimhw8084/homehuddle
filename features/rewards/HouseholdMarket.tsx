import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { MarketItem, useHuddleStore } from '../../store/huddleStore';
import { useAuthStore } from '../../store/authStore';
import { householdApi } from '../../lib/household';
import { requestHouseholdRefresh } from '../../lib/household-events';
import { Action, Field, Panel, planningStyles as s } from '../../components/ui/PlanningUI';

type Draft = { id?: string; name: string; cost: string; description: string };
export default function HouseholdMarket() {
  const state = useHuddleStore();
  const userId = useAuthStore(value => value.user?.id);
  const member = state.familyMembers.find(item => item.id === state.currentMemberId);
  const adult = member?.householdRole === 'owner' || member?.householdRole === 'parent';
  const balance = member?.stats.pointsEarned ?? 0;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [purchase, setPurchase] = useState<MarketItem | null>(null);
  const [archive, setArchive] = useState<MarketItem | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function run(action: () => Promise<string>) {
    if (lock.current || !state.householdId) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try { setNotice(await action()); requestHouseholdRefresh(state.householdId); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Your change was not saved. Please try again.'); requestHouseholdRefresh(state.householdId); }
    finally { lock.current = false; setBusy(false); }
  }
  return <SafeAreaView style={s.page}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <Text accessibilityRole="header" style={s.title}>Rewards</Text><Text style={s.muted}>Meaningful rewards, chosen by your household. No real-money purchases here.</Text>
    <Panel><Text style={s.muted}>Your available points</Text><Text style={s.title}>{balance}</Text></Panel>
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}{!!notice && <Text accessibilityLiveRegion="polite" style={s.muted}>{notice}</Text>}
    {adult && <Action label="Add a reward" disabled={busy} onPress={() => setDraft({ name: '', cost: '50', description: '' })} />}
    {draft && <Panel><Text style={s.heading}>{draft.id ? 'Edit reward' : 'Create a reward'}</Text>
      <Field label="Reward name" value={draft.name} maxLength={100} editable={!busy} onChangeText={name => setDraft(old => old ? { ...old, name } : null)} />
      <Field label="Cost in points" value={draft.cost} keyboardType="number-pad" editable={!busy} onChangeText={cost => setDraft(old => old ? { ...old, cost } : null)} />
      <Field label="Description (optional)" value={draft.description} multiline maxLength={2000} editable={!busy} onChangeText={description => setDraft(old => old ? { ...old, description } : null)} />
      <Action label="Save reward" busy={busy} disabled={!draft.name.trim()} onPress={() => { void run(async () => {
        const cost = Number(draft.cost);
        if (!Number.isInteger(cost) || cost < 1 || cost > 100000) throw new Error('Cost must be a whole number between 1 and 100,000.');
        const input = { title: draft.name.trim(), cost, description: draft.description };
        if (draft.id) await householdApi.updateReward({ ...input, id: draft.id });
        else await householdApi.createReward({ ...input, householdId: state.householdId! });
        setDraft(null); return 'Reward saved. Previous purchases keep their original terms.';
      }); }} /><Action label="Cancel reward edit" secondary disabled={busy} onPress={() => setDraft(null)} />
    </Panel>}
    {!state.marketItems.length && <Panel><Text style={s.heading}>Something to look forward to</Text><Text style={s.muted}>{adult ? 'Add a reward such as choosing dinner or a family movie night.' : 'An adult can add household rewards here.'}</Text></Panel>}
    {state.marketItems.map(item => <Panel key={item.id}><Text style={s.heading}>{item.name}</Text><Text style={s.text}>{item.pts} points</Text>{!!item.desc && <Text style={s.muted}>{item.desc}</Text>}
      <View style={s.row}><Action label={balance >= item.pts ? 'Get this reward' : `${item.pts - balance} more points needed`} disabled={busy || balance < item.pts} onPress={() => { setPurchase(item); setError(''); }} />
        {adult && <><Action label="Edit reward" secondary disabled={busy} onPress={() => setDraft({ id: item.id, name: item.name, cost: String(item.pts), description: item.desc })} /><Action label="Archive reward" secondary disabled={busy} onPress={() => setArchive(item)} /></>}</View>
      {purchase?.id === item.id && <View style={{ gap: 12 }}><Text style={s.text}>Use {purchase.pts} points for {purchase.name}?</Text><Text style={s.muted}>This will appear in your wallet. If a connection fails, retry to confirm the same purchase.</Text>
        <Action label="Confirm purchase" busy={busy} onPress={() => { void run(async () => {
          if (!userId || !member?.id) throw new Error('Your member profile is not ready.');
          const key = `homehuddle:purchase:${userId}:${member.id}:${item.id}`;
          // Persist the operation ID before making the request. An app restart
          // or a lost response must not turn a retry into a second debit.
          const requestId = await AsyncStorage.getItem(key) ?? randomUUID();
          await AsyncStorage.setItem(key, requestId);
          await householdApi.purchaseReward(item.id, member.id, requestId, purchase.pts);
          await AsyncStorage.removeItem(key);
          setPurchase(null); return 'Purchase confirmed. Your reward is in your wallet.';
        }); }} /><Action label="Cancel purchase" secondary disabled={busy} onPress={() => setPurchase(null)} />
      </View>}
      {archive?.id === item.id && <View style={{ gap: 12 }}><Text style={s.muted}>Archive this reward? Existing purchases remain usable.</Text><Action label="Confirm archive" disabled={busy} onPress={() => { void run(async () => { await householdApi.updateReward({ id: item.id, title: item.name, cost: item.pts, description: item.desc, active: false }); setArchive(null); return 'Reward archived. Existing purchases were preserved.'; }); }} /><Action label="Keep reward" secondary disabled={busy} onPress={() => setArchive(null)} /></View>}
    </Panel>)}
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
