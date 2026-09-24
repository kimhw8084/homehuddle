/**
 * AvatarPicker
 * Reusable avatar selector with three modes:
 *   1. Initials (auto-generated from name, shown when avatar is blank)
 *   2. Emoji (system emoji keyboard — letters are rejected)
 *   3. Photo (expo-image-picker)
 *
 * Usage:
 *   <AvatarPicker name="Alex" value={avatar} onChange={setAvatar} size={80} />
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Camera, Smile, Type, X } from 'lucide-react-native';

const C = {
  accent: '#4F46E5',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  sub: '#64748B',
  muted: '#F1F5F9',
};

// ── Helpers ────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Returns true if the string contains ONLY emoji characters (no plain letters/digits) */
function isEmojiOnly(str: string): boolean {
  if (!str || str.trim().length === 0) return false;
  // Strip all emoji (and variation selectors, ZWJ, skin-tone modifiers) and see if nothing is left
  const withoutEmoji = str.replace(
    /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}]/gu,
    ''
  );
  return withoutEmoji.trim().length === 0;
}

// ── Types ──────────────────────────────────────────────────────────

export type AvatarValue =
  | ''                        // blank → show initials
  | `emoji:${string}`         // emoji chosen from keyboard
  | `photo:${string}`;        // local URI from image picker

interface AvatarPickerProps {
  name: string;
  value: AvatarValue | string;
  onChange: (value: AvatarValue) => void;
  size?: number;
  editable?: boolean;
  accentColor?: string;
}

// ── Main component ─────────────────────────────────────────────────

