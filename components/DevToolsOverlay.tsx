import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useHuddleStore } from '../store/huddleStore';
import { useOnboardingStore } from '../store/onboardingStore';

if (!__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (module as any).exports = { DevToolsOverlay: () => null };
}

export function DevToolsOverlay() {
  const [open, setOpen] = useState(false);
  const [fabOverlap, setFabOverlap] = useState({ hidden: false, cropTop: 0, cropBottom: 0 });
  const router = useRouter();
  const currentUser = useHuddleStore((s) => s.currentUser);
  const setCurrentUser = useHuddleStore((s) => s.setCurrentUser);
  const resetToMockData = useHuddleStore((s) => s.resetToMockData);
  const familyMembers = useHuddleStore((s) => s.familyMembers);
  const restartOnboarding = useOnboardingStore((s) => s.restart);

  const activeAccount = familyMembers.find((m) => m.name === currentUser) ?? familyMembers[0];

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    // RN Web stacks this sibling over the tab screen, so clip only pixels the product bar covers.
    const updateProductOverlap = () => {
      const fab = document.querySelector('[data-testid="dev-tools-launcher"]');
      const actionBar = document.querySelector('[data-testid="bulk-selection-action-bar"]');
      if (!fab || !actionBar) {
        setFabOverlap((current) => current.hidden || current.cropTop || current.cropBottom
          ? { hidden: false, cropTop: 0, cropBottom: 0 }
          : current);
        return;
      }

      const fabRect = fab.getBoundingClientRect();
      const actionRect = actionBar.getBoundingClientRect();
      const overlaps = fabRect.left < actionRect.right
        && fabRect.right > actionRect.left
        && fabRect.top < actionRect.bottom
        && fabRect.bottom > actionRect.top;
      const fullyCovered = actionRect.left <= fabRect.left
        && actionRect.right >= fabRect.right
        && actionRect.top <= fabRect.top
        && actionRect.bottom >= fabRect.bottom;
      const next = !overlaps
        ? { hidden: false, cropTop: 0, cropBottom: 0 }
        : fullyCovered
          ? { hidden: true, cropTop: 0, cropBottom: 0 }
          : actionRect.top > fabRect.top
            ? { hidden: false, cropTop: 0, cropBottom: Math.min(fabRect.height, fabRect.bottom - actionRect.top) }
            : actionRect.bottom < fabRect.bottom
              ? { hidden: false, cropTop: Math.min(fabRect.height, actionRect.bottom - fabRect.top), cropBottom: 0 }
              : { hidden: true, cropTop: 0, cropBottom: 0 };
      setFabOverlap((current) => current.hidden === next.hidden
        && current.cropTop === next.cropTop
        && current.cropBottom === next.cropBottom ? current : next);
    };

    const observer = new MutationObserver(updateProductOverlap);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('resize', updateProductOverlap);
    updateProductOverlap();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateProductOverlap);
    };
  }, []);

  if (!__DEV__) return null;

  return (
    <>
      {/* FAB */}
      <View
        pointerEvents="box-none"
        style={styles.fabLayer}
      >
        <View
          pointerEvents={fabOverlap.hidden ? 'none' : 'box-none'}
          style={[
            styles.fabFrame,
            {
              height: 44 - fabOverlap.cropTop - fabOverlap.cropBottom,
              bottom: 140 + fabOverlap.cropBottom,
            },
            fabOverlap.hidden && styles.fabHidden,
          ]}
        >
          <TouchableOpacity
            testID="dev-tools-launcher"
            accessibilityRole="button"
            accessibilityLabel="Open Dev Tools"
            accessibilityElementsHidden={fabOverlap.hidden}
            importantForAccessibility={fabOverlap.hidden ? 'no-hide-descendants' : 'auto'}
            aria-hidden={fabOverlap.hidden}
            onPress={() => setOpen(true)}
            style={[styles.fab, { top: -fabOverlap.cropTop }]}
            activeOpacity={0.8}
          >
            <Text style={styles.fabIcon}>🛠</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom sheet modal */}
      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        />
        <SafeAreaView style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Dev Tools</Text>
            <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {/* Active Account */}
            <Text style={styles.sectionLabel}>Active Account</Text>
            <View style={styles.activeRow}>
              <Text style={styles.avatar}>{(activeAccount as any)?.avatar ?? '👤'}</Text>
              <View>
                <Text style={styles.memberName}>{activeAccount?.name ?? ''}</Text>
                <Text style={styles.memberRole}>{(activeAccount as any)?.role ?? 'Member'}</Text>
              </View>
            </View>

            {/* Switch Account */}
            <Text style={styles.sectionLabel}>Switch Account</Text>
            {familyMembers.map((member) => (
              <TouchableOpacity
                key={member.name}
                style={[styles.memberRow, member.name === currentUser && styles.memberRowActive]}
                onPress={() => {
                  setCurrentUser(member.name);
                  setOpen(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.avatar}>{member.avatar}</Text>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberRole}>{(member as any).role ?? 'Member'}</Text>
                </View>
                {member.name === currentUser && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}

            {/* Onboarding */}
            <Text style={styles.sectionLabel}>Onboarding</Text>
            <TouchableOpacity
              style={styles.onboardingBtn}
              onPress={() => {
                setOpen(false);
                restartOnboarding();
                router.replace('/onboarding');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.onboardingBtnText}>🚀  Simulate First Launch</Text>
            </TouchableOpacity>

            {/* Data */}
            <Text style={styles.sectionLabel}>Data</Text>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => {
                resetToMockData();
                setOpen(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.resetBtnText}>Reset to Mock Data</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 10,
  },
  fabFrame: {
    position: 'absolute',
    right: 20,
    bottom: 140,
    width: 44,
    height: 44,
    overflow: 'hidden',
  },
  fab: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  fabIcon: {
    fontSize: 20,
  },
  fabHidden: {
    opacity: 0,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    borderTopWidth: 1,
    borderColor: '#3A3A3C',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#3A3A3C',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '600',
  },
  body: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 10,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 12,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  memberRowActive: {
    borderWidth: 1,
    borderColor: '#0A84FF',
  },
  avatar: {
    fontSize: 28,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  memberRole: {
    color: '#8E8E93',
    fontSize: 13,
    marginTop: 2,
  },
  checkmark: {
    color: '#0A84FF',
    fontSize: 18,
    fontWeight: '700',
  },
  onboardingBtn: {
    backgroundColor: '#0A84FF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  onboardingBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  resetBtn: {
    backgroundColor: '#FF453A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
