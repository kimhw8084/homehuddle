import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet,
  TextInput 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Search, HelpCircle, MessageCircle, Mail, ChevronRight } from 'lucide-react-native';
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

export default function HelpCenterScreen() {
  const router = useRouter();

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const FAQItem = ({ question }: any) => (
    <TouchableOpacity style={styles.faqItem}>
      <Text style={styles.faqText}>{question}</Text>
      <ChevronRight size={18} color="#CBD5E1" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ChevronLeft size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.searchSection}>
          <Text style={styles.heroTitle}>How can we help?</Text>
          <View style={styles.searchBar}>
            <Search size={20} color={C.subtext} />
            <TextInput 
              placeholder="Search for articles..." 
              style={styles.searchInput}
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Contact Us</Text>
        <View style={styles.contactRow}>
          <TouchableOpacity style={styles.contactCard}>
            <View style={[styles.contactIcon, { backgroundColor: '#EEF2FF' }]}>
              <MessageCircle size={24} color={C.accent} />
            </View>
            <Text style={styles.contactLabel}>Live Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactCard}>
            <View style={[styles.contactIcon, { backgroundColor: '#F0FDF4' }]}>
              <Mail size={24} color="#10B981" />
            </View>
            <Text style={styles.contactLabel}>Email Support</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Popular Topics</Text>
        <View style={styles.faqList}>
          <FAQItem question="How do I add a family member?" />
          <FAQItem question="Can I reset my points?" />
          <FAQItem question="How to create a recurring chore?" />
          <FAQItem question="Is my data shared with others?" />
          <FAQItem question="How to change my household name?" />
        </View>

        <View style={styles.footer}>
          <HelpCircle size={20} color={C.subtext} />
          <Text style={styles.footerText}>Need more help? Visit our website.</Text>
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
  searchSection: {
    marginBottom: 32,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: C.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: C.text,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    marginLeft: 4,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 12,
  },
  contactCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  contactIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },
  faqList: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  faqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: C.muted,
  },
  faqText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    gap: 8,
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 13,
    color: C.subtext,
    fontWeight: '500',
  }
});
