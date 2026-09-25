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
import { ChevronLeft, Home, Users, Settings, ChevronRight, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useHuddleStore } from '../../../store/huddleStore';

const C = {
  bg:          '#F8FAFC',
  card:        '#FFFFFF',
  cardBorder:  '#E2E8F0',
  accent:      '#4F46E5',
  text:        '#0F172A',
  subtext:     '#64748B',
  muted:       '#F1F5F9',
};

export default function HouseholdScreen() {
  const router = useRouter();
  const { familyMembers } = useHuddleStore();

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const MemberRow = ({ name, role, emoji }: any) => (
    <View style={styles.memberRow}>
      <View style={styles.memberAvatar}>
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{name}</Text>
        <Text style={styles.memberRole}>{role}</Text>
      </View>
      <ChevronRight size={18} color="#CBD5E1" />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ChevronLeft size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Household Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.householdHero}>
          <View style={styles.homeIconBg}>
            <Home size={32} color={C.accent} />
          </View>
          <Text style={styles.householdName}>Kim Residence</Text>
          <Text style={styles.householdId}>ID: HH-8829-X</Text>
          <TouchableOpacity style={styles.editBtn}>
            <Settings size={14} color={C.subtext} />
            <Text style={styles.editBtnText}>Manage</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Family Members</Text>
          <TouchableOpacity style={styles.addBtn}>
            <Plus size={16} color={C.accent} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.list}>
          {familyMembers.map(m => (
            <MemberRow key={m.name} name={m.name} role={m.role} emoji={m.avatar} />
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 32, marginBottom: 12 }]}>Preferences</Text>
        <View style={styles.list}>
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowLabel}>Chore Approval Required</Text>
            <Text style={styles.rowValue}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowLabel}>Points Reset Cycle</Text>
            <Text style={styles.rowValue}>Monthly</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowLabel}>Household Currency</Text>
            <Text style={styles.rowValue}>Points</Text>
          </TouchableOpacity>
        </View>
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
  householdHero: {
    alignItems: 'center',
    marginBottom: 32,
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  homeIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  householdName: {
    fontSize: 22,
    fontWeight: '900',
    color: C.text,
  },
  householdId: {
    fontSize: 12,
    color: C.subtext,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 1,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.subtext,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.accent,
  },
  list: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.muted,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  memberRole: {
    fontSize: 12,
    color: C.subtext,
    fontWeight: '500',
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.muted,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '700',
    color: C.accent,
  }
});
