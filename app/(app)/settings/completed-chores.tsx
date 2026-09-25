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
import { ChevronLeft, CheckCircle2, Calendar, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const C = {
  bg:          '#F8FAFC',
  card:        '#FFFFFF',
  cardBorder:  '#E2E8F0',
  accent:      '#4F46E5',
  text:        '#0F172A',
  subtext:     '#64748B',
  muted:       '#F1F5F9',
  green:       '#10B981',
};

export default function CompletedChoresScreen() {
  const router = useRouter();

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const ChoreItem = ({ title, date, points }: any) => (
    <View style={styles.choreItem}>
      <View style={styles.choreIcon}>
        <CheckCircle2 size={20} color={C.green} />
      </View>
      <View style={styles.choreInfo}>
        <Text style={styles.choreTitle}>{title}</Text>
        <View style={styles.choreMeta}>
          <Calendar size={12} color={C.subtext} />
          <Text style={styles.choreDate}>{date}</Text>
        </View>
      </View>
      <View style={styles.pointsBadge}>
        <Zap size={10} color={C.accent} fill={C.accent} />
        <Text style={styles.pointsText}>+{points}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ChevronLeft size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Completed Chores</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>128</Text>
            <Text style={styles.statLabel}>Total Chores</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>12,450</Text>
            <Text style={styles.statLabel}>Points Earned</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.list}>
          <ChoreItem title="Wash the dishes" date="Today, 10:30 AM" points="50" />
          <ChoreItem title="Vacuum living room" date="Yesterday, 4:15 PM" points="100" />
          <ChoreItem title="Take out recycling" date="Oct 24, 2023" points="30" />
          <ChoreItem title="Mow the lawn" date="Oct 22, 2023" points="250" />
          <ChoreItem title="Clean bathroom" date="Oct 20, 2023" points="150" />
          <ChoreItem title="Feed the pets" date="Oct 20, 2023" points="20" />
          <ChoreItem title="Water plants" date="Oct 19, 2023" points="40" />
          <ChoreItem title="Grocery shopping" date="Oct 18, 2023" points="200" />
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
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: C.accent,
  },
  statLabel: {
    fontSize: 12,
    color: C.subtext,
    fontWeight: '600',
    marginTop: 4,
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
  choreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.muted,
  },
  choreIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.green + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  choreInfo: {
    flex: 1,
  },
  choreTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  choreMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  choreDate: {
    fontSize: 12,
    color: C.subtext,
    fontWeight: '500',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.accent + '10',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.accent,
  },
});
