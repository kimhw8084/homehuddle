/**
 * Onboarding Step 4 — All Set!
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CheckCircle2, Home, Users, Zap } from 'lucide-react-native';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useHuddleStore } from '../../store/huddleStore';
import { InitialsAvatar } from '../../components/AvatarPicker';

const C = {
  bg: '#F8FAFC',
  accent: '#4F46E5',
  accentBg: '#EEF2FF',
  text: '#0F172A',
  sub: '#64748B',
  card: '#FFFFFF',
  border: '#E2E8F0',
  green: '#10B981',
  greenBg: '#F0FDF4',
};

const STEPS = [
  { icon: CheckCircle2, label: 'Profile created', color: C.green },
  { icon: Users, label: 'Family configured', color: C.accent },
  { icon: Zap, label: 'Points system ready', color: '#F59E0B' },
  { icon: Home, label: 'HomeHuddle is set up!', color: '#EC4899' },
];

export default function OnboardingDone() {
  const router = useRouter();
  const setCompleted = useOnboardingStore(s => s.setCompleted);
  const { currentUser, familyMembers } = useHuddleStore();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 200 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCompleted(true);
    router.replace('/(app)/(tabs)');
  };

  const me = familyMembers.find(m => m.name === currentUser);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.body}>
        {/* Success icon */}
        <Animated.View style={[styles.successWrap, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.successIcon}>
            <CheckCircle2 size={52} color={C.green} />
          </View>
          <Text style={styles.successLabel}>You're all set!</Text>
        </Animated.View>

        {/* Member avatars strip */}
        <Animated.View style={[styles.avatarStrip, { opacity: fadeAnim }]}>
          {familyMembers.slice(0, 5).map((m, i) => (
            <View key={m.name} style={[styles.avatarItem, { marginLeft: i > 0 ? -12 : 0, zIndex: 10 - i }]}>
              <InitialsAvatar name={m.name} avatar={m.avatar} size={44} accentColor={C.accent} />
            </View>
          ))}
          {familyMembers.length > 5 && (
            <View style={[styles.avatarMore, { marginLeft: -12 }]}>
              <Text style={styles.avatarMoreText}>+{familyMembers.length - 5}</Text>
            </View>
          )}
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.title}>Welcome, {currentUser}!</Text>
          <Text style={styles.subtitle}>
            HomeHuddle is ready for your family.{'\n'}Here's what's waiting for you:
          </Text>

          {/* Checklist */}
          <View style={styles.checklist}>
            {STEPS.map(({ icon: Icon, label, color }) => (
              <View key={label} style={styles.checkRow}>
                <Icon size={18} color={color} />
                <Text style={styles.checkLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>

      {/* CTA */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cta} activeOpacity={0.85} onPress={handleStart}>
          <Home size={20} color="#fff" />
          <Text style={styles.ctaText}>Go to HomeHuddle</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  successWrap: { alignItems: 'center', gap: 12 },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: C.greenBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.green + '30',
  },
  successLabel: { fontSize: 28, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  avatarStrip: { flexDirection: 'row', alignItems: 'center' },
  avatarItem: {
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 24,
  },
  avatarMore: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarMoreText: { fontSize: 12, fontWeight: '800', color: C.accent },
  title: { fontSize: 22, fontWeight: '900', color: C.text, textAlign: 'center', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 14, color: C.sub, textAlign: 'center', lineHeight: 22, marginBottom: 4 },
  checklist: { gap: 12, marginTop: 8 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  checkLabel: { fontSize: 14, fontWeight: '600', color: C.text },
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
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
