import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, User, Mail } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { AvatarPicker, AvatarValue } from '../../../components/AvatarPicker';
import { useHuddleStore } from '../../../store/huddleStore';
import { useAuthStore } from '../../../store/authStore';
import { accountApi } from '../../../lib/account';

const C = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  cardBorder: '#E2E8F0',
  accent: '#4F46E5',
  text: '#0F172A',
  subtext: '#64748B',
  muted: '#F1F5F9',
  red: '#EF4444',
};

export default function PersonalInfoScreen() {
  const router = useRouter();
  const currentUser = useHuddleStore(s => s.currentUser);
  const familyMembers = useHuddleStore(s => s.familyMembers);
  const updateMemberAvatar = useHuddleStore(s => s.updateMemberAvatar);
  const updateMemberName = useHuddleStore(s => s.updateMemberName);
  const email = useAuthStore(s => s.user?.email ?? '');

  const me = familyMembers.find(m => m.name === currentUser);

  const [name, setName] = useState(currentUser);
  const [avatar, setAvatar] = useState<AvatarValue>((me?.avatar as AvatarValue) ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges =
    name.trim() !== currentUser ||
    avatar !== (me?.avatar ?? '');

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please enter a display name.');
      return;
    }
    setIsSaving(true);
    try {
      await accountApi.updateMyProfile(trimmed, avatar);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (trimmed !== currentUser) updateMemberName(currentUser, trimmed);
      if (avatar !== (me?.avatar ?? '')) updateMemberAvatar(trimmed, avatar);
      router.back();
    } catch (error) {
      Alert.alert('Unable to save profile', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal Info</Text>
        <TouchableOpacity
          style={[styles.saveButton, (!hasChanges || isSaving) && { opacity: 0.4 }]}
          onPress={handleSave}
          disabled={!hasChanges || isSaving}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <AvatarPicker
              name={name || currentUser}
              value={avatar}
              onChange={setAvatar}
              size={100}
              accentColor={C.accent}
            />
            <Text style={styles.avatarSubtext}>Tap to change your avatar</Text>
          </View>

          {/* Display name (required) */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Display Name *</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.iconContainer}><User size={18} color={C.subtext} /></View>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="How your family sees you"
                  placeholderTextColor="#94A3B8"
                  autoCorrect={false}
                  maxLength={30}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.iconContainer}><Mail size={18} color={C.subtext} /></View>
                <TextInput
                  style={styles.input}
                  value={email}
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={false}
                />
              </View>
            </View>

          </View>

          <Text style={styles.note}>
            Your display name and avatar are visible to everyone in your household. Your sign-in email is read-only.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.text,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: C.accent,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  content: { padding: 24, paddingBottom: 60 },
  avatarSection: { alignItems: 'center', marginBottom: 32, gap: 10 },
  avatarSubtext: { fontSize: 13, color: C.subtext, fontWeight: '500' },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: C.subtext,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    paddingHorizontal: 12,
  },
  iconContainer: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  note: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 28,
  },
});
