/**
 * Onboarding Step 1 — Welcome / Get Started
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Home, Users, CheckCircle2, ShoppingCart, Zap } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const C = {
  bg: '#F8FAFC',
  accent: '#4F46E5',
  accentBg: '#EEF2FF',
  text: '#0F172A',
  sub: '#64748B',
  card: '#FFFFFF',
  border: '#E2E8F0',
};

const FEATURES = [
  { icon: CheckCircle2, label: 'Chore Management', sub: 'Assign, track & complete tasks', color: '#10B981', bg: '#F0FDF4' },
  { icon: Users, label: 'Family Profiles', sub: 'Every member gets their own space', color: '#4F46E5', bg: '#EEF2FF' },
  { icon: Zap, label: 'Points & Rewards', sub: 'Earn points, redeem in the market', color: '#F59E0B', bg: '#FFFBEB' },
  { icon: ShoppingCart, label: 'Restock List', sub: 'Shared grocery & supply tracking', color: '#06B6D4', bg: '#ECFEFF' },
];

export default function OnboardingWelcome() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.logoWrap}>
          <Home size={40} color={C.accent} />
        </View>
        <Text style={styles.appName}>HomeHuddle</Text>
        <Text style={styles.tagline}>Your family, organized.</Text>
        <Text style={styles.subtitle}>
          One app for chores, meals, shopping, and everything in between.
        </Text>
      </View>

      {/* Feature pills */}
      <View style={styles.features}>
        {FEATURES.map(({ icon: Icon, label, sub, color, bg }) => (
          <View key={label} style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: bg }]}>
              <Icon size={20} color={color} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureLabel}>{label}</Text>
              <Text style={styles.featureSub}>{sub}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cta}
          activeOpacity={0.85}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/onboarding/profile');
          }}
        >
          <Text style={styles.ctaText}>Get Started</Text>
        </TouchableOpacity>
        <Text style={styles.legal}>
          By continuing you agree to our Terms & Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
    paddingHorizontal: 24,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
  },
  logoWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: C.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  appName: {
    fontSize: 34,
    fontWeight: '900',
    color: C.text,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '700',
    color: C.accent,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 15,
    color: C.sub,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
    maxWidth: 280,
  },
  features: {
    gap: 12,
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 14,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1 },
  featureLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },
  featureSub: {
    fontSize: 12,
    color: C.sub,
    marginTop: 2,
  },
  footer: {
    paddingBottom: Platform.OS === 'android' ? 16 : 0,
    gap: 12,
  },
  cta: {
    backgroundColor: C.accent,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  legal: {
    textAlign: 'center',
    fontSize: 11,
    color: '#CBD5E1',
  },
});
