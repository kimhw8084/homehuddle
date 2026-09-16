import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Download, Home, Plus, Trash2, UserPlus } from 'lucide-react-native';
import { useAuthStore } from '../../../store/authStore';
import { accountApi, ManagedMember } from '../../../lib/account';
import { householdApi } from '../../../lib/household';

const C = { bg: '#F8FAFC', card: '#fff', border: '#E2E8F0', accent: '#4F46E5', text: '#0F172A', sub: '#64748B', red: '#DC2626' };

export default function HouseholdScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [members, setMembers] = useState<ManagedMember[]>([]);
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<'name' | 'child' | 'child-edit' | null>(null);
  const [draft, setDraft] = useState('');
  const [selectedMember, setSelectedMember] = useState<ManagedMember | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const id = await householdApi.getMyHouseholdId(user.id);
    if (!id) return;
    const [household, nextMembers] = await Promise.all([householdApi.getHousehold(id), accountApi.listMembers(id)]);
    setHouseholdId(id); setName(household?.name ?? 'Your household'); setMembers(nextMembers);
  }, [user]);
  useEffect(() => { load().catch(() => Alert.alert('Unable to load household', 'Please try again.')); }, [load]);

  const mine = members.find((member) => member.auth_user_id === user?.id);
  const isOwner = mine?.role === 'owner';
  const save = async () => {
    if (!householdId || !draft.trim()) return;
    setBusy(true);
    try {
      if (editor === 'name') await accountApi.updateHouseholdName(householdId, draft.trim());
      if (editor === 'child') await householdApi.addMember({ householdId, name: draft.trim(), role: 'child' });
      if (editor === 'child-edit' && selectedMember) await accountApi.updateChildProfile(selectedMember.id, draft.trim(), selectedMember.avatar ?? undefined);
      setEditor(null); setDraft(''); await load();
    } catch (error) { Alert.alert('Unable to save', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(false); }
  };
  const remove = (member: ManagedMember) => Alert.alert(`Remove ${member.display_name}?`, 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: async () => { try { await accountApi.removeMember(member.id); await load(); } catch (error) { Alert.alert('Unable to remove member', error instanceof Error ? error.message : 'Please try again.'); } } },
  ]);
  const manage = (member: ManagedMember) => {
    if (!isOwner || member.role === 'owner') return;
    if (member.role === 'child') {
      Alert.alert(member.display_name, 'Manage this parent-managed child profile.', [
        { text: 'Edit name', onPress: () => { setSelectedMember(member); setDraft(member.display_name); setEditor('child-edit'); } },
        { text: 'Remove', style: 'destructive', onPress: () => remove(member) }, { text: 'Cancel', style: 'cancel' },
      ]); return;
    }
    const nextRole = member.role === 'parent' ? 'teen' : 'parent';
    Alert.alert(member.display_name, 'Manage this signed-in household member.', [
      { text: `Make ${nextRole}`, onPress: async () => { try { await accountApi.changeMemberRole(member.id, nextRole); await load(); } catch (error) { Alert.alert('Unable to change role', error instanceof Error ? error.message : 'Please try again.'); } } },
      { text: 'Transfer ownership', onPress: async () => { try { await accountApi.transferOwnership(member.id); await load(); } catch (error) { Alert.alert('Unable to transfer ownership', error instanceof Error ? error.message : 'Please try again.'); } } },
      { text: 'Remove', style: 'destructive', onPress: () => remove(member) }, { text: 'Cancel', style: 'cancel' },
    ]);
  };
  const exportHousehold = async () => { try { await Share.share({ title: 'Household export', message: JSON.stringify(await accountApi.exportHousehold(), null, 2) }); } catch (error) { Alert.alert('Unable to export', error instanceof Error ? error.message : 'Please try again.'); } };
  const close = () => Alert.alert('Close household?', 'This permanently removes the household and its shared data.', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Close household', style: 'destructive', onPress: async () => { try { await accountApi.closeHousehold(); router.replace('/onboarding'); } catch (error) { Alert.alert('Unable to close household', error instanceof Error ? error.message : 'Please try again.'); } } },
  ]);

  return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.header}><TouchableOpacity onPress={() => router.back()}><ChevronLeft size={24} color={C.text} /></TouchableOpacity><Text style={styles.title}>Household</Text><View style={{ width: 24 }} /></View><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.hero}><Home size={32} color={C.accent} /><Text style={styles.name}>{name || 'Loading…'}</Text>{isOwner && <TouchableOpacity onPress={() => { setDraft(name); setEditor('name'); }}><Text style={styles.link}>Rename household</Text></TouchableOpacity>}</View>
    <Text style={styles.section}>Members</Text><View style={styles.card}>{members.map((member) => <TouchableOpacity key={member.id} disabled={!isOwner || member.role === 'owner'} onPress={() => manage(member)} style={styles.member}><Text style={styles.avatar}>{member.avatar || (member.role === 'child' ? '🧒' : '👤')}</Text><View style={{ flex: 1 }}><Text style={styles.memberName}>{member.display_name}</Text><Text style={styles.sub}>{member.role === 'teen' ? 'Teen (13+)' : member.role}</Text></View>{isOwner && member.role !== 'owner' && <Text style={styles.link}>Manage</Text>}</TouchableOpacity>)}</View>
    {isOwner && <><TouchableOpacity style={styles.action} onPress={() => { setDraft(''); setEditor('child'); }}><Plus size={18} color={C.accent} /><Text style={styles.actionText}>Add child profile</Text></TouchableOpacity><TouchableOpacity style={styles.action} onPress={() => router.push('/settings/invite')}><UserPlus size={18} color={C.accent} /><Text style={styles.actionText}>Invite parent or teen</Text></TouchableOpacity><TouchableOpacity style={styles.action} onPress={exportHousehold}><Download size={18} color={C.accent} /><Text style={styles.actionText}>Export household data</Text></TouchableOpacity><TouchableOpacity style={[styles.action, styles.danger]} onPress={close}><Trash2 size={18} color={C.red} /><Text style={[styles.actionText, { color: C.red }]}>Close household</Text></TouchableOpacity></>}
  </ScrollView><Modal transparent visible={editor !== null} animationType="fade"><View style={styles.modalBackdrop}><View style={styles.modal}><Text style={styles.modalTitle}>{editor === 'name' ? 'Rename household' : editor === 'child-edit' ? 'Edit child profile' : 'Add child profile'}</Text><TextInput style={styles.input} value={draft} onChangeText={setDraft} autoFocus placeholder={editor === 'name' ? 'Household name' : 'Child name'} maxLength={editor === 'name' ? 80 : 30} /><View style={styles.modalActions}><TouchableOpacity onPress={() => setEditor(null)}><Text style={styles.sub}>Cancel</Text></TouchableOpacity><TouchableOpacity disabled={busy || !draft.trim()} onPress={save}><Text style={styles.link}>{busy ? 'Saving…' : 'Save'}</Text></TouchableOpacity></View></View></View></Modal></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.bg }, header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, title: { fontSize: 17, fontWeight: '800', color: C.text }, content: { padding: 20, gap: 12 }, hero: { alignItems: 'center', backgroundColor: C.card, borderColor: C.border, borderWidth: 1, padding: 24, borderRadius: 20, gap: 9 }, name: { fontSize: 22, fontWeight: '900', color: C.text }, link: { color: C.accent, fontWeight: '800' }, section: { color: C.sub, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginTop: 12 }, card: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 16 }, member: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: C.border }, avatar: { fontSize: 24 }, memberName: { color: C.text, fontWeight: '800' }, sub: { color: C.sub, fontSize: 13, marginTop: 2 }, action: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 15, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 14 }, actionText: { color: C.accent, fontWeight: '800' }, danger: { marginTop: 8, backgroundColor: '#FFF7F7' }, modalBackdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#0008' }, modal: { backgroundColor: C.card, borderRadius: 18, padding: 20, gap: 14 }, modalTitle: { color: C.text, fontSize: 18, fontWeight: '900' }, input: { borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 13, color: C.text }, modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24 } });
