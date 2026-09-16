/**
 * Onboarding Step 2 — Your Profile
 * Required: First name (or full name). Optional: avatar, role.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { AvatarPicker, AvatarValue } from '../../components/AvatarPicker';
import { useHuddleStore } from '../../store/huddleStore';

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
};

export default function OnboardingProfile() {
  const router = useRouter();
  const { setCurrentUser, setFamilyMembers } = useHuddleStore();

  // Default to first member (Dad) as template for the admin account being set up
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<AvatarValue>('');
  const [error, setError] = useState('');

  const step = '2 of 4';

  const handleNext = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter your name to continue.');
      return;
    }
    setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // A new household starts with exactly the authenticated parent, not demo members.
    setFamilyMembers([{
      name: trimmed,
      avatar: avatar || '👤',
      role: 'Parent',
      pool: 'Me',
      stats: { choresCompleted: 0, pointsEarned: 0, streak: 0 },
    }]);
    setCurrentUser(trimmed);

    router.push('/onboarding/family');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={22} color={C.sub} />
          </TouchableOpacity>
          <View style={styles.stepRow}>
            {[1, 2, 3, 4].map(i => (
              <View
                key={i}
                style={[styles.stepDot, i === 2 && { backgroundColor: C.accent, width: 20 }]}
              />
            ))}
          </View>
          <Text style={styles.stepLabel}>{step}</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Set Up Your Profile</Text>
          <Text style={styles.subtitle}>This is your account — the household admin.</Text>

          {/* Avatar picker */}
          <View style={styles.avatarSection}>
            <AvatarPicker
              name={name || 'You'}
              value={avatar}
              onChange={setAvatar}
              size={100}
              accentColor={C.accent}
            />
            <Text style={styles.avatarHint}>Tap to set your photo or emoji</Text>
          </View>

          {/* Name field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Your Name *</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              value={name}
              onChangeText={v => { setName(v); setError(''); }}
              placeholder="e.g. Sarah, Dad, Haewon…"
              placeholderTextColor="#CBD5E1"
              autoCorrect={false}
              returnKeyType="next"
              maxLength={30}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Text style={styles.fieldHint}>This is how you’ll appear to your family.</Text>
          </View>

        </ScrollView>

        {/* Next button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cta} activeOpacity={0.85} onPress={handleNext}>
            <Text style={styles.ctaText}>Continue</Text>
            <ChevronRight size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.border,
  },
  stepLabel: { fontSize: 12, fontWeight: '700', color: C.sub },
  body: { paddingHorizontal: 24, paddingBottom: 24, gap: 0 },
  title: { fontSize: 26, fontWeight: '900', color: C.text, letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 14, color: C.sub, marginBottom: 28 },
  avatarSection: { alignItems: 'center', marginBottom: 32, gap: 10 },
  avatarHint: { fontSize: 12, color: C.sub, fontWeight: '500' },
  fieldGroup: { marginBottom: 24 },
  fieldLabel: { fontSize: 12, fontWeight: '800', color: C.sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  input: {
    backgroundColor: C.card,
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
  fieldHint: { fontSize: 12, color: '#94A3B8', marginTop: 6 },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 8,
  },
  roleRowActive: { borderColor: C.accent, backgroundColor: C.accentBg },
  roleText: { flex: 1 },
  roleLabel: { fontSize: 15, fontWeight: '700', color: C.text },
  roleSub: { fontSize: 12, color: C.sub, marginTop: 2 },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: C.accent,
  },
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
});
