import React, { useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Download, Lock, Shield, Trash2 } from 'lucide-react-native';
import { accountApi } from '../../../lib/account';
import { useAuthStore } from '../../../store/authStore';

const C = { bg: '#F8FAFC', card: '#fff', border: '#E2E8F0', accent: '#4F46E5', text: '#0F172A', sub: '#64748B', red: '#EF4444' };

export default function PrivacyScreen() {
  const router = useRouter();
  const signOut = useAuthStore(s => s.signOut);
  const [busy, setBusy] = useState(false);
  const exportData = async () => {
    setBusy(true);
    try { await Share.share({ message: JSON.stringify(await accountApi.exportMine(), null, 2), title: 'HomeHuddle data export' }); }
    catch (error) { Alert.alert('Unable to export data', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(false); }
  };
  const deleteAccount = () => Alert.alert('Delete account?', 'This permanently deletes your sign-in account. Owners must transfer ownership or close their household first.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete account', style: 'destructive', onPress: async () => {
      setBusy(true);
      try { await accountApi.deleteMyAccount(); await signOut(); }
      catch (error) { Alert.alert('Unable to delete account', error instanceof Error ? error.message : 'Please try again.'); }
      finally { setBusy(false); }
    } },
  ]);
  return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.header}><TouchableOpacity onPress={() => router.back()}><ChevronLeft size={24} color={C.text} /></TouchableOpacity><Text style={styles.title}>Privacy & security</Text><View style={{ width: 24 }} /></View><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.hero}><Shield size={42} color={C.accent} /><Text style={styles.heroTitle}>Your data, clearly handled</Text><Text style={styles.sub}>HomeHuddle uses passwordless email sign-in. Password changes and two-factor authentication are not currently offered.</Text></View>
    <View style={styles.card}><Row icon={Lock} label="Sign-in security" description="Email code or magic link; protect access to your email account." /><Row icon={Download} label="Export my data" description="Profile, completions, reward inventory, and points ledger." onPress={exportData} /></View>
    <TouchableOpacity disabled={busy} onPress={deleteAccount} style={styles.delete}><Trash2 size={18} color={C.red} /><Text style={styles.deleteText}>{busy ? 'Working…' : 'Delete account'}</Text></TouchableOpacity>
  </ScrollView></SafeAreaView>;
}
function Row({ icon: Icon, label, description, onPress }: { icon: any; label: string; description: string; onPress?: () => void }) { return <TouchableOpacity disabled={!onPress} onPress={onPress} style={styles.row}><Icon size={20} color={C.accent} /><View style={{ flex: 1 }}><Text style={styles.label}>{label}</Text><Text style={styles.sub}>{description}</Text></View></TouchableOpacity>; }
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.bg }, header: { padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { fontSize: 17, fontWeight: '800', color: C.text }, content: { padding: 20, gap: 20 }, hero: { alignItems: 'center', gap: 10, padding: 18 }, heroTitle: { fontSize: 22, fontWeight: '900', color: C.text }, sub: { fontSize: 13, color: C.sub, lineHeight: 19, textAlign: 'center' }, card: { borderRadius: 18, borderWidth: 1, borderColor: C.border, backgroundColor: C.card }, row: { flexDirection: 'row', gap: 14, padding: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.border }, label: { color: C.text, fontWeight: '800', marginBottom: 3 }, delete: { flexDirection: 'row', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 14, backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECDD3' }, deleteText: { color: C.red, fontWeight: '800' } });
