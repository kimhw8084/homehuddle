import React, { useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOut, useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, CheckCircle2, Trash2, RotateCcw, Calendar, Zap, ListChecks, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useHuddleStore } from '../../../store/huddleStore';

const C = {
  bg:         '#F8FAFC',
  card:       '#FFFFFF',
  border:     '#E2E8F0',
  accent:     '#4F46E5',
  text:       '#0F172A',
  subtext:    '#64748B',
  muted:      '#F1F5F9',
  green:      '#10B981',
  red:        '#EF4444',
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function daysUntilPurge(deletedAt: number): number {
  return Math.max(0, Math.ceil((deletedAt + SEVEN_DAYS_MS - Date.now()) / (24 * 60 * 60 * 1000)));
}

function formatDate(ts: number | string | null | undefined): string {
  if (!ts) return '';
  const d = new Date(typeof ts === 'string' ? ts : ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateStr(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (dateStr === todayStr) return 'Today';
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const yestStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  if (dateStr === yestStr) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Unified key for a deletable item
type DeletedItemKey = string; // `chore:${id}` or `instance:${choreId}:${date}`

export default function ChoreHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<'completed' | 'deleted'>(
    params.tab === 'deleted' ? 'deleted' : 'completed'
  );

  const allChores = useHuddleStore(s => s.chores);
  const restoreChore = useHuddleStore(s => s.restoreChore);
  const removeChoreDeletedDate = useHuddleStore(s => s.removeChoreDeletedDate);

  const completedChores = useMemo(() =>
    allChores
      .filter(c => !c.deletedAt && c.status === 'completed')
      .sort((a, b) => {
        const ta = typeof a.completedAt === 'number' ? a.completedAt : new Date(a.completedAt ?? 0).getTime();
        const tb = typeof b.completedAt === 'number' ? b.completedAt : new Date(b.completedAt ?? 0).getTime();
        return tb - ta;
      }),
    [allChores]);

  const deletedChores = useMemo(() =>
    allChores
      .filter(c => !!c.deletedAt)
      .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0)),
    [allChores]);

  type DeletedInstance = { choreId: string; title: string; date: string; isPast: boolean };
  const deletedInstances = useMemo((): DeletedInstance[] => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const result: DeletedInstance[] = [];
    for (const c of allChores) {
      if (!c.deletedAt && c.deletedDates && c.deletedDates.length > 0) {
        for (const d of c.deletedDates) {
          result.push({ choreId: c.id, title: c.title, date: d, isPast: d < today });
        }
      }
    }
    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [allChores]);

  const totalDeletedCount = deletedChores.length + deletedInstances.length;

  // Selection state for deleted tab
  const [selectedKeys, setSelectedKeys] = useState<Set<DeletedItemKey>>(new Set());

  const toggleSelect = useCallback((key: DeletedItemKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const allKeys = new Set<DeletedItemKey>([
      ...deletedChores.map(c => `chore:${c.id}` as DeletedItemKey),
      ...deletedInstances.map(i => `instance:${i.choreId}:${i.date}` as DeletedItemKey),
    ]);
    setSelectedKeys(allKeys);
  }, [deletedChores, deletedInstances]);

  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  // Clear selection when switching tabs
  const handleTabChange = (tab: 'completed' | 'deleted') => {
    setActiveTab(tab);
    setSelectedKeys(new Set());
  };

  // Restore notification bar
  const [restoreNotif, setRestoreNotif] = useState<string | null>(null);
  const restoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showRestoreNotif = useCallback((label: string) => {
    setRestoreNotif(label);
    if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current);
    restoreTimerRef.current = setTimeout(() => setRestoreNotif(null), 3000);
  }, []);

  const handleRestoreSelected = useCallback(() => {
    if (selectedKeys.size === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    for (const key of selectedKeys) {
      if (key.startsWith('chore:')) {
        const id = key.slice(6);
        restoreChore(id);
      } else if (key.startsWith('instance:')) {
        const parts = key.split(':');
        const choreId = parts[1];
        const date = parts[2];
        removeChoreDeletedDate(choreId, date);
      }
    }
    const count = selectedKeys.size;
    setSelectedKeys(new Set());
    showRestoreNotif(`${count} item${count > 1 ? 's' : ''} restored`);
  }, [selectedKeys, restoreChore, removeChoreDeletedDate, showRestoreNotif]);

  const allSelected = totalDeletedCount > 0 && selectedKeys.size === totalDeletedCount;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      {restoreNotif && (
        <RestoreBar
          title={restoreNotif}
          onGoToChores={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.navigate('/chores'); }}
          onDismiss={() => { if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current); setRestoreNotif(null); }}
        />
      )}
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} style={styles.backButton}>
          <ChevronLeft size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chore History</Text>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.navigate('/chores'); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.accent + '15', borderWidth: 1, borderColor: C.accent + '40', borderRadius: 20, paddingHorizontal: 10, height: 34 }}>
          <ListChecks size={13} color={C.accent} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.accent }}>Chores</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
          onPress={() => { Haptics.selectionAsync(); handleTabChange('completed'); }}
        >
          <CheckCircle2 size={14} color={activeTab === 'completed' ? C.accent : C.subtext} />
          <Text style={[styles.tabLabel, activeTab === 'completed' && styles.tabLabelActive]}>
            Completed
          </Text>
          {completedChores.length > 0 && (
            <View style={[styles.badge, activeTab === 'completed' && styles.badgeActive]}>
              <Text style={[styles.badgeText, activeTab === 'completed' && styles.badgeTextActive]}>
                {completedChores.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'deleted' && styles.tabActive]}
          onPress={() => { Haptics.selectionAsync(); handleTabChange('deleted'); }}
        >
          <Trash2 size={14} color={activeTab === 'deleted' ? C.red : C.subtext} />
          <Text style={[styles.tabLabel, activeTab === 'deleted' && { color: C.red, fontWeight: '800' }]}>
            Deleted
          </Text>
          {totalDeletedCount > 0 && (
            <View style={[styles.badge, activeTab === 'deleted' && { backgroundColor: C.red + '18' }]}>
              <Text style={[styles.badgeText, activeTab === 'deleted' && { color: C.red }]}>
                {totalDeletedCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, selectedKeys.size > 0 && { paddingBottom: 100 }]}
      >
        {activeTab === 'completed' ? (
          completedChores.length === 0 ? (
            <EmptyState icon={<CheckCircle2 size={32} color={C.green} />} message="No completed chores yet." />
          ) : (
            <View style={styles.list}>
              {completedChores.map((c, idx) => (
                <View key={c.id} style={[styles.row, idx < completedChores.length - 1 && styles.rowBorder]}>
                  <View style={[styles.iconCircle, { backgroundColor: C.green + '15' }]}>
                    <CheckCircle2 size={18} color={C.green} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{c.title}</Text>
                    <View style={styles.rowMeta}>
                      <Calendar size={11} color={C.subtext} />
                      <Text style={styles.rowMetaText}>{formatDate(c.completedAt)}</Text>
                      {c.completedBy && <Text style={styles.rowMetaText}>· {c.completedBy}</Text>}
                    </View>
                  </View>
                  <View style={styles.pointsBadge}>
                    <Zap size={10} color={C.accent} fill={C.accent} />
                    <Text style={styles.pointsText}>+{c.points}</Text>
                  </View>
                </View>
              ))}
            </View>
          )
        ) : (
          <>
            {totalDeletedCount === 0 ? (
              <EmptyState icon={<Trash2 size={32} color={C.subtext} />} message="No deleted chores. Items purge after 7 days." />
            ) : (
              <>
                {/* Select all / hint row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={styles.hint}>Tap items to select · purged after 7 days</Text>
                  <TouchableOpacity onPress={allSelected ? clearSelection : selectAll} style={{ marginLeft: 'auto' }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: C.accent }}>
                      {allSelected ? 'Deselect all' : 'Select all'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {deletedInstances.length > 0 && (
                  <>
                    <Text style={styles.groupLabel}>Skipped instances</Text>
                    <View style={[styles.list, { marginBottom: 16 }]}>
                      {deletedInstances.map((inst, idx) => {
                        const key: DeletedItemKey = `instance:${inst.choreId}:${inst.date}`;
                        const selected = selectedKeys.has(key);
                        return (
                          <TouchableOpacity
                            key={key}
                            onPress={() => toggleSelect(key)}
                            activeOpacity={0.7}
                            style={[styles.row, idx < deletedInstances.length - 1 && styles.rowBorder, selected && styles.rowSelected]}
                          >
                            <SelectCircle selected={selected} />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.rowTitle, { color: C.subtext }]} numberOfLines={1}>{inst.title}</Text>
                              <View style={styles.rowMeta}>
                                <Calendar size={11} color={C.subtext} />
                                <Text style={styles.rowMetaText}>{formatDateStr(inst.date)}</Text>
                                {inst.isPast && (() => {
                                  const now2 = new Date();
                                  const instDate = new Date(inst.date + 'T00:00:00');
                                  const diffDays = Math.ceil((now2.getTime() - instDate.getTime()) / 86400000);
                                  return (
                                    <Text style={[styles.rowMetaText, { color: C.red, fontWeight: '700' }]}>· {diffDays}d overdue if restored</Text>
                                  );
                                })()}
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}

                {deletedChores.length > 0 && (
                  <>
                    <Text style={styles.groupLabel}>Removed chores</Text>
                    <View style={styles.list}>
                      {deletedChores.map((c, idx) => {
                        const key: DeletedItemKey = `chore:${c.id}`;
                        const selected = selectedKeys.has(key);
                        const days = daysUntilPurge(c.deletedAt!);
                        return (
                          <TouchableOpacity
                            key={c.id}
                            onPress={() => toggleSelect(key)}
                            activeOpacity={0.7}
                            style={[styles.row, idx < deletedChores.length - 1 && styles.rowBorder, selected && styles.rowSelected]}
                          >
                            <SelectCircle selected={selected} />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.rowTitle, { color: C.subtext }]} numberOfLines={1}>{c.title}</Text>
                              <View style={styles.rowMeta}>
                                <Calendar size={11} color={C.subtext} />
                                <Text style={styles.rowMetaText}>{formatDateStr(c.dueDate)}</Text>
                                {c.deleteScope === 'series' && (
                                  <Text style={styles.rowMetaText}>· All future</Text>
                                )}
                                {(c.isOverdue && c.overdueDays) ? (
                                  <Text style={[styles.rowMetaText, { color: C.red, fontWeight: '700' }]}>· {c.overdueDays}d overdue</Text>
                                ) : (c.wasOverdue && c.overdueDays) ? (
                                  <Text style={[styles.rowMetaText, { color: '#F97316', fontWeight: '700' }]}>· {c.overdueDays}d missed</Text>
                                ) : null}
                                {(c.missedStreak ?? 0) > 0 && (
                                  <Text style={[styles.rowMetaText, { color: '#F97316' }]}>· Missed {c.missedStreak}×</Text>
                                )}
                                <Text style={[styles.rowMetaText, days <= 1 && { color: C.red, fontWeight: '700' }]}>
                                  · Purges in {days}d
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Floating restore action bar */}
      {selectedKeys.size > 0 && activeTab === 'deleted' && (
        <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOut.duration(150)} style={styles.actionBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionBarCount}>{selectedKeys.size} selected</Text>
          </View>
          <TouchableOpacity onPress={clearSelection} style={styles.actionBarCancel}>
            <Text style={styles.actionBarCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRestoreSelected} style={styles.actionBarRestore}>
            <RotateCcw size={14} color="#fff" />
            <Text style={styles.actionBarRestoreText}>Restore</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

function SelectCircle({ selected }: { selected: boolean }) {
  return (
    <View style={[styles.selectCircle, selected && styles.selectCircleActive]}>
      {selected && <Check size={12} color="#fff" strokeWidth={3} />}
    </View>
  );
}

function RestoreBar({ title, onGoToChores, onDismiss }: { title: string; onGoToChores: () => void; onDismiss: () => void }) {
  const dragY = useSharedValue(0);
  const gesture = Gesture.Pan()
    .onUpdate(e => { if (e.translationY > 0) dragY.value = e.translationY; })
    .onEnd(e => {
      if (e.translationY > 40) { runOnJS(onDismiss)(); }
      else { dragY.value = withSpring(0, { damping: 20, stiffness: 200 }); }
    });
  const animStyle = useAnimatedStyle(() => ({ transform: [{ translateY: dragY.value }] }));
  return (
    <GestureDetector gesture={gesture}>
      <View style={{ position: 'absolute', bottom: 24, left: 24, right: 24, zIndex: 1000 }}>
        <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOut} style={[animStyle, { backgroundColor: '#1E293B', borderRadius: 20, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 10 }]}>
          <Text style={{ color: '#E2E8F0', fontSize: 13, fontWeight: '700', flex: 1 }} numberOfLines={1}>{title}</Text>
          <TouchableOpacity onPress={onGoToChores} style={{ paddingHorizontal: 14, paddingVertical: 7, backgroundColor: C.accent, borderRadius: 12, marginLeft: 8 }}>
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '900' }}>View Chores</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 80, gap: 12 }}>
      {icon}
      <Text style={{ fontSize: 14, color: C.subtext, fontWeight: '600' }}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  tabRow: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 4,
    backgroundColor: C.muted, borderRadius: 16, padding: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 12,
  },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  tabLabel: { fontSize: 13, fontWeight: '700', color: C.subtext },
  tabLabelActive: { color: C.accent, fontWeight: '800' },
  badge: { backgroundColor: C.subtext + '18', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  badgeActive: { backgroundColor: C.accent + '18' },
  badgeText: { fontSize: 11, fontWeight: '800', color: C.subtext },
  badgeTextActive: { color: C.accent },
  content: { padding: 20, paddingTop: 12 },
  hint: { fontSize: 12, color: C.subtext, fontWeight: '500' },
  groupLabel: { fontSize: 11, fontWeight: '800', color: C.subtext, textTransform: 'uppercase', letterSpacing: 0.8, marginLeft: 4, marginBottom: 8 },
  list: { backgroundColor: C.card, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.muted },
  rowSelected: { backgroundColor: C.accent + '08' },
  selectCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#CBD5E1', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  selectCircleActive: { backgroundColor: C.accent, borderColor: C.accent },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  rowMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 },
  rowMetaText: { fontSize: 12, color: C.subtext, fontWeight: '500' },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.accent + '10', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  pointsText: { fontSize: 12, fontWeight: '800', color: C.accent },
  actionBar: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    backgroundColor: '#0F172A', borderRadius: 20,
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: 20, paddingRight: 8, paddingVertical: 10, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 12,
    zIndex: 999,
  },
  actionBarCount: { color: '#E2E8F0', fontSize: 13, fontWeight: '700' },
  actionBarCancel: { paddingHorizontal: 12, paddingVertical: 8 },
  actionBarCancelText: { color: '#94A3B8', fontSize: 13, fontWeight: '700' },
  actionBarRestore: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  actionBarRestoreText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
