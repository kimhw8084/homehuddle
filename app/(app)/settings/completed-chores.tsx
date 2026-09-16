import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CheckCircle2, ChevronLeft, Zap } from 'lucide-react-native';
import { useHuddleStore } from '../../../store/huddleStore';

const C = { bg: '#F8FAFC', card: '#fff', border: '#E2E8F0', accent: '#4F46E5', text: '#0F172A', sub: '#64748B', green: '#10B981' };
export default function CompletedChoresScreen() {
  const router = useRouter();
  const chores = useHuddleStore(s => s.chores).filter(chore => chore.status === 'completed' && !chore.deletedAt);
  return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.header}><TouchableOpacity onPress={() => router.back()}><ChevronLeft size={24} color={C.text} /></TouchableOpacity><Text style={styles.title}>Completed chores</Text><View style={{ width: 24 }} /></View><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.sub}>Approved chore activity from your household.</Text>
    {chores.length === 0 ? <View style={styles.empty}><CheckCircle2 size={32} color={C.green} /><Text style={styles.sub}>No completed chores yet.</Text></View> : <View style={styles.list}>{chores.map(chore => <View key={chore.id} style={styles.row}><CheckCircle2 size={20} color={C.green} /><View style={{ flex: 1 }}><Text style={styles.name}>{chore.title}</Text><Text style={styles.sub}>{chore.completedAt ? new Date(chore.completedAt).toLocaleDateString() : 'Approved'}</Text></View><View style={styles.points}><Zap size={12} color={C.accent} /><Text style={styles.pointText}>+{chore.points}</Text></View></View>)}</View>}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.bg }, header: { padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { color: C.text, fontWeight: '800', fontSize: 17 }, content: { padding: 20, gap: 18 }, sub: { color: C.sub, fontSize: 13 }, empty: { alignItems: 'center', gap: 10, padding: 42 }, list: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16 }, row: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 12, borderBottomWidth: 1, borderBottomColor: C.border }, name: { color: C.text, fontWeight: '800', marginBottom: 4 }, points: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, gap: 3 }, pointText: { color: C.accent, fontWeight: '800' } });
