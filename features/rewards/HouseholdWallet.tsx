import React, { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useHuddleStore } from '../../store/huddleStore';
import { householdApi } from '../../lib/household';
import { requestHouseholdRefresh } from '../../lib/household-events';
import { Action, Panel, usePlanningStyles } from '../../components/ui/PlanningUI';

export default function HouseholdWallet() {
  const s = usePlanningStyles();
  const router = useRouter();
  const state = useHuddleStore();
  const member = state.familyMembers.find(item => item.id === state.currentMemberId);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const bag = state.walletBag.filter(item => item.memberId === member?.id);
  const history = state.walletTransactions.filter(item => item.memberId === member?.id);
  async function redeem(id: string) {
    if (lock.current) return;
    lock.current = true; setBusy(id); setError('');
    try { await householdApi.redeemReward(id); if (state.householdId) requestHouseholdRefresh(state.householdId); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Redemption was not saved.'); }
    finally { lock.current = false; setBusy(null); }
  }
  return <SafeAreaView style={s.page}><ScrollView contentContainerStyle={s.content}>
    <Text accessibilityRole="header" style={s.title}>Your wallet</Text>
    <Panel><Text style={s.muted}>Available household points</Text><Text style={s.title}>{member?.stats.pointsEarned ?? 0}</Text><Text style={s.muted}>Points are not money. Purchases are confirmed by your household’s server.</Text><Action label="Browse rewards" onPress={() => router.push('/(app)/(tabs)/market')} /></Panel>
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    <Text style={s.heading}>Ready to enjoy</Text>
    {!bag.some(item => item.status === 'active') && <Text style={s.muted}>Your purchased rewards will appear here.</Text>}
    {bag.filter(item => item.status === 'active').map(item => <Panel key={item.id}><Text style={s.heading}>{item.name}</Text><Text style={s.muted}>{item.pts} points · Purchased {item.claimedDate}</Text><Action label={`Use ${item.name}`} disabled={!!busy} busy={busy === item.id} onPress={() => { void redeem(item.id); }} /></Panel>)}
    <Text style={s.heading}>Recent point activity</Text><Text style={s.muted}>The most recent household history is loaded, up to 100 entries. Your balance includes all transactions.</Text>
    {!history.length && <Text style={s.muted}>No point activity yet. Complete a chore to get started.</Text>}
    {history.map(entry => <Panel key={entry.id}><View style={s.row}><Text style={[s.text, { flex: 1 }]}>{entry.icon} {entry.label}</Text><Text style={s.heading}>{entry.pts > 0 ? '+' : ''}{entry.pts}</Text></View><Text style={s.muted}>{entry.date}</Text></Panel>)}
    {!!bag.filter(item => item.status === 'used').length && <Text style={s.heading}>Already enjoyed</Text>}
    {bag.filter(item => item.status === 'used').map(item => <Text key={item.id} style={s.muted}>{item.name} · {item.usedDate}</Text>)}
  </ScrollView></SafeAreaView>;
}