export function AvatarPicker({
  name,
  value,
  onChange,
  size = 80,
  editable = true,
  accentColor = C.accent,
}: AvatarPickerProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiDraft, setEmojiDraft] = useState('');
  const [loading, setLoading] = useState(false);

  const initials = getInitials(name);

  // ── Render the avatar display ────────────────────────────────────

  const renderAvatar = () => {
    if (value.startsWith('photo:')) {
      const uri = value.slice(6);
      return (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      );
    }
    if (value.startsWith('emoji:')) {
      const emoji = value.slice(6);
      return (
        <Text style={{ fontSize: size * 0.55, lineHeight: size * 0.7 }}>{emoji}</Text>
      );
    }
    // Legacy plain emoji support (e.g. existing mock data like '👨🏻')
    if (value && !value.includes(':')) {
      return (
        <Text style={{ fontSize: size * 0.55, lineHeight: size * 0.7 }}>{value}</Text>
      );
    }
    // Blank → initials
    return (
      <Text style={[styles.initialsText, { fontSize: size * 0.38, color: accentColor }]}>
        {initials}
      </Text>
    );
  };

  // ── Actions ──────────────────────────────────────────────────────

  const pickPhoto = useCallback(async () => {
    setMenuOpen(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access in Settings to choose a profile photo.');
      return;
    }
    setLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        onChange(`photo:${result.assets[0].uri}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setLoading(false);
    }
  }, [onChange]);

  const takePhoto = useCallback(async () => {
    setMenuOpen(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access in Settings.');
      return;
    }
    setLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        onChange(`photo:${result.assets[0].uri}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setLoading(false);
    }
  }, [onChange]);

  const openEmojiPicker = () => {
    setMenuOpen(false);
    setEmojiDraft('');
    setEmojiOpen(true);
  };

  const confirmEmoji = () => {
    const trimmed = emojiDraft.trim();
    if (!trimmed) {
      // Cleared to blank
      onChange('');
      setEmojiOpen(false);
      return;
    }
    if (!isEmojiOnly(trimmed)) {
      Alert.alert('Emoji only', 'Please choose an emoji from the emoji keyboard. Letters and numbers are not allowed.');
      return;
    }
    // Take just the first grapheme cluster (one emoji)
    const firstEmoji = [...trimmed][0];
    onChange(`emoji:${firstEmoji}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEmojiOpen(false);
  };

  const clearAvatar = () => {
    setMenuOpen(false);
    onChange('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ── Render ───────────────────────────────────────────────────────

  return (
    <>
      <TouchableOpacity
        onPress={() => editable && setMenuOpen(true)}
        activeOpacity={editable ? 0.8 : 1}
        style={[
          styles.avatarWrap,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: C.muted,
            borderColor: accentColor + '30',
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={accentColor} />
        ) : (
          renderAvatar()
        )}
        {editable && (
          <View style={[styles.editBadge, { backgroundColor: accentColor }]}>
            <Camera size={10} color="#fff" />
          </View>
        )}
      </TouchableOpacity>

      {/* ── Option Menu Modal ────────────────────────────────────── */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setMenuOpen(false)} />
        <View style={styles.menu}>
          <Text style={styles.menuTitle}>Change Avatar</Text>

          <TouchableOpacity style={styles.menuRow} onPress={openEmojiPicker}>
            <View style={[styles.menuIcon, { backgroundColor: '#EEF2FF' }]}>
              <Smile size={20} color={C.accent} />
            </View>
            <View style={styles.menuBody}>
              <Text style={styles.menuLabel}>Choose Emoji</Text>
              <Text style={styles.menuSub}>Pick from the emoji keyboard</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuRow} onPress={pickPhoto}>
            <View style={[styles.menuIcon, { backgroundColor: '#F0FDF4' }]}>
              <Camera size={20} color="#10B981" />
            </View>
            <View style={styles.menuBody}>
              <Text style={styles.menuLabel}>Photo Library</Text>
              <Text style={styles.menuSub}>Upload from your photos</Text>
            </View>
          </TouchableOpacity>

          {Platform.OS !== 'web' && (
            <TouchableOpacity style={styles.menuRow} onPress={takePhoto}>
              <View style={[styles.menuIcon, { backgroundColor: '#FFF7ED' }]}>
                <Camera size={20} color="#F97316" />
              </View>
              <View style={styles.menuBody}>
                <Text style={styles.menuLabel}>Take Photo</Text>
                <Text style={styles.menuSub}>Use your camera</Text>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.menuRow} onPress={clearAvatar}>
            <View style={[styles.menuIcon, { backgroundColor: '#F1F5F9' }]}>
              <Type size={20} color="#64748B" />
            </View>
            <View style={styles.menuBody}>
              <Text style={styles.menuLabel}>Use Initials</Text>
              <Text style={styles.menuSub}>Show &quot;{initials}&quot; as avatar</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuCancel} onPress={() => setMenuOpen(false)}>
            <Text style={styles.menuCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Emoji Picker Modal ───────────────────────────────────── */}
      <Modal visible={emojiOpen} transparent animationType="slide" onRequestClose={() => setEmojiOpen(false)}>
        <View style={styles.backdrop} />
        <View style={styles.emojiSheet}>
          <View style={styles.emojiHeader}>
            <TouchableOpacity onPress={() => setEmojiOpen(false)}>
              <X size={22} color={C.sub} />
            </TouchableOpacity>
            <Text style={styles.emojiTitle}>Choose an Emoji</Text>
            <TouchableOpacity onPress={confirmEmoji}>
              <Text style={[styles.emojiDone, { color: accentColor }]}>Done</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.emojiHint}>
            Tap the field below and open the emoji keyboard (🌐 or 😊 key).{'\n'}Only emoji are accepted — letters will be rejected.
          </Text>

          <View style={styles.emojiPreviewRow}>
            <View style={[styles.emojiPreview, { borderColor: accentColor + '40' }]}>
              {emojiDraft ? (
                <Text style={{ fontSize: 52 }}>{[...emojiDraft][0] ?? ''}</Text>
              ) : (
                <Text style={{ fontSize: 36, color: '#CBD5E1' }}>?</Text>
              )}
            </View>
          </View>

          <TextInput
            value={emojiDraft}
            onChangeText={text => { setEmojiDraft(text); }}
            placeholder="Tap here then press 🌐"
            placeholderTextColor="#CBD5E1"
            autoFocus
            keyboardType="default"
            maxLength={8}
            textAlign="center"
            style={styles.emojiInput}
          />
        </View>
      </Modal>
    </>
  );
}

// ── InitialsAvatar (lightweight, no picker) ────────────────────────

export function InitialsAvatar({
  name,
  avatar,
  size = 40,
  accentColor = C.accent,
}: {
  name: string;
  avatar?: string;
  size?: number;
  accentColor?: string;
}) {
  const radius = size / 2;

  if (avatar && avatar.startsWith('photo:')) {
    return (
      <Image
        source={{ uri: avatar.slice(6) }}
        style={{ width: size, height: size, borderRadius: radius }}
        resizeMode="cover"
      />
    );
  }

  const displayEmoji =
    avatar && avatar.startsWith('emoji:')
      ? avatar.slice(6)
      : avatar && !avatar.includes(':')
      ? avatar // legacy plain emoji
      : null;

  if (displayEmoji) {
    return (
      <View style={[styles.initialsWrap, { width: size, height: size, borderRadius: radius, backgroundColor: accentColor + '18' }]}>
        <Text style={{ fontSize: size * 0.55 }}>{displayEmoji}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.initialsWrap, { width: size, height: size, borderRadius: radius, backgroundColor: accentColor + '18' }]}>
      <Text style={[styles.initialsText, { fontSize: size * 0.38, color: accentColor }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  avatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  initialsWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  menu: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: C.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 14,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBody: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: C.text },
  menuSub: { fontSize: 12, color: C.sub, marginTop: 1 },
  menuCancel: {
    marginTop: 16,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: C.muted,
    borderRadius: 16,
  },
  menuCancelText: { fontSize: 15, fontWeight: '700', color: C.sub },

  emojiSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  emojiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  emojiTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.text,
  },
  emojiDone: {
    fontSize: 16,
    fontWeight: '700',
  },
  emojiHint: {
    fontSize: 13,
    color: C.sub,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emojiPreviewRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  emojiPreview: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: C.muted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  emojiInput: {
    backgroundColor: C.muted,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    fontSize: 24,
    color: C.text,
    textAlign: 'center',
  },
});
