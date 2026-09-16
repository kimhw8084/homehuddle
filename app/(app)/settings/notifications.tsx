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
import { ChevronLeft, Bell, MessageSquare, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { accountApi } from '../../../lib/account';

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

export default function NotificationsScreen() {
  const router = useRouter();
  const [settings, setSettings] = React.useState({
    push: true,
    chores: true,
    points: true,
    reminders: false,
    updates: true,
  });
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    accountApi.notificationPreferences().then((value) => {
      if (value) setSettings(prev => ({ ...prev, push: value.push_enabled, chores: value.chore_events, rewards: value.reward_events, points: value.reward_events }));
    }).catch(() => {}).finally(() => setLoaded(true));
  }, []);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const toggleSetting = async (key: keyof typeof settings) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    try {
      await accountApi.saveNotificationPreferences(next.push, next.chores, next.points);
    } catch {
      setSettings(settings);
    }
  };

  const NotificationRow = ({ label, description, icon: Icon, value, onToggle }: any) => (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Icon size={20} color={C.accent} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <TouchableOpacity 
        onPress={onToggle}
        style={[styles.toggleTrack, value && styles.toggleTrackActive]}
      >
        <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ChevronLeft size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Bell size={48} color={C.accent} />
          <Text style={styles.heroTitle}>Stay Updated</Text>
          <Text style={styles.heroSubtitle}>Choose which alerts you want to receive from HomeHuddle.</Text>
        </View>

        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.list}>
          <NotificationRow 
            label="Push Notifications" 
            description="Overall master toggle for all alerts"
            icon={Bell}
            value={settings.push}
            onToggle={() => { if (loaded) toggleSetting('push'); }}
          />
          <NotificationRow 
            label="Chore Alerts" 
            description="When someone assigns or completes a chore"
            icon={MessageSquare}
            value={settings.chores}
            onToggle={() => { if (loaded) toggleSetting('chores'); }}
          />
          <NotificationRow 
            label="Points & Rewards" 
            description="When you earn points or reach a milestone"
            icon={Zap}
            value={settings.points}
            onToggle={() => { if (loaded) toggleSetting('points'); }}
          />
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
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: C.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
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
    backgroundColor: C.accent + '15',
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
  toggleTrack: {
    width: 48,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E2E8F0',
    padding: 2,
    justifyContent: 'center',
  },
  toggleTrackActive: {
    backgroundColor: C.green,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
});
