import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Shield, Eye, Lock, Fingerprint, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const C = {
  bg:          '#F8FAFC',
  card:        '#FFFFFF',
  cardBorder:  '#E2E8F0',
  accent:      '#4F46E5',
  text:        '#0F172A',
  subtext:     '#64748B',
  muted:       '#F1F5F9',
  red:         '#EF4444',
};

export default function PrivacyScreen() {
  const router = useRouter();

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const ActionRow = ({ label, description, icon: Icon, color = C.accent, isDestructive = false }: any) => (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      style={styles.row}
    >
      <View style={[styles.rowIcon, { backgroundColor: color + '15' }]}>
        <Icon size={20} color={color} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, isDestructive && { color: C.red }]}>{label}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <ChevronRight size={18} color="#CBD5E1" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ChevronLeft size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Shield size={48} color={C.accent} />
          <Text style={styles.heroTitle}>Your Security</Text>
          <Text style={styles.heroSubtitle}>Manage how your data is handled and keep your account safe.</Text>
        </View>

        <Text style={styles.sectionTitle}>Privacy</Text>
        <View style={styles.list}>
          <ActionRow 
            label="Profile Visibility" 
            description="Control who can see your activity"
            icon={Eye}
          />
          <ActionRow 
            label="Data Sharing" 
            description="Manage how your household data is shared"
            icon={Shield}
          />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Security</Text>
        <View style={styles.list}>
          <ActionRow 
            label="Change Password" 
            description="Update your account password regularly"
            icon={Lock}
          />
          <ActionRow 
            label="Two-Factor Auth" 
            description="Add an extra layer of protection"
            icon={Fingerprint}
            color="#F59E0B"
          />
        </View>

        <TouchableOpacity style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>Delete Account</Text>
        </TouchableOpacity>
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
    padding: 20,
  },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: C.text,
    marginTop: 16,
  },
  heroSubtitle: {
    fontSize: 14,
    color: C.subtext,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  list: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.muted,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  rowDescription: {
    fontSize: 12,
    color: C.subtext,
    marginTop: 2,
    fontWeight: '500',
  },
  deleteButton: {
    marginTop: 40,
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  deleteButtonText: {
    color: C.red,
    fontWeight: '800',
    fontSize: 15,
  }
});
