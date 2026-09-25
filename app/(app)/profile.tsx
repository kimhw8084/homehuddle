import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ChevronRight,
  ChevronLeft,
  User,
  Bell,
  Shield,
  LogOut,
  CheckCircle2,
  Users,
  Palmtree,
  ShoppingCart,
  Star,
  ClipboardList,
  Wallet,
  HelpCircle,
  Heart,
  Globe,
  Moon,
  Vibrate,
  Trash2,
  Lock,
  UserPlus,
  Home,
  Info,
  RotateCcw,
} from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { useHuddleStore } from '../../store/huddleStore';

const C = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  cardBorder: '#E2E8F0',
  accent: '#4F46E5',
  accentBg: '#EEF2FF',
  red: '#EF4444',
  text: '#0F172A',
  subtext: '#64748B',
  muted: '#F1F5F9',
  green: '#10B981',
  orange: '#F97316',
  pink: '#EC4899',
  cyan: '#06B6D4',
  amber: '#F59E0B',
  purple: '#8B5CF6',
  rose: '#F43F5E',
  slate: '#64748B',
};

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const signOut = useAuthStore(state => state.signOut);
  const currentUser = useHuddleStore(state => state.currentUser);
  const familyMembers = useHuddleStore(state => state.familyMembers);
  const vacationMode = useHuddleStore(state => state.vacationMode);

  const me = familyMembers.find(m => m.name === currentUser);

  // Local preference toggles (no persistence yet — wired in future)
  const [hapticEnabled, setHapticEnabled] = React.useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);
  const [choreApproval, setChoreApproval] = React.useState(false);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of HomeHuddle?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            signOut();
          },
        },
      ]
    );
  };

  const tap = () => hapticEnabled && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  // ─── Sub-components ───────────────────────────────────────────────

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  const Card = ({ children }: { children: React.ReactNode }) => (
    <View style={styles.card}>{children}</View>
  );

  const Row = ({
    icon: Icon,
    label,
    sublabel,
    color = C.slate,
    value,
    isToggle,
    toggled,
    onToggle,
    onPress,
    last,
    danger,
  }: {
    icon: any;
    label: string;
    sublabel?: string;
    color?: string;
    value?: string;
    isToggle?: boolean;
    toggled?: boolean;
    onToggle?: (v: boolean) => void;
    onPress?: () => void;
    last?: boolean;
    danger?: boolean;
  }) => (
    <TouchableOpacity
      activeOpacity={isToggle ? 1 : 0.7}
      onPress={() => {
        if (isToggle) return;
        tap();
        onPress?.();
      }}
      style={[styles.row, last && styles.rowLast]}
    >
      <View style={[styles.iconBox, { backgroundColor: color + '18' }]}>
        <Icon size={18} color={color} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, danger && { color: C.red }]}>{label}</Text>
        {sublabel ? <Text style={styles.rowSub}>{sublabel}</Text> : null}
      </View>
      {isToggle ? (
        <Switch
          value={toggled}
          onValueChange={v => {
            if (hapticEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggle?.(v);
          }}
          trackColor={{ false: '#E2E8F0', true: C.green }}
          thumbColor="#fff"
          ios_backgroundColor="#E2E8F0"
        />
      ) : (
        <View style={styles.rowRight}>
          {value ? <Text style={styles.rowValue}>{value}</Text> : null}
          <ChevronRight size={16} color="#CBD5E1" />
        </View>
      )}
    </TouchableOpacity>
  );

  // ─── Derived values ───────────────────────────────────────────────

  const memberCount = familyMembers.filter(m => (m.role as string) !== 'Pet').length;
  const petCount = familyMembers.filter(m => (m.role as string) === 'Pet').length;
  const memberSummary = `${memberCount} members${petCount > 0 ? `, ${petCount} pet` : ''}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 48, paddingHorizontal: 20 }}
      >
        {/* ── Profile Hero ─────────────────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={{ fontSize: 44 }}>{me?.avatar ?? '👤'}</Text>
            </View>
          </View>
          <Text style={styles.heroName}>{currentUser}</Text>
          <TouchableOpacity style={styles.editBtn} onPress={() => { tap(); router.push('/settings/personal-info'); }}>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* ── ACCOUNT ──────────────────────────────────────────── */}
        <SectionHeader title="Account" />
        <Card>
          <Row icon={User} label="Personal Info" sublabel="Name, email, avatar" color={C.accent} onPress={() => router.push('/settings/personal-info')} last />
        </Card>

        {/* ── PRIVACY & SECURITY ───────────────────────────────── */}
        <SectionHeader title="Privacy & Security" />
        <Card>
          <Row icon={Lock} label="Password & Security" sublabel="Password, 2FA" color={C.purple} onPress={() => router.push('/settings/privacy')} />
          <Row icon={Shield} label="Privacy" sublabel="Visibility, data sharing" color={C.slate} onPress={() => router.push('/settings/privacy')} last />
        </Card>

        {/* ── PREFERENCES ──────────────────────────────────────── */}
        <SectionHeader title="Preferences" />
        <Card>
          <Row
            icon={Vibrate}
            label="Haptic Feedback"
            color={C.purple}
            isToggle
            toggled={hapticEnabled}
            onToggle={v => setHapticEnabled(v)}
          />
          <Row
            icon={Bell}
            label="Notifications"
            sublabel={notificationsEnabled ? 'All alerts on' : 'Silenced'}
            color={C.pink}
            isToggle
            toggled={notificationsEnabled}
            onToggle={v => setNotificationsEnabled(v)}
          />
          <Row icon={Bell} label="Notification Settings" sublabel="Customize alert types" color={C.pink} onPress={() => router.push('/settings/notifications')} />
          <Row
            icon={Moon}
            label="Dark Mode"
            sublabel="Coming soon"
            color="#334155"
            isToggle
            toggled={darkMode}
            onToggle={v => setDarkMode(v)}
          />
          <Row icon={Globe} label="Language & Region" sublabel="English (US)" color={C.cyan} value="EN" last />
        </Card>

        {/* ── HOUSEHOLD & WALLET ───────────────────────────────── */}
        <SectionHeader title="Household & Wallet" />
        <Card>
          <Row icon={Home} label="Household Settings" sublabel="Name, ID, preferences" color={C.slate} onPress={() => router.push('/settings/household')} />
          <Row icon={Users} label="Family Members" sublabel={memberSummary} color={C.accent} onPress={() => router.push('/settings/household')} />
          <Row icon={UserPlus} label="Invite Family" sublabel="Share invite code" color={C.cyan} onPress={() => router.push('/settings/invite')} />
          <Row
            icon={Palmtree}
            label="Vacation Mode"
            sublabel={vacationMode?.active ? `Active · ends ${vacationMode.endDate}` : 'Off'}
            color={C.orange}
            value={vacationMode?.active ? 'On' : ''}
          />
          <Row icon={Wallet} label="Wallet & Points" sublabel="Reset cycle, currency" color="#6366F1" onPress={() => router.push('/settings/household')} last />
        </Card>

        {/* ── APP FEATURES ─────────────────────────────────────── */}
        <SectionHeader title="App Features" />
        <Card>
          <Row icon={ClipboardList} label="Chore History" sublabel="Completed & deleted" color={C.amber} onPress={() => router.push('/settings/chore-history')} />
          <Row
            icon={CheckCircle2}
            label="Chore Approval"
            sublabel="Require parent sign-off"
            color={C.green}
            isToggle
            toggled={choreApproval}
            onToggle={v => setChoreApproval(v)}
          />
          <Row icon={Star} label="Market Settings" sublabel="Rewards, stock, pricing" color={C.rose} />
          <Row icon={ShoppingCart} label="Restock Preferences" sublabel="Default store, staples" color={C.green} last />
        </Card>

        {/* ── DATA & STORAGE ────────────────────────────────────── */}
        <SectionHeader title="Data & Storage" />
        <Card>
          <Row icon={RotateCcw} label="Reset to Demo Data" sublabel="Restore all mock data" color={C.orange} />
          <Row icon={Trash2} label="Clear App Cache" sublabel="Free up space" color={C.slate} last />
        </Card>

        {/* ── SUPPORT ──────────────────────────────────────────── */}
        <SectionHeader title="Support" />
        <Card>
          <Row icon={HelpCircle} label="Help Center" sublabel="FAQs, live chat, email" color={C.slate} onPress={() => router.push('/settings/help')} />
          <Row icon={Heart} label="About HomeHuddle" sublabel="Version 1.0.4 · Build 2026" color={C.rose} onPress={() => router.push('/settings/about')} />
          <Row icon={Info} label="What's New" sublabel="See latest changes" color={C.cyan} last />
        </Card>

        {/* ── SIGN OUT ─────────────────────────────────────────── */}
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
          <LogOut size={18} color={C.red} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>HomeHuddle v1.0.4 (Build 2026) · Harulo Studio</Text>
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
    backgroundColor: C.bg,
  },
  backBtn: {
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
    flex: 1,
    textAlign: 'center',
  },
  hero: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
  },
  avatarWrap: {
    marginBottom: 12,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: C.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
  },
  pointsBadge: {
    position: 'absolute',
    bottom: -4,
    right: -8,
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: C.bg,
    gap: 3,
  },
  pointsText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  heroName: {
    fontSize: 22,
    fontWeight: '900',
    color: C.text,
    letterSpacing: -0.5,
  },
  heroRole: {
    fontSize: 13,
    color: C.subtext,
    marginTop: 2,
    fontWeight: '500',
  },
  editBtn: {
    marginTop: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
  },
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.cardBorder,
    marginBottom: 28,
    paddingVertical: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 20,
    fontWeight: '900',
    color: C.text,
  },
  statLbl: {
    fontSize: 11,
    color: C.subtext,
    marginTop: 2,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    backgroundColor: C.cardBorder,
    marginVertical: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: C.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginLeft: 4,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.cardBorder,
    overflow: 'hidden',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: C.muted,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  rowBody: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  rowSub: {
    fontSize: 12,
    color: C.subtext,
    marginTop: 1,
    fontWeight: '500',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowValue: {
    fontSize: 13,
    color: C.subtext,
    fontWeight: '600',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    gap: 8,
    marginBottom: 20,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '800',
    color: C.red,
  },
  version: {
    textAlign: 'center',
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '500',
  },
});

// ── Needed color constant (referenced in hero) ────────────────────
const accentBg = '#EEF2FF'; // eslint-disable-line @typescript-eslint/no-unused-vars
