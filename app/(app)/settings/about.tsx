import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet,
  Image 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Github, Globe, Twitter, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const C = {
  bg:          '#F8FAFC',
  card:        '#FFFFFF',
  cardBorder:  '#E2E8F0',
  accent:      '#4F46E5',
  text:        '#0F172A',
  subtext:     '#64748B',
  muted:       '#F1F5F9',
};

export default function AboutScreen() {
  const router = useRouter();

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const LegalRow = ({ label }: any) => (
    <TouchableOpacity style={styles.legalRow}>
      <Text style={styles.legalText}>{label}</Text>
      <ChevronRight size={18} color="#CBD5E1" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ChevronLeft size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About HomeHuddle</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.logoSection}>
          <View style={styles.logoSquare}>
            <Text style={{ fontSize: 40 }}>🏠</Text>
          </View>
          <Text style={styles.appName}>HomeHuddle</Text>
          <Text style={styles.appVersion}>Version 1.0.4 (Build 2026)</Text>
        </View>

        <View style={styles.descriptionCard}>
          <Text style={styles.descriptionText}>
            HomeHuddle is designed to bring families together through organized collaboration. 
            We believe that managing a home should be rewarding, transparent, and most importantly, fun.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Connect With Us</Text>
        <View style={styles.socialRow}>
          <TouchableOpacity style={styles.socialBtn}>
            <Twitter size={24} color={C.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialBtn}>
            <Github size={24} color={C.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialBtn}>
            <Globe size={24} color={C.text} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Legal</Text>
        <View style={styles.legalList}>
          <LegalRow label="Terms of Service" />
          <LegalRow label="Privacy Policy" />
          <LegalRow label="Cookie Policy" />
          <LegalRow label="Open Source Licenses" />
        </View>

        <Text style={styles.copyright}>© 2026 Harulo Studio. All rights reserved.</Text>
      </ScrollView>
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
    shadowColor: "#000",
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
  content: {
    padding: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoSquare: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  appName: {
    fontSize: 24,
    fontWeight: '900',
    color: C.text,
    marginTop: 16,
  },
  appVersion: {
    fontSize: 14,
    color: C.subtext,
    fontWeight: '600',
    marginTop: 4,
  },
  descriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: C.cardBorder,
    marginBottom: 32,
  },
  descriptionText: {
    fontSize: 15,
    color: C.subtext,
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: C.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    marginLeft: 4,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  socialBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  legalList: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: C.muted,
  },
  legalText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  copyright: {
    textAlign: 'center',
    fontSize: 12,
    color: C.subtext,
    marginTop: 40,
    fontWeight: '500',
    paddingBottom: 20,
  }
});
