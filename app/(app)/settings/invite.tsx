import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet,
  Share 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Share2, Copy, Users, Check } from 'lucide-react-native';
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

export default function InviteScreen() {
  const router = useRouter();
  const [copied, setCopied] = React.useState(false);
  const inviteCode = "HOME-HUDDLE-2026";

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleCopy = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join my household on HomeHuddle! Use my invite code: ${inviteCode}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ChevronLeft size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite Family</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.iconCircle}>
            <Users size={32} color={C.accent} />
          </View>
          <Text style={styles.heroTitle}>Grow Your Huddle</Text>
          <Text style={styles.heroSubtitle}>Invite your family members to join your household and start huddling together!</Text>
        </View>

        <View style={styles.codeSection}>
          <Text style={styles.sectionLabel}>Your Invite Code</Text>
          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>{inviteCode}</Text>
            <TouchableOpacity onPress={handleCopy} style={styles.copyBtn}>
              {copied ? <Check size={20} color="#10B981" /> : <Copy size={20} color={C.subtext} />}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Share2 size={20} color="#fff" />
          <Text style={styles.shareBtnText}>Share Invitation Link</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How it works</Text>
          <Text style={styles.infoText}>
            1. Share your unique code with family members.{"\n"}
            2. They download HomeHuddle and enter the code during signup.{"\n"}
            3. They're automatically added to your household!
          </Text>
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
    padding: 24,
  },
  heroCard: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: C.text,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    color: C.subtext,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
    fontWeight: '500',
  },
  codeSection: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.cardBorder,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: C.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 16,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.bg,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 18,
    fontWeight: '900',
    color: C.text,
    letterSpacing: 2,
  },
  copyBtn: {
    padding: 8,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.accent,
    padding: 18,
    borderRadius: 20,
    gap: 12,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  infoBox: {
    marginTop: 40,
    backgroundColor: C.accent + '05',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.accent + '10',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: C.accent,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: C.subtext,
    lineHeight: 20,
    fontWeight: '500',
  }
});
