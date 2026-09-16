import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Mail, Users } from 'lucide-react-native';
import { useAuthStore } from '../../../store/authStore';
import { householdApi } from '../../../lib/household';
import { accountApi, Invite } from '../../../lib/account';

const C = { bg: '#F8FAFC', card: '#FFFFFF', border: '#E2E8F0', accent: '#4F46E5', text: '#0F172A', sub: '#64748B' };

export default function InviteScreen() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'parent' | 'teen'>('parent');
  const [invites, setInvites] = useState<Invite[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const id = await householdApi.getMyHouseholdId(user.id);
    setHouseholdId(id);
    if (id) setInvites(await accountApi.listInvites(id));
  }, [user]);

  useEffect(() => { load().catch(() => Alert.alert('Unable to load invitations')); }, [load]);

  const create = async () => {
    if (!householdId || !email.trim()) return;
    setSaving(true);
    try {
      await accountApi.createInvite(householdId, email, role);
      setEmail('');
      await load();
    } catch (error) {
      Alert.alert('Unable to create invitation', error instanceof Error ? error.message : 'Please try again.');
    } finally { setSaving(false); }
  };

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.header}><TouchableOpacity onPress={() => router.back()}><ChevronLeft size={24} color={C.text} /></TouchableOpacity><Text style={styles.title}>Invite family</Text><View style={{ width: 24 }} /></View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}><Users size={32} color={C.accent} /><Text style={styles.heroTitle}>Named invitations</Text><Text style={styles.sub}>Invitations are one-time, expire after 7 days, and only work for the addressed email.</Text></View>
      <View style={styles.card}>
        <Text style={styles.label}>Email address</Text><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="family@example.com" style={styles.input} />
        <Text style={styles.label}>Account type</Text><View style={styles.roles}>{(['parent', 'teen'] as const).map(value => <TouchableOpacity key={value} onPress={() => setRole(value)} style={[styles.role, role === value && styles.selected]}><Text style={[styles.roleText, role === value && styles.selectedText]}>{value === 'parent' ? 'Parent' : 'Teen (13+)'}</Text></TouchableOpacity>)}</View>
        <TouchableOpacity disabled={saving || !email.trim()} onPress={create} style={[styles.button, (saving || !email.trim()) && { opacity: .5 }]}><Mail size={18} color="#fff" /><Text style={styles.buttonText}>{saving ? 'Creating…' : 'Create invitation'}</Text></TouchableOpacity>
      </View>
      <Text style={styles.label}>Open invitations</Text>
      {invites.length === 0 ? <Text style={styles.sub}>No open invitations.</Text> : invites.map(invite => <View key={invite.id} style={styles.invite}><View style={{ flex: 1 }}><Text style={styles.email}>{invite.email}</Text><Text style={styles.sub}>{invite.role === 'parent' ? 'Parent' : 'Teen (13+)'} · expires {new Date(invite.expires_at).toLocaleDateString()}</Text></View><TouchableOpacity onPress={() => Share.share({ message: `Join my HomeHuddle household with this invitation token: ${invite.token}` })}><Text style={styles.share}>Share</Text></TouchableOpacity></View>)}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.bg }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 }, title: { fontSize: 17, fontWeight: '800', color: C.text }, content: { padding: 20, gap: 14 }, hero: { alignItems: 'center', gap: 8, marginVertical: 18 }, heroTitle: { fontSize: 22, fontWeight: '900', color: C.text }, sub: { fontSize: 13, lineHeight: 19, color: C.sub }, card: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 }, label: { color: C.sub, fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: .8 }, input: { borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 13, color: C.text }, roles: { flexDirection: 'row', gap: 8 }, role: { flex: 1, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' }, selected: { borderColor: C.accent, backgroundColor: '#EEF2FF' }, roleText: { fontWeight: '700', color: C.sub }, selectedText: { color: C.accent }, button: { marginTop: 6, flexDirection: 'row', justifyContent: 'center', gap: 8, backgroundColor: C.accent, borderRadius: 12, padding: 14 }, buttonText: { color: '#fff', fontWeight: '800' }, invite: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 14, padding: 14 }, email: { color: C.text, fontWeight: '800', marginBottom: 3 }, share: { color: C.accent, fontWeight: '800', padding: 8 } });
