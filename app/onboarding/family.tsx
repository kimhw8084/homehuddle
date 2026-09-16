/**
 * Onboarding Step 3 — Family Setup
 * Add / edit household members. Each has avatar picker + name + role.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X } from 'lucide-react-native';
import { AvatarPicker, InitialsAvatar, AvatarValue } from '../../components/AvatarPicker';
import { useHuddleStore, FamilyMember } from '../../store/huddleStore';

const C = {
  bg: '#F8FAFC',
  accent: '#4F46E5',
  accentBg: '#EEF2FF',
  text: '#0F172A',
  sub: '#64748B',
  card: '#FFFFFF',
  border: '#E2E8F0',
  muted: '#F1F5F9',
  red: '#EF4444',
  green: '#10B981',
};

// Colours assigned round-robin to new members
const ACCENT_POOL = ['#4F46E5', '#EC4899', '#10B981', '#F59E0B', '#06B6D4', '#8B5CF6', '#F97316'];

interface MemberDraft {
  name: string;
  avatar: AvatarValue;
  role: 'Parent' | 'Child';
  pool: 'Parents' | 'Kids' | 'Me';
}

export default function OnboardingFamily() {
  const router = useRouter();
  const { familyMembers, currentUser, addFamilyMember, removeFamilyMember, updateMemberAvatar, updateMemberName } = useHuddleStore();

  // The current user (set in previous step) — shown but not editable here
  const adminMember = familyMembers.find(m => m.name === currentUser) ?? familyMembers[0];

  // All OTHER members that can be added/edited/removed
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null); // index in familyMembers (excluding admin)
  const [draft, setDraft] = useState<MemberDraft>({ name: '', avatar: '', role: 'Child', pool: 'Kids' });
  const [draftError, setDraftError] = useState('');

  const otherMembers = familyMembers.filter(m => m.name !== adminMember?.name);

  const accentFor = (i: number) => ACCENT_POOL[i % ACCENT_POOL.length];

  const openAdd = () => {
    setEditingIndex(null);
    setDraft({ name: '', avatar: '', role: 'Child', pool: 'Kids' });
    setDraftError('');
    setModalOpen(true);
  };

  const openEdit = (member: FamilyMember, idx: number) => {
    setEditingIndex(idx);
    setDraft({
      name: member.name,
      avatar: (member.avatar as AvatarValue) ?? '',
      role: member.role === 'Parent' ? 'Parent' : 'Child',
      pool: member.pool as 'Parents' | 'Kids' | 'Me',
    });
    setDraftError('');
    setModalOpen(true);
  };

  const saveDraft = () => {
    const trimmed = draft.name.trim();
    if (!trimmed) { setDraftError('Name is required.'); return; }
    const exists = familyMembers.some(m => m.name === trimmed && (editingIndex === null || m.name !== otherMembers[editingIndex]?.name));
    if (exists) { setDraftError('A member with that name already exists.'); return; }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (editingIndex !== null) {
      const old = otherMembers[editingIndex];
      if (old.name !== trimmed) updateMemberName(old.name, trimmed);
      if (draft.avatar !== old.avatar) updateMemberAvatar(trimmed, draft.avatar);
    } else {
      addFamilyMember({ name: trimmed, avatar: draft.avatar, role: draft.role, pool: draft.pool });
    }
    setModalOpen(false);
  };

  const confirmRemove = (member: FamilyMember) => {
    Alert.alert(
      `Remove ${member.name}?`,
      'This will remove them from your household. You can add them back later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: () => { removeFamilyMember(member.name); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); },
        },
      ]
    );
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/onboarding/done');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={C.sub} />
        </TouchableOpacity>
        <View style={styles.stepRow}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={[styles.stepDot, i === 3 && { backgroundColor: C.accent, width: 20 }]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>3 of 4</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Your Family</Text>
        <Text style={styles.subtitle}>Add the people who live in your household. You can always edit this later.</Text>

        {/* Admin card (read-only here) */}
        <Text style={styles.sectionLabel}>You</Text>
        <View style={styles.memberCard}>
          <InitialsAvatar
            name={adminMember?.name ?? '?'}
            avatar={adminMember?.avatar}
            size={48}
            accentColor={C.accent}
          />
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{adminMember?.name ?? 'Admin'}</Text>
            <Text style={styles.memberRole}>Admin · {adminMember?.role}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: C.accentBg }]}>
            <Text style={[styles.roleBadgeText, { color: C.accent }]}>Admin</Text>
          </View>
        </View>

        {/* Other members */}
        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Household Members</Text>

        {otherMembers.map((m, i) => (
          <View key={m.name} style={styles.memberCard}>
            <InitialsAvatar name={m.name} avatar={m.avatar} size={48} accentColor={accentFor(i + 1)} />
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{m.name}</Text>
              <Text style={styles.memberRole}>{m.role} · {m.pool}</Text>
            </View>
            <TouchableOpacity onPress={() => openEdit(m, i)} style={styles.iconBtn}>
              <Pencil size={16} color={C.sub} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => confirmRemove(m)} style={[styles.iconBtn, { marginLeft: 4 }]}>
              <Trash2 size={16} color={C.red} />
            </TouchableOpacity>
          </View>
        ))}

        {/* Add member */}
        <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
          <Plus size={18} color={C.accent} />
          <Text style={styles.addBtnText}>Add Family Member</Text>
        </TouchableOpacity>

        {otherMembers.length === 0 && (
          <Text style={styles.emptyHint}>
            Your household is just you for now.{'\n'}You can add others at any time.
          </Text>
        )}
      </ScrollView>

      {/* Next */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cta} activeOpacity={0.85} onPress={handleNext}>
          <Text style={styles.ctaText}>Continue</Text>
          <ChevronRight size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Add/Edit Member Modal */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop} />
        <KeyboardAvoidingView
          style={styles.modalWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <X size={22} color={C.sub} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingIndex !== null ? 'Edit Member' : 'Add Member'}
              </Text>
              <TouchableOpacity onPress={saveDraft}>
                <Text style={[styles.modalSave, { color: C.accent }]}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              {/* Avatar */}
              <View style={styles.avatarSection}>
                <AvatarPicker
                  name={draft.name || 'New'}
                  value={draft.avatar}
                  onChange={v => setDraft(d => ({ ...d, avatar: v }))}
                  size={88}
                  accentColor={C.accent}
                />
                <Text style={styles.avatarHint}>Tap to set photo or emoji</Text>
              </View>

              {/* Name */}
              <Text style={styles.fieldLabel}>Name *</Text>
              <TextInput
                style={[styles.input, draftError ? styles.inputError : null]}
                value={draft.name}
                onChangeText={v => { setDraft(d => ({ ...d, name: v })); setDraftError(''); }}
                placeholder="e.g. Mom, Leo, Grandma…"
                placeholderTextColor="#CBD5E1"
                autoCorrect={false}
                maxLength={30}
              />
              {draftError ? <Text style={styles.errorText}>{draftError}</Text> : null}

              <Text style={[styles.fieldHint, { marginTop: 20 }]}>New profiles are parent-managed child profiles. Invite parents and teens after setup.</Text>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  stepRow: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center' },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.border },
  stepLabel: { fontSize: 12, fontWeight: '700', color: C.sub },
  body: { paddingHorizontal: 24, paddingBottom: 24 },
  title: { fontSize: 26, fontWeight: '900', color: C.text, letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 14, color: C.sub, marginBottom: 24, lineHeight: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: C.sub,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
    gap: 12,
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '700', color: C.text },
  memberRole: { fontSize: 12, color: C.sub, marginTop: 2 },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleBadgeText: { fontSize: 12, fontWeight: '700' },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.accentBg,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 4,
    gap: 8,
    borderWidth: 1,
    borderColor: C.accent + '30',
    borderStyle: 'dashed',
  },
  addBtnText: { fontSize: 15, fontWeight: '700', color: C.accent },
  emptyHint: { textAlign: 'center', fontSize: 13, color: '#94A3B8', lineHeight: 20, marginTop: 20 },
  fieldHint: { fontSize: 12, color: C.sub, lineHeight: 18 },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.bg,
  },
  cta: {
    backgroundColor: C.accent,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Modal
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  modalSave: { fontSize: 16, fontWeight: '700' },
  modalBody: { padding: 24 },
  avatarSection: { alignItems: 'center', marginBottom: 24, gap: 10 },
  avatarHint: { fontSize: 12, color: C.sub },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: C.sub,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: C.muted,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
  },
  inputError: { borderColor: C.red },
  errorText: { fontSize: 12, color: C.red, marginTop: 6, fontWeight: '600' },
  roleRow: { flexDirection: 'row', gap: 10 },
  roleChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.muted,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  roleChipActive: { backgroundColor: C.accentBg, borderColor: C.accent },
  roleChipText: { fontSize: 14, fontWeight: '700', color: C.sub },
});
