import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback, startTransition } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Pressable, StyleSheet, unstable_batchedUpdates, Animated as RNAnimated, Alert, Modal, InteractionManager, RefreshControl, PanResponder, useWindowDimensions, Linking, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../../store/authStore';

import { householdApi } from '../../../lib/household';
import { householdData } from '../../../lib/household-data';
import { householdProofs } from '../../../lib/household-proofs';
import { requestHouseholdRefresh } from '../../../lib/household-events';
import {
  getTodayStr, getLocalFormattedDate, parseLocalDate, getDaysInMonth,
  getFirstDayOfMonth, isUSFederalHoliday, getDDay, computeNextDate, countOccurrencesBetween, ORDINALS, recurringOccursOn, fillOccurrencesInWindow
} from '../../../utils/dateUtils';
import {
  INITIAL_CHORES, INITIAL_SECTIONS, FAMILY_MEMBERS, SECTION_COLORS,
  RECURRING_PRESETS, RECURRING_FREQUENCIES, DAYS_OF_WEEK, MONTHS, WEEK_ORDINALS,
  TODAY
} from '../../../constants/mockData';
import {
  Search, X, AlertTriangle, Trash2, Camera,
  CheckCircle2, Plus, GripVertical, ChevronDown, ChevronUp, RotateCcw,
  Clock, ChevronLeft, ChevronRight, CheckCircle, MoreHorizontal, Check,
  BellRing, FolderPlus, ListPlus, Repeat2, Repeat, UserCheck, Users,
  SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown, Pencil, ShoppingCart,
  Circle as LucideCircle, History as HistoryIcon,
  ChevronsUpDown, ChevronsDownUp, Dices,
} from 'lucide-react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedProps, withSpring, withTiming, withSequence, withRepeat, withDelay, interpolateColor, Easing, FadeInDown, FadeOut, SlideInDown, SlideOutDown,
  runOnJS, Layout, interpolate, Extrapolation,
} from 'react-native-reanimated';
import Svg, { Circle as SvgCircle, Path } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(SvgCircle);
import { GestureHandlerRootView, Swipeable, Gesture, GestureDetector, PanGestureHandler, TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import DraggableFlatList, { ScaleDecorator, ShadowDecorator } from 'react-native-draggable-flatlist';
import { useHuddleStore } from '../../../store/huddleStore';
import { PrototypeNotice } from '../../../components/ui/PrototypeNotice';
import { RandomAssignmentModal, GamePickerModal } from '../../../components/games/RandomAssignmentGames';

// --- CONSTANTS ---
const GOLDEN_RADIUS = 20;
const GOLDEN_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius: 8,
  elevation: 2,
};
const GOLDEN_CARD_BASE = 'bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800';

const COLORS = {
  primary: '#4F46E5',
  bg: '#FAFAFA',
  card: '#FFFFFF',
  subtext: '#64748B',
  red: '#EF4444',
  blue: '#3B82F6',
  green: '#10B981',
  orange: '#F97316',
};

// --- RIGHT ACTIONS COMPONENT ---
const RightActions = ({ drag, width, hasAssign, hasReassign, hasAssignUnassigned, choreId, onAssignToMe, onReassign, onAssignUnassigned, onDefer, onDelete, isDeleting, setIsDeleting, isAssigning, setIsAssigning, swipeableRef }: any) => {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value + width }],
  }));

  const ActionButton = ({ color, icon, label, onPress }: any) => (
    <View style={{ flex: 1 }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={{ flex: 1, backgroundColor: color, justifyContent: 'center', alignItems: 'center' }}
      >
        <View style={{ alignItems: 'center' }}>
          {icon}
          <Text style={{ color: 'white', fontWeight: '900', fontSize: 8, marginTop: 4, textTransform: 'uppercase' }}>{label}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <Animated.View style={[{ flex: 1, flexDirection: 'row' }, style]}>
      {hasAssign && (
        <ActionButton
          color={isAssigning ? '#6D28D9' : '#8B5CF6'}
          icon={<UserCheck size={20} color="white" />}
          label={isAssigning ? 'Confirm' : 'Me'}
          onPress={() => {
            if (isAssigning) {
              onAssignToMe?.(choreId);
              swipeableRef.current?.close();
            } else {
              setIsAssigning(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
          }}
        />
      )}
      {hasReassign && (
        <ActionButton
          color="#0EA5E9"
          icon={<Users size={20} color="white" />}
          label="Reassign"
          onPress={() => { onReassign?.(choreId); swipeableRef.current?.close(); }}
        />
      )}
      {hasAssignUnassigned && (
        <ActionButton
          color="#8B5CF6"
          icon={<UserCheck size={20} color="white" />}
          label="Assign"
          onPress={() => { onAssignUnassigned?.(choreId); swipeableRef.current?.close(); }}
        />
      )}
      <ActionButton
        color={COLORS.blue}
        icon={<Clock size={20} color="white" />}
        label="Reschedule"
        onPress={() => { onDefer(choreId); swipeableRef.current?.close(); }}
      />
      <ActionButton
        color={isDeleting ? '#E11D48' : COLORS.red}
        icon={<Trash2 size={20} color="white" />}
        label={isDeleting ? 'Confirm' : 'Delete'}
        onPress={() => {
          if (isDeleting) {
            onDelete(choreId);
          } else {
            setIsDeleting(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        }}
      />
    </Animated.View>
  );
};

const SPRING_CONFIG = { damping: 25, stiffness: 200, mass: 0.5 };
const SNAPPY_TIMING = { duration: 150 };


import { Chore, Section, LinkedRestockItem } from '../../../types/chores';
import { ChoreEditPanel, DeferDatePickerModal, ChoreUndoRing, PointsEarnedNotification, SectionEditPanel, InlineCalendar } from '../../../components/ChoreModals';


const QUICK_POINTS = [10, 25, 50, 100];
const QUICK_TIMES = [
  { label: '15m', value: 15, color: COLORS.green },
  { label: '30m', value: 30, color: COLORS.blue },
  { label: '1h', value: 60, color: COLORS.orange },
  { label: '2h', value: 120, color: COLORS.red },
];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// --- TYPES ---

type ListItem =
  | { type: 'overdue-header'; data: { count: number; expanded: boolean } }
  | { type: 'overdue-item'; data: Chore }
  | { type: 'progress'; data: { done: number; total: number } }
  | { type: 'section'; data: Section }
  | { type: 'chore'; data: Chore }
  | { type: 'completed-header'; data: { count: number; expanded: boolean } }
  | { type: 'completed-item'; data: Chore }
  | { type: 'empty-state'; data: { isSearch: boolean } };

type SortField = 'title' | 'duration' | 'points';
type SortDir = 'asc' | 'desc';
type ActiveSort = { field: SortField; dir: SortDir } | null;

type FilterState = {
  assignees: string[];
  recurring: boolean;
  photoRequired: boolean;
  nudged: boolean;
  overdue: boolean;
};

const DEFAULT_FILTER: FilterState = { assignees: [], recurring: false, photoRequired: false, nudged: false, overdue: false };

const SORT_FIELDS: { field: SortField; label: string }[] = [
  { field: 'title', label: 'Title' },
  { field: 'duration', label: 'Time' },
  { field: 'points', label: 'Points' },
];

// Cycle: null → asc → desc → null
const cycleSort = (current: ActiveSort, field: SortField): ActiveSort => {
  if (!current || current.field !== field) return { field, dir: 'asc' };
  if (current.dir === 'asc') return { field, dir: 'desc' };
  return null;
};

const applySort = (chores: Chore[], sort: ActiveSort): Chore[] => {
  if (!sort) return chores;
  const c = [...chores];
  const { field, dir } = sort;
  const mul = dir === 'asc' ? 1 : -1;
  switch (field) {
    case 'title': return c.sort((a, b) => mul * a.title.localeCompare(b.title));
    case 'duration': return c.sort((a, b) => mul * (a.estMinutes - b.estMinutes));
    case 'points': return c.sort((a, b) => mul * (a.points - b.points));
  }
};

const applyFilter = (chores: Chore[], f: FilterState): Chore[] =>
  chores.filter(c => {
    if (f.assignees.length > 0 && !f.assignees.includes(c.assignee ?? '')) return false;
    if (f.recurring && !c.isRecurring) return false;
    if (f.photoRequired && !c.photoRequired) return false;
    if (f.nudged && !c.isNudged) return false;
    if (f.overdue && !c.isOverdue) return false;
    return true;
  });

const filterActiveCount = (f: FilterState): number =>
  f.assignees.length + (f.recurring ? 1 : 0) + (f.photoRequired ? 1 : 0) + (f.nudged ? 1 : 0) + (f.overdue ? 1 : 0);

// --- STYLESHEET (only used entries) ---
const styles = StyleSheet.create({
  dateBox: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  dateText: { fontSize: 15, fontWeight: '700' },
});

// Pre-computed once at module load — support 10 years forward
const _stripBase = new Date(); _stripBase.setHours(0,0,0,0);
const STRIP_DATES: { str: string; date: Date }[] = Array.from({ length: 3650 }, (_, i) => {
  const d = new Date(_stripBase); d.setDate(_stripBase.getDate() + i);
  return { str: getLocalFormattedDate(d), date: d };
});

// --- CALENDAR HUD ---
const CalendarHUD = React.memo(React.forwardRef(({
  selectedDate, setSelectedDate, choresByDate, isExpanded, setIsExpanded, calDate, setCalDate, calMode, setCalMode, onScrollMonth,
}: {
  selectedDate: string; setSelectedDate: (d: string) => void;
  choresByDate: Record<string, boolean>; isExpanded: boolean; setIsExpanded: (v: boolean) => void;
  calDate: Date; setCalDate: (d: Date) => void; calMode: 'Day' | 'Month' | 'Year'; setCalMode: (m: 'Day' | 'Month' | 'Year') => void;
  onScrollMonth?: (label: string) => void;
}, ref: any) => {
  const todayStr = getTodayStr();
  const limitDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 10);
    return d;
  }, []);

  const scrollRef = useRef<ScrollView>(null);
  const ITEM_WIDTH = 64;
  const GAP = 12;
  const STEP = ITEM_WIDTH + GAP;
  const GRID_SIDE_PADDING = 24;

  const stripDates = STRIP_DATES;

  const flatListRef = useRef<any>(null);

  const scrollToDate = useCallback((dateStr: string, animated = true) => {
    // If dateStr is before strip start (past), scroll to index 0 (today)
    let idx = stripDates.findIndex(d => d.str === dateStr);
    if (idx === -1) idx = 0;
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: idx,
        animated,
        viewPosition: 0,
      });
    }, 150);
  }, [stripDates]);

  React.useImperativeHandle(ref, () => ({
    scrollToDate: (dateStr: string, animated = true) => scrollToDate(dateStr, animated),
  }));

  const renderStripItem = useCallback(({ item: d }: { item: typeof STRIP_DATES[0] }) => {
    const isSelected = selectedDate === d.str;
    const isToday = d.str === todayStr;
    const isPast = d.date < new Date(todayStr) && d.str !== todayStr;
    const hasChore = choresByDate[d.str];

    return (
      <Pressable
        onPress={() => { Haptics.selectionAsync(); setSelectedDate(d.str); }}
        disabled={isPast}
        style={[
          { width: ITEM_WIDTH, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16, opacity: isPast ? 0.3 : 1 },
          isSelected
            ? { backgroundColor: COLORS.primary, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }
            : isToday
              ? { backgroundColor: '#EEF2FF', borderColor: COLORS.primary, borderWidth: 1.5 }
              : (hasChore && !isPast)
                ? { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }
                : { backgroundColor: 'transparent' }
        ]}
      >
        <Text style={[
          { fontSize: 10, fontWeight: '700' },
          isSelected ? { color: '#E0E7FF' } : isToday ? { color: COLORS.primary } : { color: isPast ? '#CBD5E1' : '#94A3B8' }
        ]}>
          {d.date.toLocaleDateString('en-US', { weekday: 'short' })}
        </Text>
        <View style={{ alignItems: 'center' }}>
          <Text style={[
            { fontSize: 18, fontWeight: '900' },
            isSelected ? { color: '#fff' } : isToday ? { color: COLORS.primary } : choresByDate[d.str] ? { color: '#1E293B' } : { color: isPast ? '#CBD5E1' : '#1E293B' }
          ]}>
            {d.date.getDate()}
          </Text>
          {hasChore && !isPast && (
            <View style={{
              position: 'absolute',
              bottom: -6,
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: isSelected ? '#fff' : COLORS.primary
            }} />
          )}
        </View>
      </Pressable>
    );
  }, [selectedDate, todayStr, choresByDate, setSelectedDate]);

  const expansionStyle = useAnimatedStyle(() => ({
    height: withSpring(isExpanded ? 348 : 0, SPRING_CONFIG),
    opacity: withTiming(isExpanded ? 1 : 0, { duration: 200 }),
    overflow: 'hidden',
  }));

  const renderDayGrid = () => {
    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    const days: (number | null)[] = [];
    for (let i = 0; i < getFirstDayOfMonth(year, month); i++) days.push(null);
    for (let i = 1; i <= getDaysInMonth(year, month); i++) days.push(i);

    return (
      <View style={{ paddingHorizontal: GRID_SIDE_PADDING }}>
        {/* #25: Weekday labels row */}
        <View style={{ flexDirection: 'row', marginBottom: 4 }}>
          {WEEKDAYS.map((w, i) => (
            <View key={i} style={{ width: '14.285%', alignItems: 'center', paddingVertical: 2 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase' }}>{w}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {days.map((d, i) => {
            if (d === null) return <View key={`e-${i}`} style={{ width: '14.285%', aspectRatio: 1 }} />;
            const curDate = new Date(year, month, d);
            const dStr = getLocalFormattedDate(curDate);
            const isSelected = selectedDate === dStr;
            const isToday = dStr === todayStr;
            const isPast = curDate < new Date(todayStr) && !isToday;
            const isOverLimit = curDate > limitDate;
            const holiday = isUSFederalHoliday(curDate);
            return (
              <Pressable
                key={d}
                disabled={isPast || isOverLimit}
                onPress={() => { Haptics.selectionAsync(); setSelectedDate(dStr); setIsExpanded(false); scrollToDate(dStr); }}
                style={{ width: '14.285%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', opacity: (isPast || isOverLimit) ? 0.2 : 1 }}
              >
                <View style={[
                  styles.dateBox,
                  isSelected
                    ? { backgroundColor: COLORS.primary }
                    : isToday
                      ? { backgroundColor: '#EEF2FF', borderColor: COLORS.primary, borderWidth: 1.5 }
                      : (choresByDate[dStr] && !isPast)
                        ? { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }
                        : {}
                ]}>
                  {holiday && <View style={{ position: 'absolute', top: -2, right: -2, width: 6, height: 6, backgroundColor: '#FBBF24', borderRadius: 3, borderWidth: 1, borderColor: '#fff' }} />}
                  <Text style={[
                    styles.dateText,
                    isSelected
                      ? { color: '#fff' }
                      : isToday
                        ? { color: COLORS.primary }
                        : (isPast || isOverLimit)
                          ? { color: '#CBD5E1' }
                          : { color: '#334155' }
                  ]}>
                    {d}
                  </Text>
                  {choresByDate[dStr] && !isPast && !isOverLimit && (
                    <View style={{
                      position: 'absolute',
                      bottom: 6,
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: isSelected ? '#fff' : COLORS.primary
                    }} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  // Bug #7 fixed: create new Date instead of mutating calDate
  const renderMonthGrid = () => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: GRID_SIDE_PADDING }}>
      {Array.from({ length: 12 }, (_, i) => {
        const d = new Date(calDate.getFullYear(), i, 1);
        const isSelected = calDate.getMonth() === i;
        const today = new Date();
        const isPastMonth = d.getFullYear() < today.getFullYear() || (d.getFullYear() === today.getFullYear() && d.getMonth() < today.getMonth());
        const isOverLimit = d > limitDate;
        return (
          <Pressable key={i} disabled={isPastMonth || isOverLimit} onPress={() => { setCalDate(new Date(calDate.getFullYear(), i, 1)); setCalMode('Day'); Haptics.selectionAsync(); }} style={{ width: '33.33%', padding: 6, opacity: (isPastMonth || isOverLimit) ? 0.3 : 1 }}>
            <View style={[{ width: '100%', paddingVertical: 16, alignItems: 'center', borderRadius: 16 }, isSelected ? { backgroundColor: COLORS.primary } : { backgroundColor: '#F8FAFC' }]}>
              <Text style={[{ fontSize: 16, fontWeight: '800' }, isSelected ? { color: '#fff' } : { color: (isPastMonth || isOverLimit) ? '#CBD5E1' : '#334155' }]}>{d.toLocaleDateString('en-US', { month: 'short' })}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  const renderYearGrid = () => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: GRID_SIDE_PADDING }}>
      {Array.from({ length: 12 }, (_, i) => {
        const today = new Date();
        const year = today.getFullYear() + i;
        const isSelected = calDate.getFullYear() === year;
        const isOverLimit = year > limitDate.getFullYear();
        return (
          <Pressable key={i} disabled={isOverLimit} onPress={() => { setCalDate(new Date(year, calDate.getMonth(), 1)); setCalMode('Month'); Haptics.selectionAsync(); }} style={{ width: '33.33%', padding: 6, opacity: isOverLimit ? 0.3 : 1 }}>
            <View style={[{ width: '100%', paddingVertical: 16, alignItems: 'center', borderRadius: 16 }, isSelected ? { backgroundColor: COLORS.primary } : { backgroundColor: '#F8FAFC' }]}>
              <Text style={[{ fontSize: 16, fontWeight: '800' }, isSelected ? { color: '#fff' } : { color: isOverLimit ? '#CBD5E1' : '#334155' }]}>{year}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View className="bg-slate-50 dark:bg-zinc-950 border-b border-gray-100 dark:border-zinc-900 z-30">
      <View style={{ height: 76 }}>
        <Animated.FlatList
          ref={flatListRef}
          data={stripDates}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12 }}
          decelerationRate="fast"
          snapToInterval={STEP}
          snapToAlignment="start"
          keyExtractor={item => item.str}
          renderItem={renderStripItem}
          ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
          getItemLayout={(_, index) => ({
            length: STEP,
            offset: STEP * index,
            index,
          })}
          onScroll={(e) => {
            if (!onScrollMonth) return;
            const offsetX = e.nativeEvent.contentOffset.x;
            // Subtract initial padding (20) and use mid-item threshold for more natural month label switching
            const idx = Math.round((offsetX - 20 + STEP / 2) / STEP);
            const d = stripDates[Math.max(0, Math.min(idx, stripDates.length - 1))];
            if (d) onScrollMonth(parseLocalDate(d.str).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
          }}
          scrollEventThrottle={16}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
        />
      </View>
      <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsExpanded(!isExpanded); }} className="items-center py-0.5 bg-slate-50 dark:bg-zinc-950 border-t border-slate-50 dark:border-zinc-900/50">
        <ChevronDown size={16} color="#CBD5E1" style={isExpanded ? { transform: [{ rotate: '180deg' }] } : {}} />
      </TouchableOpacity>
      <Animated.View style={expansionStyle} className="bg-white dark:bg-zinc-950">
        <View className="flex-row justify-between items-center mb-3 mt-2 px-6">
          {(() => {
            const today = new Date(); today.setHours(0,0,0,0);
            const canGoBack = calMode === 'Day'
              ? (calDate.getFullYear() > today.getFullYear() || (calDate.getFullYear() === today.getFullYear() && calDate.getMonth() > today.getMonth()))
              : calMode === 'Month'
                ? calDate.getFullYear() > today.getFullYear()
                : false; // Year mode starts at current year

            return (
              <TouchableOpacity
                disabled={!canGoBack}
                onPress={() => {
                  const next = new Date(calDate);
                  if (calMode === 'Day') next.setMonth(calDate.getMonth() - 1);
                  else if (calMode === 'Month') next.setFullYear(calDate.getFullYear() - 1);
                  else next.setFullYear(calDate.getFullYear() - 12);
                  setCalDate(next);
                }}
                style={{ opacity: canGoBack ? 1 : 0.2 }}
              >
                <ChevronLeft size={18} color={COLORS.primary} />
              </TouchableOpacity>
            );
          })()}

          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); if (calMode === 'Day') setCalMode('Month'); else if (calMode === 'Month') setCalMode('Year'); else setCalMode('Day'); }}>
            <Text className="text-slate-900 dark:text-white font-black text-base">{calMode === 'Day' ? calDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : calMode === 'Month' ? calDate.getFullYear() : `${calDate.getFullYear()} – ${calDate.getFullYear() + 11}`}</Text>
          </TouchableOpacity>

          {(() => {
            const canGoForward = calMode === 'Day'
              ? (new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1) <= limitDate)
              : calMode === 'Month'
                ? (calDate.getFullYear() + 1 <= limitDate.getFullYear())
                : false; // 10yr limit is within the first page of 12yr view

            return (
              <TouchableOpacity
                disabled={!canGoForward}
                onPress={() => {
                  const next = new Date(calDate);
                  if (calMode === 'Day') next.setMonth(calDate.getMonth() + 1);
                  else if (calMode === 'Month') next.setFullYear(calDate.getFullYear() + 1);
                  else next.setFullYear(calDate.getFullYear() + 12);
                  setCalDate(next);
                }}
                style={{ opacity: canGoForward ? 1 : 0.2 }}
              >
                <ChevronRight size={18} color={COLORS.primary} />
              </TouchableOpacity>
            );
          })()}
        </View>
        {calMode === 'Day' ? renderDayGrid() : calMode === 'Month' ? renderMonthGrid() : renderYearGrid()}
        <View className="h-4" />
      </Animated.View>
    </View>
  );
}));

// --- SECTION EDIT SHEET ---
const SectionEditSheet = React.memo(({
  section, onClose, onRename, onDelete, onChangeColor,
  onMoveUp, onMoveDown, canMoveUp, canMoveDown,
}: {
  section: Section;
  onClose: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string, dismiss: () => void) => void;
  onChangeColor: (id: string, color: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) => {
  const [editTitle, setEditTitle] = useState(section.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const translateY = useSharedValue(700);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    translateY.value = withSpring(0, { ...SPRING_CONFIG, damping: 30 });
  }, []);

  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  const dismiss = useCallback(() => {
    translateY.value = withTiming(700, { duration: 260, easing: Easing.in(Easing.ease) });
    setTimeout(onClose, 260);
  }, [onClose]);

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.value = g.dy; },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 80 || g.vy > 0.8) {
        translateY.value = withTiming(700, { duration: 250 });
        setTimeout(onClose, 260);
      } else {
        translateY.value = withSpring(0, { damping: 28, stiffness: 280 });
      }
    },
  })).current;

  const handleSave = () => {
    onRename(section.id, editTitle);
    dismiss();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={dismiss} />
        <Animated.View {...pan.panHandlers} style={[panelStyle, { backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: insets.bottom + 20 }]}>
          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 2 }}>
            <View style={{ width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2 }} />
          </View>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 20 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#0F172A' }}>Edit Section</Text>
            <TouchableOpacity onPress={dismiss} style={{ backgroundColor: '#F1F5F9', padding: 8, borderRadius: 99 }}>
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
          {/* Content */}
          <View style={{ paddingHorizontal: 24, gap: 20 }}>
            {/* Name */}
            <View>
              <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Section Name</Text>
              <TextInput
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Section name"
                placeholderTextColor="#94A3B8"
                returnKeyType="done"
                onSubmitEditing={handleSave}
                style={{ backgroundColor: '#F8FAFC', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, fontSize: 16, fontWeight: '800', color: '#0F172A', borderWidth: 1.5, borderColor: '#F1F5F9' }}
              />
            </View>
            {/* Color */}
            <View>
              <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>Color</Text>
              <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'space-between' }}>
                {SECTION_COLORS.map(color => {
                  const isSelected = section.themeColor === color;
                  return (
                    <TouchableOpacity
                      key={color}
                      onPress={() => { onChangeColor(section.id, color); Haptics.selectionAsync(); }}
                      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: color,
                        borderWidth: isSelected ? 3 : 0, borderColor: 'white',
                        shadowColor: color === '#1C1C1E' ? '#000' : color,
                        shadowOpacity: isSelected ? 0.55 : 0.3, shadowRadius: isSelected ? 8 : 4,
                        shadowOffset: { width: 0, height: 2 }, elevation: isSelected ? 6 : 2 }}
                    />
                  );
                })}
              </View>
            </View>
            {/* Order */}
            {(canMoveUp || canMoveDown) && (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={() => { onMoveUp(); Haptics.selectionAsync(); }} disabled={!canMoveUp}
                  style={{ flex: 1, paddingVertical: 13, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, backgroundColor: canMoveUp ? '#EEF2FF' : '#F8FAFC' }}>
                  <ChevronUp size={15} color={canMoveUp ? COLORS.primary : '#CBD5E1'} />
                  <Text style={{ fontSize: 13, fontWeight: '900', color: canMoveUp ? COLORS.primary : '#CBD5E1' }}>Move Up</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { onMoveDown(); Haptics.selectionAsync(); }} disabled={!canMoveDown}
                  style={{ flex: 1, paddingVertical: 13, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, backgroundColor: canMoveDown ? '#EEF2FF' : '#F8FAFC' }}>
                  <ChevronDown size={15} color={canMoveDown ? COLORS.primary : '#CBD5E1'} />
                  <Text style={{ fontSize: 13, fontWeight: '900', color: canMoveDown ? COLORS.primary : '#CBD5E1' }}>Move Down</Text>
                </TouchableOpacity>
              </View>
            )}
            {/* Save */}
            <TouchableOpacity onPress={handleSave} style={{ backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 18, alignItems: 'center' }}>
              <Text style={{ color: 'white', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 }}>Save Changes</Text>
            </TouchableOpacity>
            {/* Delete */}
            <TouchableOpacity
              onPress={() => {
                const isAutoCreated = section.id.startsWith('rs_');
                if (isAutoCreated) {
                  // For auto-created recurring sections: delegate to parent which shows alert + handles dismiss
                  onDelete(section.id, dismiss);
                } else if (!confirmDelete) {
                  setConfirmDelete(true);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                } else {
                  onDelete(section.id, dismiss);
                }
              }}
              style={{ paddingVertical: 14, borderRadius: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, backgroundColor: confirmDelete ? '#EF4444' : '#FEF2F2' }}>
              <Trash2 size={15} color={confirmDelete ? 'white' : COLORS.red} />
              <Text style={{ fontSize: 14, fontWeight: '900', color: confirmDelete ? 'white' : COLORS.red }}>{confirmDelete ? 'Confirm Delete' : 'Delete Section'}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
});

// --- SECTION HEADER ---
const SectionHeader = React.memo(({
  section, onToggle, onRename, onDelete, onChangeColor,
  onMoveUp, onMoveDown, canMoveUp, canMoveDown,
  drag, isEditing, onStartEdit, onEndEdit, choreCount,
}: {
  section: Section; onToggle: () => void;
  onRename: (id: string, title: string) => void; onDelete: (id: string, dismiss?: () => void) => void;
  onChangeColor: (id: string, color: string) => void;
  onMoveUp: () => void; onMoveDown: () => void;
  canMoveUp: boolean; canMoveDown: boolean;
  drag?: () => void; isEditing: boolean;
  onStartEdit: () => void; onEndEdit: () => void;
  choreCount: number;
}) => {
  return (
    <View collapsable={false}>
      <TouchableOpacity
        activeOpacity={1}
        onLongPress={() => { onStartEdit(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
        delayLongPress={350}
        onPress={onToggle}
        className="flex-row items-center justify-between py-3 px-6 border-t border-slate-100 dark:border-zinc-800 bg-white"
      >
        <View className="flex-row items-center flex-1">
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: section.themeColor, marginRight: 10 }} />
          <Text className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">{section.title}</Text>
          {section.isCollapsed && choreCount > 0 && (
            <View style={{ backgroundColor: section.themeColor + '22', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, marginLeft: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: '900', color: section.themeColor }}>{choreCount}</Text>
            </View>
          )}
          <View className="ml-3 h-[1px] flex-1 bg-slate-100 dark:bg-zinc-800" />
        </View>
        <View className="flex-row items-center ml-3 gap-0.5">
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onStartEdit(); }} className="p-1.5">
            <MoreHorizontal size={16} color="#CBD5E1" />
          </TouchableOpacity>
          <View className="p-1">
            {section.isCollapsed ? <ChevronRight size={16} color="#CBD5E1" /> : <ChevronDown size={16} color="#CBD5E1" />}
          </View>
        </View>
      </TouchableOpacity>
      {isEditing && (
        <SectionEditSheet
          section={section}
          onClose={onEndEdit}
          onRename={onRename}
          onDelete={onDelete}
          onChangeColor={onChangeColor}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
        />
      )}
    </View>
  );
});

// --- RECURRENCE HUMAN LABEL ---
function humanRRuleLabel(rule: string): string {
  if (!rule) return 'Repeating';
  // Plain preset strings (e.g. "Every Day", "Every Week") pass through
  if (!rule.startsWith('FREQ=')) return rule.split(':')[0];
  const parts: Record<string, string> = {};
  rule.split(';').forEach(p => { const [k, v] = p.split('='); if (k && v !== undefined) parts[k] = v; });
  const freq = parts['FREQ'] ?? '';
  const interval = parseInt(parts['INTERVAL'] ?? '1', 10);
  const byday = parts['BYDAY'] ?? '';
  const bymonthday = parts['BYMONTHDAY'] ?? '';
  const bymonth = parts['BYMONTH'] ?? '';
  const bysetpos = parts['BYSETPOS'] ? parseInt(parts['BYSETPOS'], 10) : null;
  const count = parts['COUNT'] ? parseInt(parts['COUNT'], 10) : null;
  const DAY_FULL: Record<string, string> = { MO: 'Monday', TU: 'Tuesday', WE: 'Wednesday', TH: 'Thursday', FR: 'Friday', SA: 'Saturday', SU: 'Sunday' };
  const DAY_SHORT: Record<string, string> = { MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun' };
  const MONTH_FULL: Record<string, string> = { 1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun', 7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec' };
  const ORDINAL: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', '-1': 'last' };
  const ordinalStr = (n: number) => ORDINAL[n] ?? `${n}th`;
  const dayOrdinalSuffix = (n: number) => n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
  let label = '';
  if (freq === 'Daily') {
    label = interval === 1 ? 'Every day' : `Every ${interval} days`;
  } else if (freq === 'Weekly') {
    const days = byday ? byday.split(',').map(d => DAY_SHORT[d] ?? d).join(', ') : '';
    const every = interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
    label = days ? `${every} · ${days}` : every;
  } else if (freq === 'Monthly') {
    const every = interval === 1 ? 'Monthly' : `Every ${interval} months`;
    if (bysetpos !== null && byday) {
      const dayName = DAY_FULL[byday] ?? byday;
      label = `${every} · ${ordinalStr(bysetpos)} ${dayName}`;
    } else if (bymonthday) {
      const d = bymonthday.split(',').map(n => { const i = parseInt(n); return `${i}${dayOrdinalSuffix(i)}`; }).join(', ');
      label = `${every} · ${d}`;
    } else {
      label = every;
    }
  } else if (freq === 'Yearly') {
    const every = interval === 1 ? 'Yearly' : `Every ${interval} years`;
    const months = bymonth ? bymonth.split(',').map(m => MONTH_FULL[m] ?? m).join(', ') : '';
    if (bysetpos !== null && byday) {
      const dayName = DAY_FULL[byday] ?? byday;
      label = `${every} · ${ordinalStr(bysetpos)} ${dayName}${months ? ` in ${months}` : ''}`;
    } else {
      label = months ? `${every} · ${months}` : every;
    }
  } else {
    label = interval === 1 ? freq : `Every ${interval} ${freq.toLowerCase()}s`;
  }
  if (count !== null) label += ` · ${count}×`;
  return label;
}

// --- PHOTO CAROUSEL MODAL ---
const PhotoCarouselModal = ({
  visible, slides, initialIndex, choreTitle, assignee, avatar, onClose,
}: {
  visible: boolean;
  slides: { slot: 'before' | 'after'; uri: string }[];
  initialIndex: number;
  choreTitle: string;
  assignee: string | null;
  avatar: string;
  onClose: () => void;
}) => {
  const { width: SW } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIdx, setActiveIdx] = useState(initialIndex);

  // Scroll to initial page when modal opens
  useEffect(() => {
    if (visible && slides.length > 1) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: initialIndex * SW, animated: false });
        setActiveIdx(initialIndex);
      }, 50);
    } else {
      setActiveIdx(0);
    }
  }, [visible, initialIndex, SW, slides.length]);

  const hasPager = slides.length > 1;
  const currentSlot = slides[activeIdx]?.slot;
  const slotColor = currentSlot === 'before' ? '#FCD34D' : '#6EE7B7';
  const slotBg = currentSlot === 'before' ? 'rgba(251,191,36,0.2)' : 'rgba(52,211,153,0.2)';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Top bar */}
        <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '900', letterSpacing: -0.3 }} numberOfLines={1}>{choreTitle}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}>
              <Text style={{ fontSize: 15 }}>{avatar}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '700' }}>{assignee ?? 'Unassigned'}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={{ backgroundColor: 'rgba(255,255,255,0.12)', padding: 9, borderRadius: 99 }}>
            <X size={18} color="white" />
          </TouchableOpacity>
        </View>

        {/* Swipeable images + bottom overlay */}
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={hasPager}
            onMomentumScrollEnd={e => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
              setActiveIdx(idx);
            }}
            style={{ flex: 1 }}
          >
            {slides.map(s => (
              <Pressable key={s.slot} style={{ width: SW, flex: 1, alignItems: 'center', justifyContent: 'center' }} onPress={onClose}>
                <Image source={{ uri: s.uri }} style={{ width: SW, height: '100%' }} contentFit="contain" />
              </Pressable>
            ))}
          </ScrollView>

          {/* Pill + dots overlay at bottom of photo area */}
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 20, alignItems: 'center', gap: 10, pointerEvents: 'none' }}>
            {/* Slot pill */}
            {currentSlot && (
              <View style={{ backgroundColor: slotBg, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: `${slotColor}40` }}>
                <Text style={{ color: slotColor, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>{currentSlot === 'before' ? 'Before' : 'After'}</Text>
              </View>
            )}
            {/* Pager dots */}
            {hasPager && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {slides.map((s, i) => (
                  <View key={s.slot} style={{
                    height: 6, borderRadius: 99,
                    backgroundColor: i === activeIdx ? 'white' : 'rgba(255,255,255,0.3)',
                    width: i === activeIdx ? 22 : 6,
                  }} />
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Bottom hint */}
        <View style={{ paddingBottom: 40, alignItems: 'center', gap: 4 }}>
          {hasPager && (
            <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '700' }}>
              {activeIdx === 0 ? 'Swipe left for After →' : '← Swipe right for Before'}
            </Text>
          )}
          <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: '600' }}>Tap to close</Text>
        </View>
      </View>
    </Modal>
  );
};

// --- PHOTO SLOT BUTTON ---
const PhotoSlotButton = ({ slot, uri, provided, onPress, onPressView, isCompleted }: {
  slot: 'before' | 'after';
  uri?: string;
  provided: boolean;
  onPress: () => void;
  onPressView?: () => void;
  isCompleted?: boolean;
}) => (
  <TouchableOpacity
    onPress={uri ? onPressView : (isCompleted ? undefined : onPress)}
    onLongPress={uri && !isCompleted ? onPress : undefined}
    delayLongPress={350}
    activeOpacity={0.8}
    style={{ flex: 1, borderRadius: 20, overflow: 'hidden', minHeight: 100, borderWidth: 1.5, borderStyle: uri ? 'solid' : 'dashed', borderColor: provided ? COLORS.green : '#CBD5E1' }}
  >
    {uri ? (
      <View style={{ flex: 1 }}>
        <Image source={{ uri }} style={{ width: '100%', height: 100 }} contentFit="cover" />
        <View style={{ position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <CheckCircle2 size={10} color="white" />
          <Text style={{ fontSize: 9, fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: 0.5 }}>{slot}</Text>
        </View>
        {!isCompleted && (
          <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontSize: 8, fontWeight: '900', color: 'white', textTransform: 'uppercase' }}>hold to change</Text>
          </View>
        )}
      </View>
    ) : (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 22, backgroundColor: '#F8FAFC', gap: 6 }}>
        <Camera size={22} color="#94A3B8" />
        <Text style={{ fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, color: '#94A3B8' }}>{slot}</Text>
      </View>
    )}
  </TouchableOpacity>
);

// --- PLINKO BOARD MODAL ---
// --- ASSIGN CHORE SHEET ---
const AssignChoreSheet = ({
  chore, familyMembers, currentUser, onAssignToMe, onAssignTo, onClose, choreCounts, hideAssignToMe, onRandomGame,
}: {
  chore: Chore;
  familyMembers: any[];
  currentUser: string;
  onAssignToMe: () => void;
  onAssignTo: (member: any) => void;
  onClose: () => void;
  choreCounts?: Record<string, number>;
  hideAssignToMe?: boolean;
  onRandomGame?: () => void;
}) => {
  const translateY = useSharedValue(500);
  const insets = useSafeAreaInsets();
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    translateY.value = withSpring(0, { ...SPRING_CONFIG, damping: 30 });
  }, []);

  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  const handleClose = useCallback(() => {
    translateY.value = withTiming(500, { duration: 240, easing: Easing.in(Easing.ease) });
    setTimeout(onClose, 240);
  }, [onClose]);

  const dragGesture = Gesture.Pan()
    .onUpdate(e => { if (e.translationY > 0) translateY.value = e.translationY; })
    .onEnd(e => {
      if (e.translationY > 80 || e.velocityY > 700) {
        translateY.value = withTiming(500, { duration: 240, easing: Easing.in(Easing.ease) });
        runOnJS(handleClose)();
      } else {
        translateY.value = withSpring(0, { ...SPRING_CONFIG, damping: 28 });
      }
    });

  const others = familyMembers.filter(m => m.name !== currentUser);

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <GestureDetector gesture={dragGesture}>
          <Animated.View style={[panelStyle, { backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: insets.bottom + 16 }]}>
            {/* Handle */}
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 2.5 }} />
            </View>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 12 }}>
              <View>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#0F172A' }}>Who&apos;s doing this?</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#94A3B8', marginTop: 2 }} numberOfLines={1}>{chore.title}</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={{ backgroundColor: '#F1F5F9', padding: 8, borderRadius: 99 }}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 24, gap: 10 }}>
              {/* Assign to me */}
              {!hideAssignToMe && <TouchableOpacity
                onPress={onAssignToMe}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#EEF2FF', borderRadius: 18, paddingHorizontal: 18, paddingVertical: 16 }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 20 }}>{familyMembers.find(m => m.name === currentUser)?.avatar ?? '👤'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '900', color: COLORS.primary }}>Assign to Me</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#6366F1', opacity: 0.7 }}>{currentUser}{choreCounts && choreCounts[currentUser] !== undefined ? ` · ${choreCounts[currentUser]} chore${choreCounts[currentUser] !== 1 ? 's' : ''}` : ''}</Text>
                </View>
                <ChevronRight size={18} color={COLORS.primary} />
              </TouchableOpacity>}

              {/* Assign to someone else */}
              <TouchableOpacity
                onPress={() => setShowPicker(!showPicker)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#F8FAFC', borderRadius: 18, paddingHorizontal: 18, paddingVertical: 16, borderWidth: 1, borderColor: '#E2E8F0' }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 20 }}>👥</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '900', color: '#1E293B' }}>Assign to Someone</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#94A3B8' }}>Pick a family member</Text>
                </View>
                <ChevronDown size={18} color="#94A3B8" style={showPicker ? { transform: [{ rotate: '180deg' }] } : undefined} />
              </TouchableOpacity>

              {/* Member list */}
              {showPicker && (
                <View style={{ backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' }}>
                  {others.map((m, idx) => (
                    <TouchableOpacity
                      key={m.name}
                      onPress={() => onAssignTo(m)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: idx < others.length - 1 ? 1 : 0, borderBottomColor: '#F1F5F9' }}
                    >
                      <Text style={{ fontSize: 22 }}>{m.avatar}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B' }}>{m.name}</Text>
                        {choreCounts && choreCounts[m.name] !== undefined && (
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#94A3B8' }}>{choreCounts[m.name]} chore{choreCounts[m.name] !== 1 ? 's' : ''} today</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Random Game */}
              {onRandomGame && (
                <TouchableOpacity
                  onPress={() => { onClose(); setTimeout(onRandomGame, 260); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#F5F3FF', borderRadius: 18, paddingHorizontal: 18, paddingVertical: 16, borderWidth: 1, borderColor: '#DDD6FE' }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' }}>
                    <Dices size={20} color="white" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '900', color: '#6D28D9' }}>Let a Game Decide</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#8B5CF6', opacity: 0.8 }}>Fair, logged & verified</Text>
                  </View>
                  <ChevronRight size={18} color="#7C3AED" />
                </TouchableOpacity>
              )}

            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
};

// --- RESTOCK-STYLE CHORE ITEM ---
const RestockStyleChoreItem = React.memo(({
  chore, isExpanded, onToggleExpand, onComplete, onRevert, onDelete, onDefer, onEdit, sectionColor, isLast, isFirst, connectsToHeader, isDragging, onDragStart,
  onNudge, onUploadPhoto, onAssignToMe, onAssignTo, currentUser, hideColorBar, isHighlighted, familyMembers, onPointsNotify,
  bulkSelectMode, isSelected, onEnterBulkSelect, onSelectToggle, choreCounts, onReassignSwipe, isFutureChore, onRandomGame,
}: {
  chore: Chore; isExpanded: boolean; onToggleExpand: () => void;
  onComplete: (id: string) => void; onRevert?: (id: string) => void; onDelete: (id: string) => void;
  onDefer: (id: string) => void; onEdit?: (chore: Chore) => void;
  isFutureChore?: boolean;
  sectionColor: string; currentUser?: string; isLast: boolean; isFirst?: boolean; connectsToHeader?: boolean;
  onDragStart?: () => void; isDragging?: boolean;
  onNudge?: (id: string) => void;
  onUploadPhoto?: (id: string, slot: 'before' | 'after', uri: string | null) => void;
  onAssignToMe?: (id: string) => void;
  onAssignTo?: (id: string, member: any, isMe: boolean) => void;
  hideColorBar?: boolean;
  isHighlighted?: boolean;
  familyMembers: any[];
  onPointsNotify?: (pts: number, total: number) => void;
  bulkSelectMode?: boolean;
  isSelected?: boolean;
  onEnterBulkSelect?: (id: string) => void;
  onSelectToggle?: (id: string) => void;
  choreCounts?: Record<string, number>;
  onReassignSwipe?: (id: string) => void;
  onRandomGame?: (chore: Chore) => void;
}) => {
  const [completionStep, setCompletionState] = useState<'idle' | 'confirming'>('idle');
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<{ uri: string; slot: 'before' | 'after' } | null>(null);
  const [showAssignSheet, setShowAssignSheet] = useState(false);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const swipeableRef = useRef<SwipeableMethods>(null);
  const justEnteredBulkRef = useRef(false);

  const glowProgress = useSharedValue(0);
  useEffect(() => {
    if (isHighlighted) {
      glowProgress.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0, { duration: 300 })
      );
    }
  }, [isHighlighted]);

  const glowStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(glowProgress.value, [0, 1], ['transparent', '#E0E7FF']),
  }));

  // auto-reset confirmation after 3s
  useEffect(() => {
    if (completionStep === 'confirming') {
      confirmTimerRef.current = setTimeout(() => {
        setCompletionState('idle');
        progress.value = withTiming(0, { duration: 0 });
      }, 3000);

      progress.value = 0;
      progress.value = withTiming(1, { duration: 3000, easing: Easing.linear });
    } else {
      progress.value = withTiming(0, { duration: 200 });
    }
    return () => { if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current); };
  }, [completionStep]);

  const circleScale = useSharedValue(1);
  const progress = useSharedValue(0);

  const circleAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));

  const animatedCircleProps = useAnimatedProps(() => {
    const radius = 10;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progress.value);
    return {
      strokeDashoffset,
      strokeDasharray: `${circumference} ${circumference}`,
    };
  });

  const [isDeleting, setIsDeleting] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const isOthersChore = chore.assignee && currentUser && chore.assignee !== currentUser;
  const photosMissing = chore.photoRequired && (
    !chore.photoProvided.after ||
    (chore.photoMode === 'both' && !chore.photoProvided.before)
  );

  const handleCirclePress = () => {
    // HAR-35: In bulk mode, circle repurposes as selection toggle
    if (bulkSelectMode) {
      onSelectToggle?.(chore.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    if (chore.status === 'completed') {
      onRevert?.(chore.id);
      return;
    }

    // 0. Unassigned — must assign first
    if (!chore.assignee) {
      setShowAssignSheet(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }

    // 1. If assigned to someone else
    if (isOthersChore) {
      Alert.alert(
        "Chore Not Yours",
        `This chore is assigned to ${chore.assignee}. Do you want to complete it on their behalf or reassign it to yourself?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: `Complete for ${chore.assignee}`,
            onPress: () => {
              onComplete(chore.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
          {
            text: "Reassign to Me",
            onPress: () => {
              onAssignToMe?.(chore.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }
        ]
      );
      return;
    }

    // 2. Simple confirmation flow (starts for everyone)
    if (completionStep === 'idle') {
      setCompletionState('confirming');
      // Auto-expand if photos are needed so user can see where to upload
      if (photosMissing && !isExpanded) {
        onToggleExpand();
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }

    // 3. Second tap logic — enforce photo requirement
    if (photosMissing) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const needsBefore = chore.photoRequired && chore.photoMode === 'both' && !chore.photoProvided.before;
      const needsAfter = chore.photoRequired && !chore.photoProvided.after;
      const missing = needsBefore && needsAfter
        ? 'before and after photos'
        : needsBefore
        ? 'a before photo'
        : 'an after photo';
      Alert.alert('Photo Required', `Please upload ${missing} before marking this chore as complete.`);
      return;
    }

    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    // Completion burst then card flash
    circleScale.value = withSequence(
      withSpring(1.2, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 300 }),
    );

    // Core completion trigger
    onComplete(chore.id);

    // Points notification trigger is now centralized in handleCompleteChore (onComplete)
    /*
    const isMine = chore.assignee === currentUser || chore.assigned_to === currentUser;
    if (isMine) {
      const user = familyMembers.find(m => m.name === currentUser);
      if (user) onPointsNotify?.(chore.points, user.stats.pointsEarned + chore.points);
    }
    */

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCompletionState('idle');
  };

  const handlePhotoPress = async (slot: 'before' | 'after') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const pickImage = async (useCamera: boolean) => {
      try {
        const { status } = useCamera
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            `HomeHuddle needs ${useCamera ? 'camera' : 'photo library'} access. Open Settings to enable it.`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
          return;
        }

        const result = useCamera
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.7 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.7 });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          onUploadPhoto?.(chore.id, slot, result.assets[0].uri);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch {
        Alert.alert('Photo Error', 'Something went wrong while selecting a photo. Please try again.');
      }
    };

    try {
      Alert.alert('Add Photo', 'Choose a source', [
        { text: 'Cancel', style: 'cancel' },
        { text: '📷  Camera', onPress: () => pickImage(true) },
        { text: '🖼️  Gallery', onPress: () => pickImage(false) },
      ]);
    } catch {
      Alert.alert('Photo Error', 'Unable to open photo picker. Please try again.');
    }
  };

  const renderRightActions = (prog: any, drag: any) => {
    const hasAssign = isOthersChore;
    const hasReassign = !!chore.assignee && !isOthersChore;
    const hasAssignUnassigned = !chore.assignee;
    const buttonCount = (hasAssign ? 1 : 0) + (hasReassign ? 1 : 0) + (hasAssignUnassigned ? 1 : 0) + 2;
    const width = buttonCount * 80;

    return (
      <View style={{ width, flexDirection: 'row', alignSelf: 'stretch', marginBottom: 1, overflow: 'hidden' }}>
        <RightActions
          drag={drag}
          width={width}
          hasAssign={hasAssign}
          hasReassign={hasReassign}
          hasAssignUnassigned={hasAssignUnassigned}
          choreId={chore.id}
          onAssignToMe={onAssignToMe}
          onReassign={onReassignSwipe}
          onAssignUnassigned={() => setShowAssignSheet(true)}
          onDefer={onDefer}
          onDelete={onDelete}
          isDeleting={isDeleting}
          setIsDeleting={setIsDeleting}
          isAssigning={isAssigning}
          setIsAssigning={setIsAssigning}
          swipeableRef={swipeableRef}
        />
      </View>
    );
  };

  const timeColor = chore.estMinutes <= 30 ? COLORS.green : chore.estMinutes <= 60 ? COLORS.blue : COLORS.orange;

  const itemContent = (
    <Animated.View style={[{ opacity: isDragging && !bulkSelectMode ? 0.6 : 1, backgroundColor: chore.status === 'completed' ? '#F8FAFC' : 'white', borderBottomWidth: isLast ? 0 : 1, borderBottomColor: '#F1F5F9', overflow: 'hidden', borderTopLeftRadius: isFirst && !connectsToHeader ? 12 : 0, borderBottomLeftRadius: isLast ? 12 : 0 }, glowStyle]}>
      {sectionColor && !hideColorBar && (
        <View style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          backgroundColor: sectionColor,
        }} />
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* CIRCLE ZONE - Today/past: complete on tap, bulk on long-press. Future: bulk on single tap. */}
        <Pressable
          onPress={
            bulkSelectMode
              ? () => { if (justEnteredBulkRef.current) { justEnteredBulkRef.current = false; return; } onSelectToggle?.(chore.id); }
              : isFutureChore
                ? () => { justEnteredBulkRef.current = true; onEnterBulkSelect?.(chore.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }
                : handleCirclePress
          }
          onLongPress={!bulkSelectMode && !isFutureChore && chore.status !== 'completed' ? () => { justEnteredBulkRef.current = true; onEnterBulkSelect?.(chore.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } : undefined}
          delayLongPress={400}
          style={{ paddingVertical: 12, paddingLeft: 16, paddingRight: 10, alignItems: 'center', justifyContent: 'center', width: 50, zIndex: 50 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {bulkSelectMode ? (
            <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: isSelected ? '#3B82F6' : '#CBD5E1', backgroundColor: isSelected ? '#3B82F6' : 'white', alignItems: 'center', justifyContent: 'center' }}>
              {isSelected && <Check size={14} color="white" />}
            </View>
          ) : isFutureChore ? (
            <LucideCircle size={24} color="#CBD5E1" />
          ) : chore.status === 'completed' ? (
            <CheckCircle2 size={24} color="#10B981" />
          ) : completionStep === 'confirming' ? (
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: photosMissing ? '#FFF7ED' : '#EEF2FF', borderWidth: 2, borderColor: photosMissing ? '#F97316' : COLORS.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                <Svg width="24" height="24" viewBox="0 0 24 24" style={{ transform: [{ rotate: '-90deg' }] }}>
                  <AnimatedCircle cx="12" cy="12" r="10" stroke={photosMissing ? "#F97316" : COLORS.primary} strokeWidth="2.5" fill="none" animatedProps={animatedCircleProps} />
                </Svg>
              </View>
              {photosMissing ? <Camera size={12} color="#F97316" /> : <CheckCircle size={14} color={COLORS.primary} />}
            </View>
          ) : (
            <LucideCircle size={24} color="#E2E8F0" />
          )}
        </Pressable>

        {/* CARD CONTENT ZONE - Tapping here expands for active chores (to Edit) or photo proof */}
        <Pressable
          onPress={(chore.status !== 'completed' || chore.photoRequired) ? onToggleExpand : undefined}
          onLongPress={chore.status === 'completed' || bulkSelectMode ? undefined : () => { onDragStart?.(); }}
          delayLongPress={200}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingRight: 16, paddingVertical: 12, zIndex: 10 }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: chore.status === 'completed' ? '#94A3B8' : '#1E293B', textDecorationLine: chore.status === 'completed' ? 'line-through' : 'none', flex: 1 }} numberOfLines={1}>
                {chore.title}
              </Text>
              {(chore.status !== 'completed' || chore.photoRequired) && (
                <ChevronDown size={14} color="#CBD5E1" style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }} />
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F8FAFC', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                <Clock size={10} color={timeColor} />
                <Text style={{ fontSize: 10, fontWeight: '800', color: timeColor }}>{chore.estMinutes}m</Text>
              </View>
              <View style={{ backgroundColor: '#F8FAFC', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8' }}>{chore.points}pt</Text>
              </View>
              {!!chore.dueTime && chore.dueTime.includes(':') && !isFutureChore && chore.status !== 'completed' && (() => {
                const [hh, mm] = chore.dueTime.split(':').map(Number);
                if (isNaN(hh) || isNaN(mm)) return null;
                const now = new Date();
                const due = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm);
                const diffMs = due.getTime() - now.getTime();
                const diffMin = Math.round(diffMs / 60000);
                const isLate = diffMin < 0;
                const absDiff = Math.abs(diffMin);
                const label = absDiff < 60 ? `${absDiff}m` : `${Math.floor(absDiff / 60)}h${absDiff % 60 > 0 ? ` ${absDiff % 60}m` : ''}`;
                const chipColor = isLate ? '#FEF2F2' : diffMin <= 30 ? '#FFF7ED' : '#F0FDF4';
                const textColor = isLate ? '#EF4444' : diffMin <= 30 ? '#F97316' : '#22C55E';
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: chipColor, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                    <Clock size={10} color={textColor} />
                    <Text style={{ fontSize: 10, fontWeight: '800', color: textColor }}>{isLate ? `-${label}` : label}</Text>
                  </View>
                );
              })()}
              {chore.assignee && (
                <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.primary }}>{chore.assignee === currentUser ? 'Me' : chore.assignee}</Text>
                </View>
              )}
              {chore.isRecurring && !chore.isOverdue && (
                <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Repeat size={10} color={COLORS.green} />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.green }}>Recurring</Text>
                </View>
              )}
              {chore.photoRequired && (
                <View style={{ backgroundColor: '#FFF7ED', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#EA580C' }}>Photo</Text>
                </View>
              )}
              {chore.linkedRestockItems && chore.linkedRestockItems.length > 0 && (
                <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <ShoppingCart size={9} color="#16A34A" />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#16A34A' }}>Restock</Text>
                </View>
              )}
              {!!chore.randomAssignedBy && (
                <View style={{ backgroundColor: '#F5F3FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Dices size={9} color="#7C3AED" />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#7C3AED' }}>Random</Text>
                </View>
              )}
              {chore.randomAssignedOverridden && (
                <View style={{ backgroundColor: '#FFF1F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Dices size={9} color="#E11D48" />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#E11D48' }}>Reassigned</Text>
                </View>
              )}
              {chore.isRecurring && chore.missedStreak != null && chore.missedStreak > 0 && (
                <View style={{ backgroundColor: '#FFF1F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#E11D48' }}>Missed {chore.missedStreak}×</Text>
                </View>
              )}
              {!chore.isRecurring && chore.status !== 'completed' && (chore.dueDate < getTodayStr() || (chore.wasOverdue && chore.overdueDays)) && (() => {
                const days = chore.overdueDays ?? Math.ceil((new Date().getTime() - new Date(chore.dueDate + 'T00:00:00').getTime()) / 86400000);
                return days > 0 ? (
                  <View style={{ backgroundColor: '#FFF1F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#E11D48' }}>{days}d missed</Text>
                  </View>
                ) : null;
              })()}
            </View>
          </View>
        </Pressable>
      </View>

      {/* Assign sheet — shown when circle pressed on unassigned chore */}
      {showAssignSheet && (
        <AssignChoreSheet
          chore={chore}
          familyMembers={familyMembers}
          currentUser={currentUser ?? ''}
          onAssignToMe={() => { onAssignToMe?.(chore.id); setShowAssignSheet(false); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
          onAssignTo={(member) => { onAssignTo?.(chore.id, member, member.name === currentUser); setShowAssignSheet(false); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
          onClose={() => setShowAssignSheet(false)}
          choreCounts={choreCounts}
          onRandomGame={onRandomGame ? () => onRandomGame(chore) : undefined}
        />
      )}

      {isExpanded && (
        <View style={{ backgroundColor: 'white', padding: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
          {/* Notes */}
          {!!chore.notes && (
            <View style={{ marginBottom: 14, backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FEF3C7' }}>
              <Text style={{ fontSize: 10, fontWeight: '900', color: '#92400E', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>📋 Instructions</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#78350F', lineHeight: 18 }}>{chore.notes}</Text>
            </View>
          )}
          {/* Photo required section */}
          {chore.photoRequired && (
            <View style={{ marginBottom: chore.status === 'completed' ? 0 : 16, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {chore.status === 'completed' ? 'Family Moment' : 'Photo Check-In'}
                </Text>
                {chore.status !== 'completed' && (
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#CBD5E1' }}>tap to view · hold to change</Text>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {chore.photoMode !== 'after' && (
                  <PhotoSlotButton
                    slot="before"
                    uri={chore.photoProvided.beforeUri}
                    provided={chore.photoProvided.before}
                    isCompleted={chore.status === 'completed'}
                    onPress={() => handlePhotoPress('before')}
                    onPressView={() => chore.photoProvided.beforeUri && setPreviewPhoto({ uri: chore.photoProvided.beforeUri, slot: 'before' })}
                  />
                )}
                <PhotoSlotButton
                  slot="after"
                  uri={chore.photoProvided.afterUri}
                  provided={chore.photoProvided.after}
                  isCompleted={chore.status === 'completed'}
                  onPress={() => handlePhotoPress('after')}
                  onPressView={() => chore.photoProvided.afterUri && setPreviewPhoto({ uri: chore.photoProvided.afterUri, slot: 'after' })}
                />
              </View>
            </View>
          )}
          {/* Fullscreen photo preview */}
          {(() => {
            const hasBoth = chore.photoMode === 'both' && chore.photoProvided.beforeUri && chore.photoProvided.afterUri;
            const slides = hasBoth
              ? [
                  { slot: 'before' as const, uri: chore.photoProvided.beforeUri! },
                  { slot: 'after' as const, uri: chore.photoProvided.afterUri! },
                ]
              : previewPhoto
              ? [{ slot: previewPhoto.slot, uri: previewPhoto.uri }]
              : [];
            const initialIndex = hasBoth && previewPhoto?.slot === 'after' ? 1 : 0;
            return (
              <PhotoCarouselModal
                visible={!!previewPhoto}
                slides={slides}
                initialIndex={initialIndex}
                choreTitle={chore.title}
                assignee={chore.assignee}
                avatar={chore.avatar}
                onClose={() => setPreviewPhoto(null)}
              />
            );
          })()}

          {chore.isRecurring && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Repeat size={12} color="#94A3B8" />
              <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600' }}>
                {chore.recurrenceRule ? humanRRuleLabel(chore.recurrenceRule) : 'Repeating chore'}
              </Text>
              {chore.missedStreak != null && chore.missedStreak > 0 && (
                <Text style={{ fontSize: 11, color: '#E11D48', fontWeight: '600' }}>· {chore.missedStreak}× missed</Text>
              )}
            </View>
          )}

          {/* Linked Restock Items tracking */}
          {chore.linkedRestockItems && chore.linkedRestockItems.length > 0 && (
            <View style={{ marginBottom: 12, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#DCFCE7' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <ShoppingCart size={12} color="#16A34A" />
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#16A34A', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Restock Items
                </Text>
                {chore.isRecurring && (
                  <Text style={{ fontSize: 10, color: '#86EFAC', fontWeight: '600' }}>· auto-adds on completion</Text>
                )}
              </View>
              {chore.linkedRestockItems.map(item => (
                <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#15803D' }} numberOfLines={1}>
                    {item.name}{item.qty ? ` × ${item.qty}${item.unit ? ' ' + item.unit : ''}` : ''}
                  </Text>
                  {chore.isRecurring && item.everyN > 1 && (
                    <View style={{ backgroundColor: '#DCFCE7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#16A34A' }}>Every {item.everyN}×</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {chore.status !== 'completed' && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => { onEdit?.(chore); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={{ flex: 1, backgroundColor: '#F1F5F9', paddingVertical: 12, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                <Pencil size={16} color="#64748B" />
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#64748B' }}>Edit Chore</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );

  const didDragRef = useRef(false);

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      renderRightActions={chore.status === 'completed' || isDragging || bulkSelectMode ? undefined : renderRightActions}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      onSwipeableClose={() => { setIsDeleting(false); setIsAssigning(false); }}
      enabled={!isDragging && !bulkSelectMode}
    >
      {itemContent}
    </ReanimatedSwipeable>
  );
});

// Row types for the unified flat list
type FlatRow =
  | { type: 'chore'; chore: Chore; sectionId: string | null; sectionColor: string }
  | { type: 'section-header'; section: Section; itemCount: number };

const TodayChoreList = ({
  chores, sections, onCompleteChore, onRevertChore, onDeleteChore, onDeferChore, onEditChore, currentUser, onReassign, onReorderSections, onEditSection, onDeleteSection, listHeader, listFooter, onScrollBeginDrag, onScroll, scrollRef, flatListRef, scrollToChoreId, onScrolledToChore,
  onNudgeChore, onUploadPhoto, onAssignToMe, onAssignTo, highlightedId, activeSort, onAddToToday, onGoToTodayInstance, updateSection,
  refreshing, onRefresh, familyMembers, onPointsNotify, selectedDate, collapsed, setCollapsed,
  bulkSelectMode, selectedChoreIds, onEnterBulkSelect, onBulkSelectToggle, choreCounts, onReassignSwipe, onRandomGame,
}: {
  chores: Chore[]; sections: Section[];
  onCompleteChore: (id: string) => void; onRevertChore: (id: string) => void; onDeleteChore: (id: string) => void;
  onDeferChore: (id: string) => void; onEditChore: (chore: Chore) => void;
  currentUser: string;
  onReassign: (choreId: string, newSectionId: string | null, newPriority: number) => void;
  onReorderSections: (fromIdx: number, toIdx: number) => void;
  onEditSection: (id: string, title: string, color: string) => void;
  onDeleteSection: (id: string, dismiss?: () => void) => void;
  updateSection: (id: string, updates: Partial<Section>) => void;
  listHeader?: React.ReactNode;
  listFooter?: React.ReactNode;
  onScrollBeginDrag?: () => void;
  onScroll?: (y: number) => void;
  scrollRef?: React.RefObject<ScrollView | null>;
  flatListRef?: React.RefObject<any>;
  scrollToChoreId?: string | null;
  onScrolledToChore?: () => void;
  onNudgeChore: (id: string) => void;
  onUploadPhoto: any;
  onAssignToMe: (id: string) => void;
  onAssignTo: (id: string, member: any, isMe: boolean) => void;
  highlightedId?: string | null;
  activeSort?: ActiveSort;
  onAddToToday: (id: string) => void;
  onGoToTodayInstance: (chore: Chore) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  familyMembers: any[];
  onPointsNotify?: (pts: number, total: number) => void;
  selectedDate: string;
  collapsed: Record<string, boolean>;
  setCollapsed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  bulkSelectMode?: boolean;
  selectedChoreIds?: Set<string>;
  onEnterBulkSelect?: (id: string) => void;
  onBulkSelectToggle?: (id: string) => void;
  choreCounts?: Record<string, number>;
  onReassignSwipe?: (id: string) => void;
  onRandomGame?: (chore: Chore) => void;
}) => {
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [expandedChoreId, setExpandedChoreId] = useState<string | null>(null);
  const isDraggingRef = useRef(false);

  const sortedSections = useMemo(() =>
    [...sections].sort((a, b) => (a.priorityIndex || 0) - (b.priorityIndex || 0)), [sections]);

  // Must be a RefObject (not callback ref) so DraggableFlatList's internal autoscroll can call .scrollToOffset
  const internalListRef = useRef<any>(null);

  const flatData = useMemo((): FlatRow[] => {
    const rows: FlatRow[] = [];

    const sortSubset = (items: Chore[]) => {
      if (activeSort) return applySort(items, activeSort);
      return [...items].sort((a, b) => (a.priorityIndex ?? 0) - (b.priorityIndex ?? 0));
    };

    const uncategorizedChores = sortSubset(chores.filter(c => {
      const isToday = c.dueDate === selectedDate;
      const sectionExistsToday = c.sectionId ? sortedSections.some(s => s.id === c.sectionId) : false;
      return isToday && (!c.sectionId || !sectionExistsToday);
    }));

    // We no longer push the Uncategorized header into the rows array.
    // Instead, we only push its chores. The header itself will be rendered
    // via ListHeaderComponent to ensure it is a fixed physical boundary.
    if (!collapsed['uncategorized']) {
      uncategorizedChores.forEach(c => rows.push({
        type: 'chore',
        chore: c,
        sectionId: null,
        sectionColor: '#CBD5E1'
      }));
    }

    for (const s of sortedSections) {
      const sectionChores = sortSubset(chores.filter(c => c.sectionId === s.id));
      rows.push({ type: 'section-header', section: s, itemCount: sectionChores.length });
      if (!collapsed[s.id]) {
        sectionChores.forEach(c => rows.push({
          type: 'chore',
          chore: c,
          sectionId: s.id,
          sectionColor: s.themeColor
        }));
      }
    }
    return rows;
    }, [chores, sortedSections, collapsed, activeSort, selectedDate]);

    const handleDragEnd = ({ data }: { data: FlatRow[] }) => {
    // Chores dropped at the very top (above the first section header)
    // are automatically assigned to the Uncategorized section (sectionId: null)
    let currentSectionId: string | null = null;
    let globalIdx = 0;
    const choreUpdates: { id: string; sectionId: string | null; priorityIndex: number }[] = [];
    const sectionUpdates: { id: string; priorityIndex: number }[] = [];

    data.forEach((row) => {
      if (row.type === 'section-header') {
        currentSectionId = row.section.id;
        sectionUpdates.push({ id: row.section.id, priorityIndex: globalIdx++ });
      } else if (row.type === 'chore') {
        choreUpdates.push({
          id: row.chore.id,
          sectionId: currentSectionId,
          priorityIndex: globalIdx++
        });
      }
    });

    unstable_batchedUpdates(() => {
      choreUpdates.forEach(u => onReassign(u.id, u.sectionId, u.priorityIndex));
      sectionUpdates.forEach(u => {
        updateSection(u.id, { priorityIndex: u.priorityIndex });
      });
    });
    // Haptic feedback only on drag completion
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const flatDataRef = useRef(flatData);
    flatDataRef.current = flatData;

    useEffect(() => {
      if (!scrollToChoreId) return;

      // 1. Ensure the section containing this chore is expanded
      const targetChore = chores.find(c => c.id === scrollToChoreId);
      if (targetChore) {
        const sId = targetChore.sectionId || 'uncategorized';
        if (collapsed[sId]) {
          setCollapsed(prev => ({ ...prev, [sId]: false }));
          return; // Effect will re-run due to 'collapsed' or 'flatData' change
        }
      }

      // 2. Find index in current flatData
      const idx = flatData.findIndex(r => r.type === 'chore' && r.chore.id === scrollToChoreId);
      if (idx === -1) return;

      const ref = internalListRef.current;
      if (!ref) return;

      // Reliable scroll: attempt after layout settles, retry on failure
      const attemptScroll = (attempt = 0) => {
        try {
          ref.scrollToIndex({ index: idx, animated: true, viewPosition: 0.2 });
          setTimeout(() => onScrolledToChore?.(), 600);
        } catch (err) {
          if (attempt < 3) {
            setTimeout(() => attemptScroll(attempt + 1), 200 * (attempt + 1));
          }
        }
      };

      setTimeout(() => attemptScroll(), 100);
    }, [scrollToChoreId, flatData, chores, collapsed]);

    const renderUncategorizedHeader = () => {
    const count = chores.filter(c => !c.deletedAt && (!c.sectionId || !sortedSections.some(s => s.id === c.sectionId))).length;
    const isExpanded = !collapsed['uncategorized'];
    return (
      <View style={{ marginHorizontal: 16, marginTop: 10, backgroundColor: 'white', borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottomLeftRadius: isExpanded && count > 0 ? 0 : 12, borderBottomRightRadius: isExpanded && count > 0 ? 0 : 12, borderWidth: 1, borderBottomWidth: isExpanded && count > 0 ? 0 : 1, borderColor: '#E2E8F0', ...GOLDEN_SHADOW }}>
        <TouchableOpacity
          onPress={() => { setCollapsed(p => ({ ...p, uncategorized: !p.uncategorized })); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10 }}
        >
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#CBD5E1' }} />
          <Text style={{ fontSize: 11, fontWeight: '900', color: '#1E293B', textTransform: 'uppercase', letterSpacing: 1, flex: 1 }}>Uncategorized</Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginRight: 4 }}>{count}</Text>
          <ChevronDown size={13} color="#CBD5E1" style={{ transform: [{ rotate: isExpanded ? '0deg' : '-90deg' }], marginLeft: 2 }} />
        </TouchableOpacity>
      </View>
    );
    };

    const renderItem = useCallback(({ item: row, drag, isActive }: any) => {
    const rowKey = row.type === 'chore' ? row.chore.id : `header-${row.section.id}`;
    const rowIdx = flatDataRef.current.findIndex(r =>
      (r.type === 'chore' ? r.chore.id : `header-${r.section.id}`) === rowKey
    );

    if (row.type === 'section-header') {
      const { section } = row;
      const si = sortedSections.findIndex((s: Section) => s.id === section.id);
      const isExpanded = !collapsed[section.id];
      const hasChildren = row.itemCount > 0;
      const showBottomRadius = !hasChildren || !isExpanded;

      const canUp = si > 0;
      const canDown = si < sortedSections.length - 1;
      return (
        <View style={{ marginHorizontal: 16, marginTop: 10, backgroundColor: 'white', borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottomLeftRadius: showBottomRadius ? 12 : 0, borderBottomRightRadius: showBottomRadius ? 12 : 0, borderWidth: 1, borderBottomWidth: showBottomRadius ? 1 : 0, borderColor: '#E2E8F0', ...GOLDEN_SHADOW, zIndex: isActive ? 999 : 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => { setCollapsed(p => ({ ...p, [section.id]: !p[section.id] })); }}
              onLongPress={() => { setEditingSection(section); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
              delayLongPress={400}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 14, paddingVertical: 10 }}
            >
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: section.themeColor }} />
              <Text style={{ fontSize: 11, fontWeight: '900', color: '#1E293B', textTransform: 'uppercase', letterSpacing: 1, flex: 1 }}>{section.title}</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>{row.itemCount}</Text>
              <ChevronDown size={13} color="#CBD5E1" style={{ transform: [{ rotate: isExpanded ? '0deg' : '-90deg' }] }} />
            </TouchableOpacity>
            {/* Up / Down order buttons */}
            <View style={{ flexDirection: 'row', paddingRight: 6 }}>
              <TouchableOpacity
                onPress={() => { onReorderSections(si, si - 1); Haptics.selectionAsync(); }}
                disabled={!canUp}
                style={{ padding: 6, opacity: canUp ? 1 : 0.2 }}
              >
                <ChevronUp size={14} color="#94A3B8" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { onReorderSections(si, si + 1); Haptics.selectionAsync(); }}
                disabled={!canDown}
                style={{ padding: 6, opacity: canDown ? 1 : 0.2 }}
              >
                <ChevronDown size={14} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    const nextRow = flatDataRef.current[rowIdx + 1];
    const prevRow = flatDataRef.current[rowIdx - 1];
    const isLast = !nextRow || nextRow.type === 'section-header';
    const isFirstInList = rowIdx === 0; // First chore in Uncategorized
    const isFirstInSection = !prevRow || prevRow.type === 'section-header';
    const connectsToHeader = prevRow?.type === 'section-header' || isFirstInList;

    return (
      <ShadowDecorator>
        <View style={{ marginHorizontal: 16, marginTop: connectsToHeader ? 0 : (isFirstInSection ? 10 : 0), borderTopLeftRadius: connectsToHeader ? 0 : (isFirstInSection ? 12 : 0), borderTopRightRadius: connectsToHeader ? 0 : (isFirstInSection ? 12 : 0), borderBottomLeftRadius: isLast ? 12 : 0, borderBottomRightRadius: isLast ? 12 : 0, borderWidth: 1, borderTopWidth: connectsToHeader ? 1 : (isFirstInSection ? 1 : 0), borderBottomWidth: isLast ? 1 : 0, borderColor: '#E2E8F0', backgroundColor: 'white', ...(isFirstInSection && !connectsToHeader ? GOLDEN_SHADOW : {}), zIndex: isActive ? 999 : 1 }}>
          <RestockStyleChoreItem
            chore={row.chore}
            isExpanded={expandedChoreId === row.chore.id}
            onToggleExpand={() => setExpandedChoreId(prev => prev === row.chore.id ? null : row.chore.id)}
            onComplete={onCompleteChore}
            onRevert={onRevertChore}
            onDelete={onDeleteChore}
            onDefer={onDeferChore}
            onEdit={onEditChore}
            sectionColor={row.sectionColor}
            currentUser={currentUser}
            isLast={isLast}
            isFirst={connectsToHeader || isFirstInSection}
            connectsToHeader={connectsToHeader}
            isDragging={isActive}
            onDragStart={drag}
            onNudge={onNudgeChore}
            onUploadPhoto={onUploadPhoto}
            onAssignToMe={onAssignToMe}
            onAssignTo={onAssignTo}
            hideColorBar={row.sectionId === null}
            isHighlighted={highlightedId === row.chore.id}
            familyMembers={familyMembers}
            onPointsNotify={onPointsNotify}
            bulkSelectMode={bulkSelectMode}
            isSelected={selectedChoreIds?.has(row.chore.id)}
            onEnterBulkSelect={onEnterBulkSelect}
            onSelectToggle={onBulkSelectToggle}
            choreCounts={choreCounts}
            onReassignSwipe={onReassignSwipe}
            isFutureChore={selectedDate > getTodayStr()}
            onRandomGame={onRandomGame}
          />
        </View>
      </ShadowDecorator>
    );
    }, [sortedSections, collapsed, expandedChoreId, highlightedId, onCompleteChore, onRevertChore, onDeleteChore, onDeferChore, onEditChore, currentUser, onNudgeChore, onUploadPhoto, onAssignToMe, onAssignTo, familyMembers, onPointsNotify, bulkSelectMode, selectedChoreIds, onEnterBulkSelect, onBulkSelectToggle, choreCounts, onReassignSwipe, onRandomGame, selectedDate]);
    return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <DraggableFlatList
        ref={internalListRef}
        data={flatData}
        keyExtractor={row => row.type === 'chore' ? row.chore.id : `header-${row.section.id}`}
        onDragEnd={(params) => { isDraggingRef.current = false; handleDragEnd(params); }}
        onDragBegin={() => { isDraggingRef.current = true; }}
        activationDistance={20}
        autoscrollThreshold={80}
        autoscrollSpeed={300}
        dragItemOverflow={false}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        containerStyle={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 180 }}
        ListHeaderComponent={<View>{listHeader}{renderUncategorizedHeader()}</View> as any}
        ListFooterComponent={listFooter as any}
        onScrollBeginDrag={onScrollBeginDrag}
        scrollEventThrottle={16}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing ?? false}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      />

      {/* Section Edit Modal */}
      {editingSection && (() => {
        const si = sortedSections.findIndex(s => s.id === editingSection.id);
        return (
          <SectionEditPanel
            section={editingSection}
            onClose={() => setEditingSection(null)}
            onSave={(id, title, color) => { onEditSection(id, title, color); setEditingSection(prev => prev ? { ...prev, themeColor: color, title } : prev); }}
            onDelete={onDeleteSection}
            canMoveUp={si > 0}
            canMoveDown={si < sortedSections.length - 1}
            onMoveUp={() => { onReorderSections(si, si - 1); setEditingSection(sortedSections[si - 1] ?? editingSection); }}
            onMoveDown={() => { onReorderSections(si, si + 1); setEditingSection(sortedSections[si + 1] ?? editingSection); }}
          />
        );
      })()}
    </View>
  );
};
const TodayChoreListMemo = React.memo(TodayChoreList);

// --- CHORE SUGGESTION ENGINE ---
type ChoreSuggestion = {
  title: string;
  assigneeName: string | null;
  avatar: string;
  pool: 'Me' | 'Kids' | 'Parents';
  points: number;
  estMinutes: number;
  photoRequired: boolean;
  photoMode?: 'after' | 'both';
  isRecurring: boolean;
  recurrenceRule?: string;
  notes?: string;
  dueTime?: string;
  addedCount: number;  // distinct manual-add events (unique series + one-off instances)
  lastUsed: string;
  mostUsedSectionTitle: string | null; // title of section most often used with this chore
};

const buildSuggestions = (chores: Chore[], sections: Section[]): ChoreSuggestion[] => {
  // Group all chores by normalized title
  const groups: Record<string, Chore[]> = {};
  chores.forEach(c => {
    const key = c.title.trim().toLowerCase();
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  });

  return Object.values(groups)
    .map(group => {
      // HAR-110: use most-recent record for all mutable params — ranking is by addedCount, params from latest
      const sorted = [...group].sort((a, b) => (b.dueDate > a.dueDate ? 1 : -1));
      const latest = sorted[0];

      // Count distinct manual-add events: each unique recurringGroupId = 1 series add;
      // non-recurring records each count as 1. This excludes auto-generated recurrence completions.
      const recurringGroupIds = new Set(group.filter(c => c.recurringGroupId).map(c => c.recurringGroupId as string));
      const nonRecurringCount = group.filter(c => !c.recurringGroupId).length;
      const addedCount = recurringGroupIds.size + nonRecurringCount;

      // Most-used section title (by title string so it matches across dates)
      const sectionTitleCounts: Record<string, number> = {};
      group.forEach(c => {
        if (c.sectionId) {
          const sec = sections.find(s => s.id === c.sectionId);
          if (sec) sectionTitleCounts[sec.title] = (sectionTitleCounts[sec.title] ?? 0) + 1;
        }
      });
      const mostUsedSectionTitle = Object.keys(sectionTitleCounts).sort((a, b) => sectionTitleCounts[b] - sectionTitleCounts[a])[0] ?? null;

      return {
        title: latest.title,
        assigneeName: latest.assignee ?? null,
        avatar: latest.avatar ?? '👤',
        pool: latest.pool ?? 'Me',
        points: latest.points,
        estMinutes: latest.estMinutes,
        photoRequired: latest.photoRequired,
        photoMode: latest.photoMode,
        isRecurring: latest.isRecurring ?? false,
        recurrenceRule: latest.recurrenceRule,
        notes: latest.notes,
        dueTime: latest.dueTime,
        addedCount,
        lastUsed: latest.dueDate,
        mostUsedSectionTitle,
      } as ChoreSuggestion;
    })
    .sort((a, b) => {
      // Primary: add frequency, secondary: recency
      if (b.addedCount !== a.addedCount) return b.addedCount - a.addedCount;
      return b.lastUsed > a.lastUsed ? 1 : -1;
    })
    .slice(0, 10);
};

// --- Rule encoding helpers (must match dateUtils.ts short codes) ---
const DAY_ABBREV: Record<string, string> = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };
const MONTH_ABBREV: Record<string, string> = { January: 'Jan', February: 'Feb', March: 'Mar', April: 'Apr', May: 'May', June: 'Jun', July: 'Jul', August: 'Aug', September: 'Sep', October: 'Oct', November: 'Nov', December: 'Dec' };

// --- HAR-52: ALL DONE CELEBRATION ---
// --- QUICK ADD CHORE PANEL (#21) ---
const QuickAddChorePanel = ({
  onClose, onAdd, onAddAnother, sections, selectedDate, history, onAddSection,
}: {
  onClose: () => void;
  onAdd: (chore: Omit<Chore, 'id'>) => void;
  onAddAnother: (chore: Omit<Chore, 'id'>) => void;
  sections: Section[];
  selectedDate: string;
  history: Chore[];
  onAddSection: (section: Section) => void;
}) => {
  const insets = useSafeAreaInsets();

  // 0. Date
  const [dueDate, setDueDate] = useState(selectedDate);
  const [calViewDate, setCalViewDate] = useState(() => parseLocalDate(selectedDate));
  const [calViewMode, setCalViewMode] = useState<'Day' | 'Month' | 'Year'>('Day');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // 1. Basic Info
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [assignee, setAssignee] = useState<typeof FAMILY_MEMBERS[0] | null>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [assigneeError, setAssigneeError] = useState(false);
  const [recurringError, setRecurringError] = useState(false);
  const [endCountError, setEndCountError] = useState(false);
  const [endUntilError, setEndUntilError] = useState(false);

  // Due time (HH:MM)
  const [dueTime, setDueTime] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [dueTimeEnabled, setDueTimeEnabled] = useState(false);
  const [dueTimeHour, setDueTimeHour] = useState(17); // default 5pm
  const [dueTimeMinute, setDueTimeMinute] = useState(0);
  const [dueTimeHourText, setDueTimeHourText] = useState('5');
  const [dueTimeMinuteText, setDueTimeMinuteText] = useState('00');

  // 2. Time & Points
  const [estMinutes, setEstMinutes] = useState(30);
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [customH, setCustomH] = useState(0);
  const [customM, setCustomM] = useState(30);
  const [customHText, setCustomHText] = useState('0');
  const [customMText, setCustomMText] = useState('30');

  const [pointsMode, setPointsMode] = useState<'time' | 'custom'>('time');
  const [multiplier, setMultiplier] = useState(1);
  const [customPoints, setCustomPoints] = useState('50');

  // 3. Advanced Options
  const [photoRequired, setPhotoRequired] = useState(false);
  const [photoMode, setPhotoMode] = useState<'after' | 'both'>('after');

  // Recurring State
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPreset, setRecurringPreset] = useState('Every Week');
  const [customFreq, setCustomFreq] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly'>('Weekly');
  const [customInterval, setCustomInterval] = useState(1);
  const [customDaysOfWeek, setCustomDaysOfWeek] = useState<string[]>(() => {
    const d = parseLocalDate(selectedDate);
    return [DAYS_OF_WEEK[d.getDay() === 0 ? 6 : d.getDay() - 1]]; // Mon=0 in DAYS_OF_WEEK
  });
  const [customMonthlyMode, setCustomMonthlyMode] = useState<'each' | 'on_the'>('each');
  const [customMonthlyDays, setCustomMonthlyDays] = useState<number[]>(() => {
    const d = parseLocalDate(selectedDate);
    return [d.getDate()];
  });
  const [customMonthlyOrdinal, setCustomMonthlyOrdinal] = useState('First');
  const [customMonthlyOrdinalDay, setCustomMonthlyOrdinalDay] = useState('Sun');
  const [customYearlyOrdinal, setCustomYearlyOrdinal] = useState('First');
  const [customYearlyOrdinalDay, setCustomYearlyOrdinalDay] = useState('Sun');
  const [customYearlyMonths, setCustomYearlyMonths] = useState<string[]>(() => {
    const d = parseLocalDate(selectedDate);
    return [MONTHS[d.getMonth()]];
  });
  const [customYearlyUsesOrdinal, setCustomYearlyUsesOrdinal] = useState(false);
  const [yearlyOrdinalPicked, setYearlyOrdinalPicked] = useState(true);
  const [yearlyDayPicked, setYearlyDayPicked] = useState(true);
  const [monthlyOrdinalPicked, setMonthlyOrdinalPicked] = useState(true);
  const [monthlyDayPicked, setMonthlyDayPicked] = useState(true);
  // End condition
  const [endMode, setEndMode] = useState<'indefinite' | 'count' | 'until'>('indefinite');
  const [endCount, setEndCount] = useState('10');
  const [endUntilDate, setEndUntilDate] = useState<Date | null>(null);
  const [showEndCalendar, setShowEndCalendar] = useState(false);

  // Recurring section config (optional, for recurring chores only)
  const [recurringSection, setRecurringSection] = useState<{ title: string; color: string } | null>(null);
  const [showRecurringSectionPanel, setShowRecurringSectionPanel] = useState(false);
  const [recurringSectionTitle, setRecurringSectionTitle] = useState('');
  const [recurringSectionColor, setRecurringSectionColor] = useState(SECTION_COLORS[0]);

  // Linked restock items
  const RESTOCK_UNITS = ['item', 'bag', 'lb', 'oz', 'kg', 'g', 'mL', 'L', 'can', 'jar', 'box', 'bunch', 'loaf', 'dozen', 'gal', 'qt', 'pt'];
  const [linkedRestockItems, setLinkedRestockItems] = useState<LinkedRestockItem[]>([]);
  const [showRestockSection, setShowRestockSection] = useState(false);
  const [newRestockName, setNewRestockName] = useState('');
  const [newRestockQty, setNewRestockQty] = useState('');
  const [newRestockUnit, setNewRestockUnit] = useState('');
  const [newRestockStore, setNewRestockStore] = useState('');
  const [newRestockBrand, setNewRestockBrand] = useState('');
  const [newRestockEveryN, setNewRestockEveryN] = useState('1');
  const [newRestockTags, setNewRestockTags] = useState<string[]>([]);
  const [newRestockTagInput, setNewRestockTagInput] = useState('');
  const [editingRestockId, setEditingRestockId] = useState<string | null>(null);
  const [restockDupeError, setRestockDupeError] = useState(false);

  // UI State
  const [showWhoDropdown, setShowWhoDropdown] = useState(false);
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [showNewSectionInput, setShowNewSectionInput] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showRecurringDropdown, setShowRecurringDropdown] = useState(false);
  const translateY = useSharedValue(800);
  const shakeX = useSharedValue(0);
  const shakeAssignee = useSharedValue(0);
  const scrollRef = useRef<ScrollView>(null);
  const titleInputRef = useRef<any>(null);

  useEffect(() => {
    translateY.value = withSpring(0, { ...SPRING_CONFIG, damping: 30 });
    // HAR-109: auto-focus title on open
    const t = setTimeout(() => titleInputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const titleStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));
  const assigneeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeAssignee.value }] }));
  const daySections = sections.filter(s => s.date === dueDate);

  // HAR-114: when date changes, close the section dropdown and clear section if it no longer belongs to new date
  useEffect(() => {
    setShowSectionDropdown(false);
    setShowNewSectionInput(false);
    if (sectionId && !sections.filter(s => s.date === dueDate).some(s => s.id === sectionId)) {
      setSectionId(null);
    }
  }, [dueDate]);

  // When rule-defining inputs change while endMode=until, update endUntilDate to new firstNext if it's before it
  useEffect(() => {
    if (endMode !== 'until') return;
    try {
      let cr = recurringPreset === 'Custom'
        ? (() => {
            let r = `FREQ=${customFreq};INTERVAL=${customInterval}`;
            if (customFreq === 'Weekly' && customDaysOfWeek.length > 0) r += `;BYDAY=${customDaysOfWeek.map(d => DAY_ABBREV[d] ?? d).join(',')}`;
            if (customFreq === 'Monthly') {
              if (customMonthlyMode === 'each' && customMonthlyDays.length > 0) r += `;BYMONTHDAY=${customMonthlyDays.join(',')}`;
              else if (customMonthlyMode === 'on_the') r += `;BYSETPOS=${ORDINALS[customMonthlyOrdinal] ?? 1};BYDAY=${DAY_ABBREV[customMonthlyOrdinalDay] ?? customMonthlyOrdinalDay}`;
            }
            if (customFreq === 'Yearly' && customYearlyMonths.length > 0) {
              r += `;BYMONTH=${customYearlyMonths.map(m => MONTH_ABBREV[m] ?? m).join(',')}`;
              if (customYearlyUsesOrdinal) r += `;BYSETPOS=${ORDINALS[customYearlyOrdinal] ?? 1};BYDAY=${DAY_ABBREV[customYearlyOrdinalDay] ?? customYearlyOrdinalDay}`;
            }
            return r;
          })()
        : recurringPreset;
      const firstNext = computeNextDate(dueDate, cr, 1);
      if (firstNext) {
        const minDate = parseLocalDate(firstNext);
        // Always snap to new minDate when rule changes (covers month/day selection changes)
        if (!endUntilDate || endUntilDate < minDate) setEndUntilDate(minDate);
      }
    } catch { /* rule not yet complete */ }
  }, [dueDate, recurringPreset, customFreq, customInterval, customDaysOfWeek, customMonthlyMode, customMonthlyDays, customMonthlyOrdinal, customMonthlyOrdinalDay, customYearlyOrdinal, customYearlyOrdinalDay, customYearlyMonths, customYearlyUsesOrdinal, endMode]);

  // Clamp endCount when minCount increases (e.g. more months/days selected)
  useEffect(() => {
    if (endMode !== 'count') return;
    const minCount = (() => {
      if (customFreq === 'Weekly' && customDaysOfWeek.length > 1) return customDaysOfWeek.length;
      if (customFreq === 'Monthly' && customMonthlyMode === 'each' && customMonthlyDays.length > 1) return customMonthlyDays.length;
      if (customFreq === 'Yearly' && customYearlyMonths.length > 1) return customYearlyMonths.length;
      return 1;
    })();
    const cur = parseInt(endCount) || 0;
    if (cur < minCount) setEndCount(String(minCount));
  }, [customFreq, customDaysOfWeek, customMonthlyMode, customMonthlyDays, customYearlyMonths, endMode]);

  const calculatedPoints = pointsMode === 'time'
    ? (isCustomTime ? (customH * 60 + customM) : estMinutes) * multiplier
    : Math.max(1, parseInt(customPoints) || 0);

  // Suggestion engine
  const allSuggestions = useMemo(() => buildSuggestions(history, sections), [history, sections]);
  const filteredSuggestions = useMemo(() => {
    const q = title.trim().toLowerCase();
    if (!q) return allSuggestions;
    return allSuggestions.filter(s => s.title.toLowerCase().includes(q));
  }, [allSuggestions, title]);

  const [suggestionApplied, setSuggestionApplied] = useState(false);

  const applySuggestion = (s: ChoreSuggestion) => {
    setTitle(s.title);
    setError(false);
    const member = s.assigneeName ? FAMILY_MEMBERS.find(m => m.name === s.assigneeName) ?? null : null;
    setAssignee(member);
    setEstMinutes(s.estMinutes);
    setIsCustomTime(false);
    setPointsMode('custom');
    setCustomPoints(String(s.points));
    setPhotoRequired(s.photoRequired);
    setPhotoMode(s.photoMode ?? 'after');
    setIsRecurring(s.isRecurring);
    if (s.recurrenceRule) {
      const PRESETS = ['Every Day', 'Every Week', 'Every 2 Weeks', 'Every Month', 'Every Year'];
      const isPreset = PRESETS.includes(s.recurrenceRule);
      setRecurringPreset(isPreset ? s.recurrenceRule : 'Custom');
      if (!isPreset) {
        // Parse and restore custom recurrence state
        const params = Object.fromEntries(
          s.recurrenceRule.split(';').map(p => { const [k, v] = p.split('='); return [k, v]; })
        );
        const freq = params['FREQ'] as 'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | undefined;
        if (freq) setCustomFreq(freq);
        const interval = parseInt(params['INTERVAL'] ?? '1');
        setCustomInterval(isNaN(interval) ? 1 : interval);
        if (freq === 'Weekly' && params['BYDAY']) {
          const ABBREV_TO_FULL: Record<string, string> = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };
          setCustomDaysOfWeek(params['BYDAY'].split(',').map(a => ABBREV_TO_FULL[a] ?? a).filter(Boolean));
        }
        if (freq === 'Monthly') {
          if (params['BYMONTHDAY']) {
            setCustomMonthlyMode('each');
            setCustomMonthlyDays(params['BYMONTHDAY'].split(',').map(Number).filter(n => !isNaN(n)));
          } else if (params['BYSETPOS'] && params['BYDAY']) {
            setCustomMonthlyMode('on_the');
            const ORDINAL_NUM_TO_NAME: Record<string, string> = { '1': 'First', '2': 'Second', '3': 'Third', '4': 'Fourth', '-1': 'Last' };
            const ABBREV_TO_FULL: Record<string, string> = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };
            setCustomMonthlyOrdinal(ORDINAL_NUM_TO_NAME[params['BYSETPOS']] ?? 'First');
            setCustomMonthlyOrdinalDay(ABBREV_TO_FULL[params['BYDAY']] ?? 'Sunday');
            setMonthlyOrdinalPicked(true);
            setMonthlyDayPicked(true);
          }
        }
        if (freq === 'Yearly' && params['BYMONTH']) {
          const ABBREV_TO_FULL_MONTH: Record<string, string> = { Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June', Jul: 'July', Aug: 'August', Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December' };
          setCustomYearlyMonths(params['BYMONTH'].split(',').map(a => ABBREV_TO_FULL_MONTH[a] ?? a).filter(Boolean));
          if (params['BYSETPOS'] && params['BYDAY']) {
            const ORDINAL_NUM_TO_NAME: Record<string, string> = { '1': 'First', '2': 'Second', '3': 'Third', '4': 'Fourth', '-1': 'Last' };
            const ABBREV_TO_FULL: Record<string, string> = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };
            setCustomYearlyUsesOrdinal(true);
            setCustomYearlyOrdinal(ORDINAL_NUM_TO_NAME[params['BYSETPOS']] ?? 'First');
            setCustomYearlyOrdinalDay(ABBREV_TO_FULL[params['BYDAY']] ?? 'Sunday');
            setYearlyOrdinalPicked(true);
            setYearlyDayPicked(true);
          } else {
            setCustomYearlyUsesOrdinal(false);
          }
        }
        // Restore end condition
        if (params['COUNT']) {
          setEndMode('count');
          setEndCount(params['COUNT']);
        } else if (params['UNTIL']) {
          const u = params['UNTIL'];
          if (u && u.length === 8) {
            const y = parseInt(u.slice(0, 4)); const mo = parseInt(u.slice(4, 6)) - 1; const d = parseInt(u.slice(6, 8));
            setEndMode('until');
            setEndUntilDate(new Date(y, mo, d));
          }
        } else {
          setEndMode('indefinite');
        }
      }
    }
    // Restore notes
    setNotes(s.notes ?? '');
    // Restore due time
    if (s.dueTime) {
      const [hStr, mStr] = s.dueTime.split(':');
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      if (!isNaN(h) && !isNaN(m)) {
        setDueTimeEnabled(true);
        setDueTimeHour(h);
        setDueTimeMinute(m);
        setDueTimeHourText(String(h === 0 ? 12 : h > 12 ? h - 12 : h));
        setDueTimeMinuteText(String(m).padStart(2, '0'));
      }
    } else {
      setDueTimeEnabled(false);
    }
    // HAR-110: restore section from history — match by title in the current day's sections
    if (s.mostUsedSectionTitle) {
      const matchingSection = daySections.find(sec => sec.title === s.mostUsedSectionTitle);
      setSectionId(matchingSection?.id ?? null);
    } else {
      setSectionId(null);
    }
    setSuggestionApplied(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
  };

  const clearForm = () => {
    setTitle('');
    setNotes('');
    setRecurringSection(null);
    setShowRecurringSectionPanel(false);
    setRecurringSectionTitle('');
    setRecurringSectionColor(SECTION_COLORS[0]);
    setDueTimeEnabled(false);
    setDueTimeHour(17);
    setDueTimeMinute(0);
    setDueTimeHourText('5');
    setDueTimeMinuteText('00');
    setAssignee(null);
    setSectionId(null);
    setDueDate(selectedDate);
    setEstMinutes(30);
    setIsCustomTime(false);
    setCustomH(0);
    setCustomM(30);
    setShowTimeDropdown(false);
    setPointsMode('time');
    setMultiplier(1);
    setCustomPoints('50');
    setPhotoRequired(false);
    setPhotoMode('after');
    setIsRecurring(false);
    setRecurringPreset('Every Week');
    setCustomFreq('Weekly');
    setCustomInterval(1);
    const _d = parseLocalDate(selectedDate);
    setCustomDaysOfWeek([DAYS_OF_WEEK[_d.getDay() === 0 ? 6 : _d.getDay() - 1]]);
    setCustomMonthlyMode('each');
    setCustomMonthlyDays([_d.getDate()]);
    setEndMode('indefinite');
    setEndCount('10');
    setEndUntilDate(null);
    setShowEndCalendar(false);
    setLinkedRestockItems([]);
    setShowRestockSection(false);
    setNewRestockName('');
    setNewRestockQty('');
    setNewRestockUnit('');
    setNewRestockStore('');
    setNewRestockBrand('');
    setNewRestockEveryN('1');
    setNewRestockTags([]);
    setNewRestockTagInput('');
    setEditingRestockId(null);
    setSuggestionApplied(false);
    setError(false);
    setAssigneeError(false);
    setRecurringError(false);
    setEndCountError(false);
    setEndUntilError(false);
    setCustomYearlyMonths([MONTHS[_d.getMonth()]]);
    setCustomYearlyOrdinal('First');
    setCustomYearlyOrdinalDay('Sun');
    setCustomYearlyUsesOrdinal(false);
    setYearlyOrdinalPicked(true);
    setYearlyDayPicked(true);
    setMonthlyOrdinalPicked(true);
    setMonthlyDayPicked(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // HAR-113: warn before closing if any field is filled
  const hasUnsavedContent = !!(title.trim() || notes.trim() || assignee || sectionId || isRecurring || photoRequired || dueTimeEnabled);

  const safeClose = () => {
    if (hasUnsavedContent) {
      Alert.alert(
        'Discard chore?',
        'You have unsaved changes. Are you sure you want to close?',
        [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onClose },
        ]
      );
    } else {
      onClose();
    }
  };

  // Drag-to-close gesture (Reanimated v3 / RNGH v2 API)
  const dragGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationY > 120 || event.velocityY > 800) {
        translateY.value = withSpring(0, { ...SPRING_CONFIG, damping: 28 });
        runOnJS(safeClose)();
      } else {
        translateY.value = withSpring(0, { ...SPRING_CONFIG, damping: 28 });
      }
    });

  const handlePerformAdd = (stayOpen: boolean) => {
    if (!title.trim()) {
      setError(true);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      shakeX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // Validate all recurring fields simultaneously
    if (isRecurring) {
      const countErr = endMode === 'count' && (parseInt(endCount) || 0) < 1;
      const untilErr = endMode === 'until' && !endUntilDate;
      const missingDay = recurringPreset === 'Custom' && customFreq === 'Weekly' && customDaysOfWeek.length === 0;
      const missingMonthDay = recurringPreset === 'Custom' && customFreq === 'Monthly' && customMonthlyMode === 'each' && customMonthlyDays.length === 0;
      const missingMonthOrdinal = recurringPreset === 'Custom' && customFreq === 'Monthly' && customMonthlyMode === 'on_the' && !monthlyOrdinalPicked;
      const missingMonthDay2 = recurringPreset === 'Custom' && customFreq === 'Monthly' && customMonthlyMode === 'on_the' && !monthlyDayPicked;
      const missingYearMonth = recurringPreset === 'Custom' && customFreq === 'Yearly' && customYearlyMonths.length === 0;
      const missingYearOrdinal = recurringPreset === 'Custom' && customFreq === 'Yearly' && customYearlyUsesOrdinal && !yearlyOrdinalPicked;
      const missingYearDay = recurringPreset === 'Custom' && customFreq === 'Yearly' && customYearlyUsesOrdinal && !yearlyDayPicked;
      const hasError = countErr || untilErr || missingDay || missingMonthDay || missingMonthOrdinal || missingMonthDay2 || missingYearMonth || missingYearOrdinal || missingYearDay;
      if (hasError) {
        setEndCountError(countErr);
        setEndUntilError(untilErr);
        setRecurringError(missingDay || missingMonthDay || missingMonthOrdinal || missingMonthDay2 || missingYearMonth || missingYearOrdinal || missingYearDay);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
        return;
      }
    }
    setRecurringError(false);
    setEndCountError(false);
    setEndUntilError(false);

    // Build recurrenceRule
    let recurrenceRule: string | undefined;
    if (isRecurring) {
      const endSuffix = (() => {
        if (endMode === 'count') { const n = Math.max(1, parseInt(endCount) || 1); return `;COUNT=${n}`; }
        if (endMode === 'until' && endUntilDate) {
          const y = endUntilDate.getFullYear();
          const m = String(endUntilDate.getMonth() + 1).padStart(2, '0');
          const d = String(endUntilDate.getDate()).padStart(2, '0');
          return `;UNTIL=${y}${m}${d}`;
        }
        return '';
      })();
      if (recurringPreset === 'Custom') {
        let rule = `FREQ=${customFreq};INTERVAL=${customInterval}`;
        if (customFreq === 'Weekly' && customDaysOfWeek.length > 0) rule += `;BYDAY=${customDaysOfWeek.map(d => DAY_ABBREV[d] ?? d).join(',')}`;
        if (customFreq === 'Monthly') {
          if (customMonthlyMode === 'each' && customMonthlyDays.length > 0) rule += `;BYMONTHDAY=${customMonthlyDays.join(',')}`;
          else if (customMonthlyMode === 'on_the') rule += `;BYSETPOS=${ORDINALS[customMonthlyOrdinal] ?? 1};BYDAY=${DAY_ABBREV[customMonthlyOrdinalDay] ?? customMonthlyOrdinalDay}`;
        }
        if (customFreq === 'Yearly' && customYearlyMonths.length > 0) {
          rule += `;BYMONTH=${customYearlyMonths.map(m => MONTH_ABBREV[m] ?? m).join(',')}`;
          if (customYearlyUsesOrdinal) rule += `;BYSETPOS=${ORDINALS[customYearlyOrdinal] ?? 1};BYDAY=${DAY_ABBREV[customYearlyOrdinalDay] ?? customYearlyOrdinalDay}`;
        }
        recurrenceRule = rule + endSuffix;
      } else {
        recurrenceRule = recurringPreset + endSuffix;
      }
    }

    const chorePayload: Omit<Chore, 'id'> = {
      title: title.trim(),
      assignee: assignee?.name ?? null,
      avatar: assignee?.avatar ?? '👤',
      pool: assignee?.pool ?? 'Me',
      points: calculatedPoints,
      estMinutes: isCustomTime ? (customH * 60 + customM) : estMinutes,
      dueDate: dueDate,
      due: dueDate,
      isOverdue: false,
      status: 'pending',
      photoRequired,
      photoMode: photoRequired ? photoMode : undefined,
      photoProvided: { before: false, after: false },
      isNudged: false,
      priorityIndex: 999,
      sectionId,
      isRecurring,
      recurrenceRule,
      recurringGroupId: isRecurring ? `rg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` : undefined,
      seriesStartDate: isRecurring ? dueDate : undefined,
      nextRecurringDate: isRecurring && recurrenceRule ? computeNextDate(dueDate, recurrenceRule, 1) : undefined,
      notes: notes.trim() || undefined,
      dueTime: dueTimeEnabled ? `${String(dueTimeHour).padStart(2, '0')}:${String(dueTimeMinute).padStart(2, '0')}` : undefined,
      recurringSection: isRecurring && recurringSection ? recurringSection : undefined,
      linkedRestockItems: linkedRestockItems.length > 0 ? linkedRestockItems : undefined,
    } as any;

    if (stayOpen) {
      // HAR-111: remount a fresh panel via parent callback
      onAddAnother(chorePayload);
    } else {
      onAdd(chorePayload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const toggleArrayItem = (setter: any, item: any) => {
    setter((prev: any[]) => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
    Haptics.selectionAsync();
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={safeClose}>
      <View style={{ flex: 1 }}>
      <Pressable onPress={safeClose} style={{ ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15,23,42,0.6)' }} />
      <Animated.View style={[panelStyle, { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '92%' }]}>
        {/* Drag handle */}
        <GestureDetector gesture={dragGesture}>
          <Animated.View style={{ alignItems: 'center', paddingTop: 14, paddingBottom: 6 }}>
            <View style={{ width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 2.5 }} />
          </Animated.View>
        </GestureDetector>

        {/* FROZEN HEADER */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#0F172A' }}>New Chore</Text>
            <TouchableOpacity onPress={safeClose} style={{ backgroundColor: '#F1F5F9', padding: 8, borderRadius: 99 }}>
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
          {/* Date picker — single pill */}
          {(() => {
            const todayStr = getTodayStr();
            const tomorrowStr = getLocalFormattedDate(new Date(parseLocalDate(todayStr).getTime() + 86400000));
            const label = dueDate === todayStr ? 'Today' : dueDate === tomorrowStr ? 'Tomorrow' : parseLocalDate(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            return (
              <View>
              <View style={{ height: 1, backgroundColor: '#F1F5F9', marginBottom: 14 }} />
              <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Date</Text>
              <TouchableOpacity
                onPress={() => { setCalViewDate(parseLocalDate(dueDate)); setCalViewMode('Day'); setShowDatePicker(true); Haptics.selectionAsync(); }}
                style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 14 }}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>{label}</Text>
                <ChevronDown size={15} color="#94A3B8" />
              </TouchableOpacity>
              </View>
            );
          })()}

          {/* Date calendar modal */}
          <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowDatePicker(false)}>
              <Pressable onPress={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, width: 320, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12 }}>
                {(() => {
                  const todayStr = getTodayStr();
                  const today = parseLocalDate(todayStr);
                  const limitDate = new Date(today.getFullYear() + 10, today.getMonth(), today.getDate());
                  const canGoBack = calViewMode === 'Day'
                    ? (calViewDate.getFullYear() > today.getFullYear() || (calViewDate.getFullYear() === today.getFullYear() && calViewDate.getMonth() > today.getMonth()))
                    : calViewMode === 'Month' ? calViewDate.getFullYear() > today.getFullYear() : false;
                  const canGoForward = calViewMode === 'Day'
                    ? new Date(calViewDate.getFullYear(), calViewDate.getMonth() + 1, 1) <= limitDate
                    : calViewMode === 'Month' ? calViewDate.getFullYear() + 1 <= limitDate.getFullYear() : false;
                  const headerLabel = calViewMode === 'Day'
                    ? calViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    : calViewMode === 'Month' ? String(calViewDate.getFullYear())
                    : `${today.getFullYear()} – ${today.getFullYear() + 11}`;
                  return (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <TouchableOpacity disabled={!canGoBack} onPress={() => { const n = new Date(calViewDate); if (calViewMode === 'Day') n.setMonth(n.getMonth() - 1); else if (calViewMode === 'Month') n.setFullYear(n.getFullYear() - 1); setCalViewDate(n); }} style={{ opacity: canGoBack ? 1 : 0.2, padding: 4 }}>
                          <ChevronLeft size={18} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setCalViewMode(calViewMode === 'Day' ? 'Month' : calViewMode === 'Month' ? 'Year' : 'Day')}>
                          <Text style={{ fontSize: 15, fontWeight: '900', color: '#0F172A' }}>{headerLabel}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity disabled={!canGoForward} onPress={() => { const n = new Date(calViewDate); if (calViewMode === 'Day') n.setMonth(n.getMonth() + 1); else if (calViewMode === 'Month') n.setFullYear(n.getFullYear() + 1); setCalViewDate(n); }} style={{ opacity: canGoForward ? 1 : 0.2, padding: 4 }}>
                          <ChevronRight size={18} color={COLORS.primary} />
                        </TouchableOpacity>
                      </View>

                      {calViewMode === 'Day' && (() => {
                        const year = calViewDate.getFullYear(), month = calViewDate.getMonth();
                        const blanks = Array(getFirstDayOfMonth(year, month)).fill(null);
                        const days = Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1);
                        return (
                          <View>
                            <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                              {WEEKDAYS.map((w, i) => <View key={i} style={{ width: '14.285%', alignItems: 'center' }}><Text style={{ fontSize: 10, fontWeight: '800', color: '#94A3B8' }}>{w}</Text></View>)}
                            </View>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                              {blanks.map((_, i) => <View key={`b${i}`} style={{ width: '14.285%', aspectRatio: 1 }} />)}
                              {days.map(d => {
                                const dStr = getLocalFormattedDate(new Date(year, month, d));
                                const isSelected = dueDate === dStr;
                                const isToday = dStr === todayStr;
                                const disabled = dStr < todayStr || new Date(year, month, d) > limitDate;
                                return (
                                  <Pressable key={d} disabled={disabled} onPress={() => { setDueDate(dStr); setShowDatePicker(false); Haptics.selectionAsync(); }} style={{ width: '14.285%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.25 : 1 }}>
                                    <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? COLORS.primary : isToday ? '#EEF2FF' : 'transparent', borderWidth: isToday && !isSelected ? 1.5 : 0, borderColor: COLORS.primary }}>
                                      <Text style={{ fontSize: 13, fontWeight: '800', color: isSelected ? '#fff' : isToday ? COLORS.primary : '#334155' }}>{d}</Text>
                                    </View>
                                  </Pressable>
                                );
                              })}
                            </View>
                          </View>
                        );
                      })()}

                      {calViewMode === 'Month' && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                          {Array.from({ length: 12 }, (_, i) => {
                            const d = new Date(calViewDate.getFullYear(), i, 1);
                            const isPast = d < new Date(today.getFullYear(), today.getMonth(), 1);
                            const isOver = d > limitDate;
                            return (
                              <Pressable key={i} disabled={isPast || isOver} onPress={() => { setCalViewDate(new Date(calViewDate.getFullYear(), i, 1)); setCalViewMode('Day'); Haptics.selectionAsync(); }} style={{ width: '33.33%', padding: 4, opacity: (isPast || isOver) ? 0.25 : 1 }}>
                                <View style={{ paddingVertical: 12, alignItems: 'center', borderRadius: 12, backgroundColor: calViewDate.getMonth() === i ? COLORS.primary : '#F8FAFC' }}>
                                  <Text style={{ fontSize: 13, fontWeight: '800', color: calViewDate.getMonth() === i ? '#fff' : '#334155' }}>{d.toLocaleDateString('en-US', { month: 'short' })}</Text>
                                </View>
                              </Pressable>
                            );
                          })}
                        </View>
                      )}

                      {calViewMode === 'Year' && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                          {Array.from({ length: 12 }, (_, i) => {
                            const year = today.getFullYear() + i;
                            const isOver = year > limitDate.getFullYear();
                            return (
                              <Pressable key={i} disabled={isOver} onPress={() => { setCalViewDate(new Date(year, calViewDate.getMonth(), 1)); setCalViewMode('Month'); Haptics.selectionAsync(); }} style={{ width: '33.33%', padding: 4, opacity: isOver ? 0.25 : 1 }}>
                                <View style={{ paddingVertical: 12, alignItems: 'center', borderRadius: 12, backgroundColor: calViewDate.getFullYear() === year ? COLORS.primary : '#F8FAFC' }}>
                                  <Text style={{ fontSize: 13, fontWeight: '800', color: calViewDate.getFullYear() === year ? '#fff' : '#334155' }}>{year}</Text>
                                </View>
                              </Pressable>
                            );
                          })}
                        </View>
                      )}
                    </>
                  );
                })()}
              </Pressable>
            </Pressable>
          </Modal>
        </View>

        {/* SCROLLABLE CONTENT */}
        {/* HAR-115: behavior="padding" avoids height collapse on app resume from background */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={0}>
        <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 120 }} style={{ flex: 1 }}>

          {/* Suggestions strip */}
          {filteredSuggestions.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                  {title.trim() ? 'Matching' : 'Quick Add'}
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#F1F5F9' }} />
                {suggestionApplied ? (
                  <TouchableOpacity
                    onPress={clearForm}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEE2E2', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}
                    activeOpacity={0.7}
                  >
                    <X size={10} color={COLORS.red} />
                    <Text style={{ fontSize: 10, fontWeight: '800', color: COLORS.red }}>Clear</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#CBD5E1' }}>tap to fill</Text>
                )}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -24 }} contentContainerStyle={{ paddingHorizontal: 24, gap: 10 }}>
                {filteredSuggestions.map((s, i) => (
                  <TouchableOpacity
                    key={`${s.title}-${i}`}
                    onPress={() => applySuggestion(s)}
                    activeOpacity={0.75}
                    style={{
                      backgroundColor: '#F8FAFC', borderRadius: 20, padding: 14,
                      borderWidth: 1.5, borderColor: '#F1F5F9',
                      width: 156, gap: 8,
                    }}
                  >
                    {/* Top row: avatar + assignee */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 18 }}>{s.avatar}</Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }} numberOfLines={1}>{s.assigneeName ?? 'Unassigned'}</Text>
                    </View>

                    {/* Title */}
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', lineHeight: 18 }} numberOfLines={2}>{s.title}</Text>

                    {/* Meta chips + added count */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 }}>
                        <Clock size={9} color="#94A3B8" />
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#64748B' }}>{s.estMinutes}m</Text>
                      </View>
                      <View style={{ backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#64748B' }}>{s.points}pts</Text>
                      </View>
                      {s.isRecurring && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 }}>
                          <Repeat2 size={9} color={COLORS.primary} />
                          <Text style={{ fontSize: 9, fontWeight: '800', color: COLORS.primary }}>Recurring</Text>
                        </View>
                      )}
                      {s.photoRequired && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FFF7ED', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 }}>
                          <Camera size={9} color={COLORS.orange} />
                        </View>
                      )}
                      <View style={{ backgroundColor: s.addedCount >= 5 ? '#EEF2FF' : '#F1F5F9', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 9, fontWeight: '900', color: s.addedCount >= 5 ? COLORS.primary : '#94A3B8' }}>Added {s.addedCount}×</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* 1. Title */}
          <View className="mb-6">
            <Text style={{ fontSize: 10, fontWeight: '900', color: error ? COLORS.red : '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Task Description {error && '• Required'}</Text>
            <Animated.View style={titleStyle}>
              <TextInput
                ref={titleInputRef}
                value={title}
                onChangeText={(v) => { setTitle(v); if (v.trim()) setError(false); if (!v.trim()) setSuggestionApplied(false); }}
                placeholder="e.g. Clean the kitchen counter"
                placeholderTextColor="#CBD5E1"
                style={{ backgroundColor: '#F8FAFC', paddingHorizontal: 20, paddingVertical: 16, borderRadius: 20, fontSize: 17, fontWeight: '700', color: '#0F172A', borderWidth: 1.5, borderColor: error ? COLORS.red : '#F1F5F9', textAlignVertical: 'center' }}
              />
            </Animated.View>
          </View>

          {/* Notes / Instructions */}
          <View className="mb-6">
            <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Notes & Instructions <Text style={{ fontWeight: '600', color: '#CBD5E1' }}>(optional)</Text></Text>
            <TextInput
              value={notes}
              onChangeText={(v) => {
                // HAR-112: auto-number lines on Enter. Prefix the current line if it lacks a number, then add the next.
                if (v.length > notes.length && v.endsWith('\n')) {
                  const lines = v.split('\n');
                  // lines[-1] is the empty string after the newline; lines[-2] is the line just completed
                  const completedLines = lines.slice(0, -1);
                  const numbered = completedLines.map((line, idx) => {
                    if (/^\d+\.\s/.test(line)) return line; // already numbered
                    return `${idx + 1}. ${line}`;
                  });
                  const nextNum = numbered.length + 1;
                  setNotes(numbered.join('\n') + '\n' + `${nextNum}. `);
                } else {
                  setNotes(v);
                }
              }}
              placeholder={`1. e.g. Use the green sponge\n2. Check under the sink`}
              placeholderTextColor="#CBD5E1"
              multiline
              numberOfLines={3}
              style={{ backgroundColor: '#F8FAFC', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 20, fontSize: 14, fontWeight: '600', color: '#0F172A', borderWidth: 1.5, borderColor: '#F1F5F9', minHeight: 80, textAlignVertical: 'top' }}
            />
          </View>

          {/* Linked Restock Items */}
          <View style={{ marginBottom: 24 }}>
            <TouchableOpacity
              onPress={() => { setShowRestockSection(v => !v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: linkedRestockItems.length > 0 ? '#16A34A' : '#DCFCE7' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ShoppingCart size={16} color="#16A34A" />
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#15803D' }}>
                  Link Restock Items
                </Text>
                {linkedRestockItems.length > 0 && (
                  <View style={{ backgroundColor: '#16A34A', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '900', color: 'white' }}>{linkedRestockItems.length}</Text>
                  </View>
                )}
              </View>
              <ChevronDown size={14} color="#16A34A" style={{ transform: [{ rotate: showRestockSection ? '180deg' : '0deg' }] }} />
            </TouchableOpacity>

            {showRestockSection && (
              <View style={{ backgroundColor: '#F8FAFB', borderRadius: 14, padding: 14, marginTop: 8, gap: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                {/* Saved items — badge card style */}
                {linkedRestockItems.map(item => (
                  <View key={item.id} style={{ backgroundColor: 'white', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', flex: 1 }} numberOfLines={1}>{item.name}</Text>
                      <View style={{ flexDirection: 'row', gap: 4, marginLeft: 8 }}>
                        <TouchableOpacity
                          onPress={() => {
                            setEditingRestockId(item.id);
                            setNewRestockName(item.name);
                            setNewRestockQty(item.qty != null ? String(item.qty) : '');
                            setNewRestockUnit(item.unit ?? '');
                            setNewRestockStore(item.store ?? '');
                            setNewRestockBrand(item.brand ?? '');
                            setNewRestockEveryN(String(item.everyN));
                            setNewRestockTags((item as any).tags ?? []);
                            setNewRestockTagInput('');
                          }}
                          style={{ padding: 4 }}
                        >
                          <Pencil size={14} color="#64748B" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setLinkedRestockItems(prev => prev.filter(r => r.id !== item.id))} style={{ padding: 4 }}>
                          <X size={14} color="#94A3B8" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                      {item.qty != null && (
                        <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#6366F1' }}>{item.qty}{item.unit ? ' ' + item.unit : ''}</Text>
                        </View>
                      )}
                      {item.store && (
                        <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A' }}>{item.store}</Text>
                        </View>
                      )}
                      {item.brand && (
                        <View style={{ backgroundColor: '#FFF7ED', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#EA580C' }}>{item.brand}</Text>
                        </View>
                      )}
                      {((item as any).tags as string[] | undefined)?.map((tag: string) => (
                        <View key={tag} style={{ backgroundColor: '#F5F3FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#7C3AED' }}>{tag}</Text>
                        </View>
                      ))}
                      {isRecurring && (
                        <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803D' }}>Every {item.everyN}×</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}

                {/* Add / Edit item form */}
                <View style={{ gap: 8, borderTopWidth: linkedRestockItems.length > 0 ? 1 : 0, borderTopColor: '#E2E8F0', paddingTop: linkedRestockItems.length > 0 ? 10 : 0 }}>
                  {editingRestockId && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <Pencil size={12} color="#6366F1" />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#6366F1' }}>Editing item</Text>
                      <TouchableOpacity onPress={() => {
                        setEditingRestockId(null);
                        setNewRestockName(''); setNewRestockQty(''); setNewRestockUnit('');
                        setNewRestockStore(''); setNewRestockBrand(''); setNewRestockEveryN('1');
                        setNewRestockTags([]); setNewRestockTagInput('');
                      }}>
                        <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600' }}>cancel</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {/* Name row */}
                  <View style={{ height: 44, backgroundColor: 'white', borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: restockDupeError ? '#DC2626' : '#E2E8F0' }}>
                    <TextInput
                      placeholder="Item name"
                      value={newRestockName}
                      onChangeText={v => { setNewRestockName(v); setRestockDupeError(false); }}
                      style={{ flex: 1, paddingHorizontal: 12, fontWeight: '700', fontSize: 13, height: 44, textAlignVertical: 'center', includeFontPadding: false }}
                      placeholderTextColor="#CBD5E1"
                    />
                  </View>
                  {/* Qty + Unit row */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ width: 72, height: 44, backgroundColor: 'white', borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}>
                      <TextInput
                        placeholder="Qty"
                        value={newRestockQty}
                        onChangeText={t => setNewRestockQty(t.replace(/[^0-9.]/g, ''))}
                        keyboardType="decimal-pad"
                        style={{ flex: 1, paddingHorizontal: 10, fontWeight: '700', fontSize: 13, textAlign: 'center', height: 44, textAlignVertical: 'center', includeFontPadding: false }}
                        placeholderTextColor="#CBD5E1"
                      />
                    </View>
                    <View style={{ flex: 1, height: 44, backgroundColor: 'white', borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}>
                      <TextInput
                        placeholder="Unit"
                        value={newRestockUnit}
                        onChangeText={setNewRestockUnit}
                        style={{ flex: 1, paddingHorizontal: 12, fontWeight: '700', fontSize: 13, height: 44, textAlignVertical: 'center', includeFontPadding: false }}
                        placeholderTextColor="#CBD5E1"
                      />
                      {!!newRestockUnit && (
                        <TouchableOpacity onPress={() => setNewRestockUnit('')} style={{ padding: 8 }}>
                          <X size={12} color="#94A3B8" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  {/* Unit auto-suggest chips */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}>
                    {RESTOCK_UNITS.filter(u => !newRestockUnit || u.toLowerCase().includes(newRestockUnit.toLowerCase())).map(u => (
                      <TouchableOpacity key={u} onPress={() => setNewRestockUnit(u)} style={{ backgroundColor: newRestockUnit === u ? '#DCFCE7' : '#F1F5F9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: newRestockUnit === u ? '#16A34A' : '#64748B' }}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {/* Store + Brand row */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1, height: 44, backgroundColor: 'white', borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}>
                      <TextInput
                        placeholder="Store"
                        value={newRestockStore}
                        onChangeText={setNewRestockStore}
                        style={{ flex: 1, paddingHorizontal: 12, fontWeight: '700', fontSize: 13, height: 44, textAlignVertical: 'center', includeFontPadding: false }}
                        placeholderTextColor="#CBD5E1"
                      />
                    </View>
                    <View style={{ flex: 1, height: 44, backgroundColor: 'white', borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}>
                      <TextInput
                        placeholder="Brand"
                        value={newRestockBrand}
                        onChangeText={setNewRestockBrand}
                        style={{ flex: 1, paddingHorizontal: 12, fontWeight: '700', fontSize: 13, height: 44, textAlignVertical: 'center', includeFontPadding: false }}
                        placeholderTextColor="#CBD5E1"
                      />
                    </View>
                    {isRecurring && (
                      <View style={{ width: 80, height: 44, backgroundColor: 'white', borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8', paddingLeft: 6 }}>Every</Text>
                        <TextInput
                          value={newRestockEveryN}
                          onChangeText={setNewRestockEveryN}
                          keyboardType="number-pad"
                          style={{ flex: 1, paddingHorizontal: 4, fontWeight: '800', fontSize: 14, textAlign: 'center', height: 44, textAlignVertical: 'center', includeFontPadding: false }}
                          placeholderTextColor="#CBD5E1"
                        />
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8', paddingRight: 6 }}>×</Text>
                      </View>
                    )}
                  </View>
                  {/* Tags */}
                  <View style={{ backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 10 }}>
                    {newRestockTags.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                        {newRestockTags.map(tag => (
                          <TouchableOpacity key={tag} onPress={() => setNewRestockTags(prev => prev.filter(t => t !== tag))} style={{ backgroundColor: '#F5F3FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#7C3AED' }}>{tag}</Text>
                            <X size={10} color="#7C3AED" />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    <TextInput
                      placeholder="Add tags… (Enter)"
                      value={newRestockTagInput}
                      onChangeText={setNewRestockTagInput}
                      onSubmitEditing={() => {
                        const t = newRestockTagInput.trim();
                        if (t && !newRestockTags.includes(t)) {
                          setNewRestockTags(prev => [...prev, t]);
                          setNewRestockTagInput('');
                        }
                      }}
                      style={{ fontSize: 13, fontWeight: '600', color: '#1E293B', height: 28 }}
                      placeholderTextColor="#CBD5E1"
                      returnKeyType="done"
                    />
                  </View>
                  {/* Add / Save button */}
                  {restockDupeError && (
                    <View style={{ backgroundColor: '#FEE2E2', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>
                        &quot;{newRestockName.trim()}&quot; is already in the list — each item must have a unique name.
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => {
                      if (!newRestockName.trim()) return;
                      const isDupe = !editingRestockId && linkedRestockItems.some(r => r.name.trim().toLowerCase() === newRestockName.trim().toLowerCase());
                      if (isDupe) { setRestockDupeError(true); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return; }
                      const newItem = {
                        id: editingRestockId ?? `lri_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                        name: newRestockName.trim(),
                        qty: parseFloat(newRestockQty) || undefined,
                        unit: newRestockUnit.trim() || undefined,
                        store: newRestockStore.trim() || undefined,
                        brand: newRestockBrand.trim() || undefined,
                        everyN: Math.max(1, parseInt(newRestockEveryN) || 1),
                        tags: newRestockTags.length > 0 ? [...newRestockTags] : undefined,
                      } as LinkedRestockItem;
                      if (editingRestockId) {
                        setLinkedRestockItems(prev => prev.map(r => r.id === editingRestockId ? newItem : r));
                      } else {
                        setLinkedRestockItems(prev => [...prev, newItem]);
                      }
                      setEditingRestockId(null);
                      setNewRestockName(''); setNewRestockQty(''); setNewRestockUnit('');
                      setNewRestockStore(''); setNewRestockBrand(''); setNewRestockEveryN('1');
                      setNewRestockTags([]); setNewRestockTagInput(''); setRestockDupeError(false);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={{ backgroundColor: '#16A34A', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '900', color: 'white' }}>
                      {editingRestockId ? 'Save Item' : '+ Add Item'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <View className="flex-row gap-4 mb-6 z-50">
            {/* 2. Who Dropdown */}
            <Animated.View className="flex-1 z-50" style={assigneeStyle}>
              <Text style={{ fontSize: 10, fontWeight: '900', color: assigneeError ? COLORS.red : '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Assignee {assigneeError && '• Required'}</Text>
              <TouchableOpacity
                onPress={() => { setShowWhoDropdown(!showWhoDropdown); setShowSectionDropdown(false); setShowRecurringDropdown(false); }}
                style={{ height: 60, borderWidth: 1.5, borderColor: assigneeError ? COLORS.red : '#F1F5F9', backgroundColor: '#F8FAFC' }}
                className="px-4 rounded-2xl flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-3">
                  <Text style={{ fontSize: 20 }}>{assignee?.avatar ?? '👤'}</Text>
                  <Text className="font-bold text-slate-700">{assignee?.name ?? 'Select'}</Text>
                </View>
                <ChevronDown size={16} color="#94A3B8" />
              </TouchableOpacity>
              {showWhoDropdown && (
                <View style={{ position: 'absolute', top: 85, left: 0, right: 0, backgroundColor: 'white', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 10, zIndex: 1000, overflow: 'hidden' }}>
                  <ScrollView style={{ maxHeight: 200 }} bounces={false}>
                    <TouchableOpacity
                      onPress={() => { setAssignee(null); setAssigneeError(false); setShowWhoDropdown(false); shakeAssignee.value = 0; Haptics.selectionAsync(); }}
                      className={`p-4 flex-row items-center gap-3 border-b border-slate-50 ${assignee === null ? 'bg-indigo-50' : ''}`}
                    >
                      <Text style={{ fontSize: 18 }}>👤</Text>
                      <Text className={`font-bold ${assignee === null ? 'text-indigo-600' : 'text-slate-400'}`}>Unassigned</Text>
                    </TouchableOpacity>
                    {FAMILY_MEMBERS.map(m => (
                      <TouchableOpacity
                        key={m.name}
                        onPress={() => { setAssignee(m); setAssigneeError(false); setShowWhoDropdown(false); shakeAssignee.value = 0; Haptics.selectionAsync(); }}
                        className={`p-4 flex-row items-center gap-3 border-b border-slate-50 ${assignee?.name === m.name ? 'bg-indigo-50' : ''}`}
                      >
                        <Text style={{ fontSize: 18 }}>{m.avatar}</Text>
                        <Text className={`font-bold ${assignee?.name === m.name ? 'text-indigo-600' : 'text-slate-600'}`}>{m.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </Animated.View>

            {/* 3. Section — recurring gets modal picker, non-recurring picks from date sections */}
            {isRecurring ? (
              <View className="flex-1 z-40">
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Section</Text>
                <TouchableOpacity
                  onPress={() => { setShowRecurringSectionPanel(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={{ height: 60, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: recurringSection ? recurringSection.color : '#CBD5E1' }} />
                    <Text style={{ fontWeight: '700', color: recurringSection ? '#1E293B' : '#94A3B8', fontSize: 13 }} numberOfLines={1}>{recurringSection ? recurringSection.title : 'None'}</Text>
                  </View>
                  <ChevronDown size={16} color="#94A3B8" />
                </TouchableOpacity>
                <Modal visible={showRecurringSectionPanel} transparent animationType="fade" statusBarTranslucent onRequestClose={() => { /* HAR-113: back gesture does nothing — user must use X or Apply */ }}>
                  <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                  <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
                    {/* HAR-113: backdrop tap does NOT dismiss — draft is preserved until Apply or X */}
                    <View style={{ flex: 1 }} />
                    <Animated.View entering={SlideInDown.duration(300)} exiting={SlideOutDown.duration(250)} style={{ backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', position: 'absolute', alignSelf: 'center', left: '50%', marginLeft: -18 }} />
                        <View style={{ flex: 1 }} />
                        <TouchableOpacity onPress={() => setShowRecurringSectionPanel(false)} style={{ padding: 4 }}>
                          <X size={20} color="#94A3B8" />
                        </TouchableOpacity>
                      </View>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>Section for Recurring Chore</Text>
                      <TextInput
                        value={recurringSectionTitle}
                        onChangeText={setRecurringSectionTitle}
                        placeholder="Section name (e.g. Morning)"
                        placeholderTextColor="#CBD5E1"
                        style={{ backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontWeight: '700', color: '#0F172A', textAlignVertical: 'center' }}
                      />
                      <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5 }}>Color</Text>
                      <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center' }}>
                        {SECTION_COLORS.map(color => {
                          const isSelected = recurringSectionColor === color;
                          return (
                            <TouchableOpacity
                              key={color}
                              onPress={() => { setRecurringSectionColor(color); Haptics.selectionAsync(); }}
                              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: color, borderWidth: isSelected ? 3 : 0, borderColor: 'white', shadowColor: color, shadowOpacity: isSelected ? 0.6 : 0.3, shadowRadius: isSelected ? 10 : 4, shadowOffset: { width: 0, height: 2 }, elevation: isSelected ? 8 : 2 }}
                            />
                          );
                        })}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity
                          onPress={() => { setRecurringSection(null); setRecurringSectionTitle(''); setShowRecurringSectionPanel(false); Haptics.selectionAsync(); }}
                          style={{ flex: 1, backgroundColor: '#F1F5F9', borderRadius: 16, padding: 15, alignItems: 'center' }}
                        >
                          <Text style={{ fontSize: 15, fontWeight: '800', color: '#64748B' }}>Clear</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            const t = recurringSectionTitle.trim();
                            if (t) { setRecurringSection({ title: t, color: recurringSectionColor }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }
                            setShowRecurringSectionPanel(false);
                          }}
                          style={{ flex: 2, backgroundColor: COLORS.primary, borderRadius: 16, padding: 15, alignItems: 'center' }}
                        >
                          <Text style={{ fontSize: 15, fontWeight: '800', color: 'white' }}>Apply</Text>
                        </TouchableOpacity>
                      </View>
                    </Animated.View>
                  </View>
                  </KeyboardAvoidingView>
                </Modal>
              </View>
            ) : (
            <View className="flex-1 z-40">
              <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Section</Text>
              <TouchableOpacity
                onPress={() => { setShowSectionDropdown(!showSectionDropdown); setShowWhoDropdown(false); setShowRecurringDropdown(false); }}
                style={{ height: 60 }}
                className="bg-slate-50 border border-slate-100 px-4 rounded-2xl flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-2">
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sectionId ? sections.find(s => s.id === sectionId)?.themeColor : '#CBD5E1' }} />
                  <Text className="font-bold text-slate-700" numberOfLines={1}>{sectionId ? sections.find(s => s.id === sectionId)?.title : 'None'}</Text>
                </View>
                <ChevronDown size={16} color="#94A3B8" />
              </TouchableOpacity>
              {showSectionDropdown && (
                <View style={{ position: 'absolute', top: 85, left: 0, right: 0, backgroundColor: 'white', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 10, zIndex: 1000, overflow: 'hidden' }}>
                  <ScrollView style={{ maxHeight: 240 }} bounces={false}>
                    <TouchableOpacity
                      onPress={() => { setSectionId(null); setShowSectionDropdown(false); setShowNewSectionInput(false); Haptics.selectionAsync(); }}
                      className={`p-4 flex-row items-center gap-3 border-b border-slate-50 ${sectionId === null ? 'bg-indigo-50' : ''}`}
                    >
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#CBD5E1' }} />
                      <Text className={`font-bold ${sectionId === null ? 'text-indigo-600' : 'text-slate-600'}`}>None</Text>
                    </TouchableOpacity>
                    {daySections.map(s => (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() => { setSectionId(s.id); setShowSectionDropdown(false); setShowNewSectionInput(false); Haptics.selectionAsync(); }}
                        className={`p-4 flex-row items-center gap-3 border-b border-slate-50 ${sectionId === s.id ? 'bg-indigo-50' : ''}`}
                      >
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.themeColor }} />
                        <Text className={`font-bold ${sectionId === s.id ? 'text-indigo-600' : 'text-slate-600'}`}>{s.title}</Text>
                      </TouchableOpacity>
                    ))}
                    {/* New Section row */}
                    {!showNewSectionInput ? (
                      <TouchableOpacity
                        onPress={() => { setShowNewSectionInput(true); setNewSectionTitle(''); Haptics.selectionAsync(); }}
                        className="p-4 flex-row items-center gap-3"
                      >
                        <Plus size={14} color="#6366F1" strokeWidth={2.5} />
                        <Text style={{ fontWeight: '700', color: '#6366F1' }}>New Section</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
                        <TextInput
                          autoFocus
                          value={newSectionTitle}
                          onChangeText={setNewSectionTitle}
                          placeholder="Section name"
                          placeholderTextColor="#94A3B8"
                          style={{ flex: 1, height: 36, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 10, fontSize: 14, fontWeight: '700', color: '#1E293B' }}
                          returnKeyType="done"
                          onSubmitEditing={() => {
                            const t = newSectionTitle.trim();
                            if (!t) return;
                            const color = SECTION_COLORS[(daySections.length) % SECTION_COLORS.length];
                            const newId = `sec_${Date.now()}`;
                            const newSection: Section = { id: newId, title: t, themeColor: color, isCollapsed: false, date: dueDate, priorityIndex: daySections.length };
                            onAddSection(newSection);
                            setSectionId(newId);
                            setShowSectionDropdown(false);
                            setShowNewSectionInput(false);
                            setNewSectionTitle('');
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          }}
                        />
                        <TouchableOpacity
                          onPress={() => {
                            const t = newSectionTitle.trim();
                            if (!t) return;
                            const color = SECTION_COLORS[(daySections.length) % SECTION_COLORS.length];
                            const newId = `sec_${Date.now()}`;
                            const newSection: Section = { id: newId, title: t, themeColor: color, isCollapsed: false, date: dueDate, priorityIndex: daySections.length };
                            onAddSection(newSection);
                            setSectionId(newId);
                            setShowSectionDropdown(false);
                            setShowNewSectionInput(false);
                            setNewSectionTitle('');
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          }}
                          style={{ backgroundColor: '#6366F1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}
                        >
                          <Text style={{ color: 'white', fontWeight: '900', fontSize: 12 }}>Add</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>
            )}
          </View>

          {/* 4. Time Selection */}
          <View className="mb-6">
            <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>Estimated Time</Text>
            <View className="flex-row flex-wrap gap-2">
              {QUICK_TIMES.map(t => (
                <TouchableOpacity
                  key={t.label}
                  onPress={() => {
                    setEstMinutes(t.value);
                    setIsCustomTime(false);
                    setShowTimeDropdown(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  className={`flex-1 min-w-[70px] py-3 rounded-2xl items-center border-2 ${(!isCustomTime && estMinutes === t.value) ? '' : 'border-slate-100 bg-slate-50'}`}
                  style={(!isCustomTime && estMinutes === t.value) ? { backgroundColor: t.color, borderColor: t.color } : {}}
                >
                  <Text style={{ fontSize: 13, fontWeight: '900', color: (!isCustomTime && estMinutes === t.value) ? 'white' : '#64748B' }}>{t.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => {
                  if (!isCustomTime) {
                    setIsCustomTime(true);
                    setShowTimeDropdown(true);
                  } else {
                    setShowTimeDropdown(!showTimeDropdown);
                  }
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                className={`flex-1 min-w-[70px] py-3 rounded-2xl items-center border-2 ${isCustomTime ? 'bg-slate-900 border-slate-900' : 'border-slate-100 bg-slate-50'}`}
              >
                {isCustomTime ? (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '900', color: 'white' }}>
                      {customH > 0 ? `${customH}h ${String(customM).padStart(2, '0')}m` : `${customM}m`}
                    </Text>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>custom</Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 13, fontWeight: '900', color: '#64748B' }}>Custom</Text>
                )}
              </TouchableOpacity>
            </View>

            {isCustomTime && showTimeDropdown && (
              <View className="mt-4 bg-slate-50 p-6 rounded-3xl border border-slate-100 flex-row items-center justify-center gap-8">
                <View className="items-center">
                  <Text className="text-[9px] font-black text-slate-400 uppercase mb-2">Hours</Text>
                  <View className="flex-row items-center gap-3">
                    <TouchableOpacity
                      onPress={() => { const v = Math.max(customM > 0 ? 0 : 0, customH - 1); const newH = customH <= 0 ? 0 : v; if (newH === 0 && customM === 0) return; setCustomH(newH); setCustomHText(String(newH)); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      className="w-8 h-8 bg-white border border-slate-200 rounded-full items-center justify-center shadow-sm"
                    >
                      <ChevronDown size={14} color="#64748B" />
                    </TouchableOpacity>
                    <TextInput
                      keyboardType="numeric"
                      value={customHText}
                      onChangeText={v => { const stripped = v.replace(/[^0-9]/g, '').replace(/^0+/, ''); setCustomHText(stripped); const n = parseInt(stripped, 10); if (!isNaN(n) && n >= 0 && n <= 23) setCustomH(n); }}
                      onBlur={() => {
                        const n = parseInt(customHText, 10);
                        const safe = isNaN(n) ? 0 : Math.max(0, Math.min(23, n));
                        // If hours cleared to 0 and mins also 0, floor mins to 5
                        if (safe === 0 && customM === 0) { setCustomM(5); setCustomMText('05'); }
                        setCustomH(safe); setCustomHText(String(safe));
                      }}
                      className="text-3xl font-black text-slate-900 w-10 text-center"
                    />
                    <TouchableOpacity
                      onPress={() => { const v = Math.min(23, customH + 1); setCustomH(v); setCustomHText(String(v)); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      className="w-8 h-8 bg-white border border-slate-200 rounded-full items-center justify-center shadow-sm"
                    >
                      <ChevronUp size={14} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text className="text-2xl font-black text-slate-300 mt-4">:</Text>

                <View className="items-center">
                  <Text className="text-[9px] font-black text-slate-400 uppercase mb-2">Mins</Text>
                  <View className="flex-row items-center gap-3">
                    <TouchableOpacity
                      onPress={() => { const v = Math.max(0, customM - 5); if (customH === 0 && v === 0) return; setCustomM(v); setCustomMText(String(v).padStart(2, '0')); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      className="w-8 h-8 bg-white border border-slate-200 rounded-full items-center justify-center shadow-sm"
                    >
                      <ChevronDown size={14} color="#64748B" />
                    </TouchableOpacity>
                    <TextInput
                      keyboardType="numeric"
                      value={customMText}
                      onChangeText={v => {
                        const stripped = v.replace(/[^0-9]/g, '').replace(/^0+/, '');
                        setCustomMText(stripped);
                        const n = parseInt(stripped, 10);
                        if (!isNaN(n) && n >= 0 && n <= 59) {
                          setCustomM(customH === 0 && n === 0 ? 5 : n);
                        }
                      }}
                      onBlur={() => {
                        const n = parseInt(customMText, 10);
                        const safe = isNaN(n) ? 0 : Math.max(0, Math.min(59, n));
                        // Floor to 5 if total duration would be 0
                        const floored = (customH === 0 && safe === 0) ? 5 : safe;
                        setCustomM(floored); setCustomMText(String(floored).padStart(2, '0'));
                      }}
                      className="text-3xl font-black text-slate-900 w-12 text-center"
                    />
                    <TouchableOpacity
                      onPress={() => { const v = Math.min(55, customM + 5); setCustomM(v); setCustomMText(String(v).padStart(2, '0')); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      className="w-8 h-8 bg-white border border-slate-200 rounded-full items-center justify-center shadow-sm"
                    >
                      <ChevronUp size={14} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* 5. Points Logic */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5 }}>Points Rewards</Text>
              <View className="flex-row bg-slate-100 rounded-full p-1">
                <Pressable
                  onPress={() => requestAnimationFrame(() => setPointsMode('time'))}
                  className={`px-4 py-1.5 rounded-full ${pointsMode === 'time' ? 'bg-white' : ''}`}
                >
                  <Text className={`text-[10px] font-black ${pointsMode === 'time' ? 'text-indigo-600' : 'text-slate-400'}`}>TIME BASED</Text>
                </Pressable>
                <Pressable
                  onPress={() => requestAnimationFrame(() => setPointsMode('custom'))}
                  className={`px-4 py-1.5 rounded-full ${pointsMode === 'custom' ? 'bg-white' : ''}`}
                >
                  <Text className={`text-[10px] font-black ${pointsMode === 'custom' ? 'text-indigo-600' : 'text-slate-400'}`}>CUSTOM</Text>
                </Pressable>
              </View>
            </View>

            <View className="bg-slate-50 border border-slate-100 rounded-3xl p-5">
              {pointsMode === 'time' ? (
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-3xl font-black text-indigo-600">{calculatedPoints}<Text className="text-sm text-indigo-400"> pts</Text></Text>
                    <Text className="text-[10px] font-bold text-slate-400 mt-1">BASED ON TIME</Text>
                  </View>
                  <View className="flex-row gap-2">
                    {[1, 2, 3, 5].map(m => (
                      <TouchableOpacity
                        key={m}
                        onPress={() => { setMultiplier(m); Haptics.selectionAsync(); }}
                        className={`w-10 h-10 rounded-full items-center justify-center border ${multiplier === m ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}
                      >
                        <Text className={`text-xs font-black ${multiplier === m ? 'text-white' : 'text-slate-500'}`}>x{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : (
                <View className="flex-row items-center justify-between">
                  <TextInput
                    keyboardType="number-pad"
                    value={customPoints}
                    onChangeText={v => {
                      const cleaned = v.replace(/[^0-9]/g, '').replace(/^0+/, '');
                      setCustomPoints(cleaned || '1');
                    }}
                    onBlur={() => {
                      const n = parseInt(customPoints, 10);
                      if (isNaN(n) || n < 1) setCustomPoints('1');
                    }}
                    className="text-3xl font-black text-slate-900 flex-1"
                    placeholder="1"
                  />
                  <Text className="text-slate-400 font-black text-lg ml-4">POINTS</Text>
                </View>
              )}
            </View>
          </View>

          {/* Due Time */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <Clock size={16} color={dueTimeEnabled ? COLORS.primary : '#94A3B8'} />
                <Text style={{ fontSize: 10, fontWeight: '900', color: dueTimeEnabled ? COLORS.primary : '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5 }}>Due Time</Text>
              </View>
              <Pressable
                onPress={() => { setDueTimeEnabled(!dueTimeEnabled); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                className={`w-12 h-6 rounded-full px-1 justify-center ${dueTimeEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
              >
                <View className={`w-4 h-4 rounded-full bg-white ${dueTimeEnabled ? 'self-end' : 'self-start'}`} />
              </Pressable>
            </View>
            {dueTimeEnabled && (
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
                {/* Hour picker (1-12) */}
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity onPress={() => {
                    const isPM = dueTimeHour >= 12; const d12 = (dueTimeHour % 12 || 12); const next12 = (d12 % 12) + 1;
                    const newH = isPM ? next12 + 12 : (next12 === 12 ? 0 : next12);
                    setDueTimeHour(newH); setDueTimeHourText(String(newH % 12 || 12));
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }} style={{ padding: 8 }}>
                    <ChevronDown size={18} color={COLORS.primary} style={{ transform: [{ rotate: '180deg' }] }} />
                  </TouchableOpacity>
                  <TextInput
                    value={dueTimeHourText}
                    onChangeText={(v) => {
                      setDueTimeHourText(v);
                      const n = parseInt(v, 10);
                      if (!isNaN(n) && n >= 1 && n <= 12) {
                        const isPM = dueTimeHour >= 12;
                        setDueTimeHour(isPM ? (n === 12 ? 12 : n + 12) : (n === 12 ? 0 : n));
                      }
                    }}
                    onBlur={() => setDueTimeHourText(String(dueTimeHour % 12 || 12))}
                    keyboardType="number-pad"
                    maxLength={2}
                    style={{ fontSize: 28, fontWeight: '900', color: '#0F172A', minWidth: 48, textAlign: 'center', padding: 0 }}
                  />
                  <TouchableOpacity onPress={() => {
                    const isPM = dueTimeHour >= 12; const d12 = (dueTimeHour % 12 || 12); const prev12 = d12 === 1 ? 12 : d12 - 1;
                    const newH = isPM ? (prev12 === 12 ? 12 : prev12 + 12) : (prev12 === 12 ? 0 : prev12);
                    setDueTimeHour(newH); setDueTimeHourText(String(newH % 12 || 12));
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }} style={{ padding: 8 }}>
                    <ChevronDown size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#0F172A' }}>:</Text>
                {/* Minute picker */}
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity onPress={() => {
                    const newM = (dueTimeMinute + 5) % 60;
                    setDueTimeMinute(newM); setDueTimeMinuteText(String(newM).padStart(2, '0'));
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }} style={{ padding: 8 }}>
                    <ChevronDown size={18} color={COLORS.primary} style={{ transform: [{ rotate: '180deg' }] }} />
                  </TouchableOpacity>
                  <TextInput
                    value={dueTimeMinuteText}
                    onChangeText={(v) => {
                      setDueTimeMinuteText(v);
                      const n = parseInt(v, 10);
                      if (!isNaN(n) && n >= 0 && n <= 59) setDueTimeMinute(n);
                    }}
                    onBlur={() => setDueTimeMinuteText(String(dueTimeMinute).padStart(2, '0'))}
                    keyboardType="number-pad"
                    maxLength={2}
                    style={{ fontSize: 28, fontWeight: '900', color: '#0F172A', minWidth: 48, textAlign: 'center', padding: 0 }}
                  />
                  <TouchableOpacity onPress={() => {
                    const newM = (dueTimeMinute - 5 + 60) % 60;
                    setDueTimeMinute(newM); setDueTimeMinuteText(String(newM).padStart(2, '0'));
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }} style={{ padding: 8 }}>
                    <ChevronDown size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
                {/* AM/PM toggle */}
                <View style={{ gap: 8 }}>
                  <TouchableOpacity onPress={() => { if (dueTimeHour >= 12) setDueTimeHour(h => h - 12); Haptics.selectionAsync(); }} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: dueTimeHour < 12 ? COLORS.primary : '#F1F5F9' }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: dueTimeHour < 12 ? 'white' : '#94A3B8' }}>AM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { if (dueTimeHour < 12) setDueTimeHour(h => h + 12); Haptics.selectionAsync(); }} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: dueTimeHour >= 12 ? COLORS.primary : '#F1F5F9' }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: dueTimeHour >= 12 ? 'white' : '#94A3B8' }}>PM</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* 6. Photo Requirements */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <Camera size={16} color={photoRequired ? COLORS.primary : '#94A3B8'} />
                <Text style={{ fontSize: 10, fontWeight: '900', color: photoRequired ? COLORS.primary : '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5 }}>Photo Required</Text>
              </View>
              <Pressable
                onPress={() => { setPhotoRequired(!photoRequired); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                className={`w-12 h-6 rounded-full px-1 justify-center ${photoRequired ? 'bg-indigo-600' : 'bg-slate-200'}`}
              >
                <View className={`w-4 h-4 rounded-full bg-white ${photoRequired ? 'self-end' : 'self-start'}`} />
              </Pressable>
            </View>
            {photoRequired && (
              <View className="flex-row gap-3">
                <TouchableOpacity onPress={() => setPhotoMode('after')} className={`flex-1 p-4 rounded-2xl border-2 items-center ${photoMode === 'after' ? 'bg-indigo-50 border-indigo-600' : 'bg-white border-slate-100'}`}>
                  <Camera size={20} color={photoMode === 'after' ? COLORS.primary : '#94A3B8'} />
                  <Text className={`text-[10px] font-black mt-2 ${photoMode === 'after' ? 'text-indigo-600' : 'text-slate-400'}`}>ONLY AFTER</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPhotoMode('both')} className={`flex-1 p-4 rounded-2xl border-2 items-center ${photoMode === 'both' ? 'bg-indigo-50 border-indigo-600' : 'bg-white border-slate-100'}`}>
                  <View className="flex-row gap-1">
                    <Camera size={16} color={photoMode === 'both' ? COLORS.primary : '#94A3B8'} />
                    <Camera size={16} color={photoMode === 'both' ? COLORS.primary : '#94A3B8'} />
                  </View>
                  <Text className={`text-[10px] font-black mt-2 ${photoMode === 'both' ? 'text-indigo-600' : 'text-slate-400'}`}>BEFORE & AFTER</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* 7. Comprehensive Recurring Options */}
          <View className="mb-10">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-2">
                <RotateCcw size={16} color={isRecurring ? COLORS.primary : '#94A3B8'} />
                <Text style={{ fontSize: 10, fontWeight: '900', color: isRecurring ? COLORS.primary : '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5 }}>Recurring Task</Text>
              </View>
              <Pressable
                onPress={() => {
                  if (!isRecurring) setSectionId(null);
                  setIsRecurring(!isRecurring);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                className={`w-12 h-6 rounded-full px-1 justify-center ${isRecurring ? 'bg-indigo-600' : 'bg-slate-200'}`}
              >
                <View className={`w-4 h-4 rounded-full bg-white ${isRecurring ? 'self-end' : 'self-start'}`} />
              </Pressable>
            </View>

            {isRecurring && (
              <View>
                {/* Preset Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                  <View className="flex-row gap-2">
                    {[...RECURRING_PRESETS, 'Custom'].map(preset => (
                      <Pressable
                        key={preset}
                        onPress={() => requestAnimationFrame(() => { setRecurringPreset(preset); setEndUntilDate(null); setShowEndCalendar(false); Haptics.selectionAsync(); })}
                        className={`px-5 py-2.5 rounded-full border ${recurringPreset === preset ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-50 border-slate-100'}`}
                      >
                        <Text className={`text-xs font-bold ${recurringPreset === preset ? 'text-white' : 'text-slate-500'}`}>{preset}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>

                {/* End condition — only for presets */}
                {recurringPreset !== 'Custom' && (
                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>Ends</Text>
                    <View style={{ flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 12, padding: 3, marginBottom: 12 }}>
                      {(['indefinite', 'count', 'until'] as const).map(m => (
                        <Pressable key={m} onPress={() => {
                          setEndMode(m); setShowEndCalendar(false); setEndCountError(false); setEndUntilError(false); Haptics.selectionAsync();
                          if (m === 'until' && !endUntilDate) {
                            const firstNext = computeNextDate(dueDate, recurringPreset, 1);
                            if (firstNext) setEndUntilDate(parseLocalDate(firstNext));
                          }
                        }}
                          style={{ flex: 1, paddingVertical: 7, borderRadius: 10, alignItems: 'center', backgroundColor: endMode === m ? 'white' : 'transparent' }}>
                          <Text style={{ fontSize: 10, fontWeight: '900', color: endMode === m ? COLORS.primary : '#64748B' }}>
                            {m === 'indefinite' ? 'FOREVER' : m === 'count' ? 'COUNT' : 'DATE'}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    {endMode === 'indefinite' && (() => {
                      const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      const firstDate = parseLocalDate(dueDate);
                      const oneYearOut = getLocalFormattedDate(new Date(firstDate.getFullYear() + 1, firstDate.getMonth(), firstDate.getDate()));
                      const perYear = (() => { try { return countOccurrencesBetween(dueDate, recurringPreset, oneYearOut); } catch { return null; } })();
                      return perYear != null ? (
                        <View style={{ backgroundColor: 'white', borderRadius: 10, padding: 10, gap: 4 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700' }}>First occurrence</Text>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.green }}>{fmt(firstDate)}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700' }}>Approx. per year</Text>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.primary }}>~{perYear}</Text>
                          </View>
                        </View>
                      ) : null;
                    })()}
                    {endMode === 'count' && (() => {
                      const n = parseInt(endCount) || 0;
                      // first occurrence = dueDate itself for presets
                      const firstDate = parseLocalDate(dueDate);
                      const lastDate = (() => {
                        if (n < 1) return null;
                        let cur = dueDate;
                        for (let i = 1; i < n; i++) {
                          const next = computeNextDate(cur, recurringPreset, 1);
                          if (!next) return parseLocalDate(cur);
                          cur = next;
                        }
                        return parseLocalDate(cur);
                      })();
                      const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      return (
                        <View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Pressable onPress={() => { setEndCount(c => String(Math.max(1, parseInt(c) - 1))); setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50); }}
                              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
                              <ChevronDown size={14} color="#64748B" />
                            </Pressable>
                            <TextInput value={endCount} onChangeText={v => { const n = v.replace(/[^0-9]/g, ''); setEndCount(n); setEndCountError(false); setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50); }} keyboardType="number-pad"
                              style={{ flex: 1, textAlign: 'center', fontSize: 22, fontWeight: '900', color: n < 1 ? COLORS.red : '#0F172A', backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: n < 1 ? COLORS.red : '#E2E8F0', paddingVertical: 8 }} />
                            <Pressable onPress={() => { setEndCount(c => String(parseInt(c) + 1)); setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50); }}
                              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
                              <ChevronUp size={14} color="#64748B" />
                            </Pressable>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>times</Text>
                          </View>
                          {n < 1 && <Text style={{ fontSize: 11, color: COLORS.red, fontWeight: '700', marginTop: 6, textAlign: 'center' }}>Minimum 1 occurrence required</Text>}
                          {n >= 1 && (
                            <View style={{ marginTop: 10, backgroundColor: 'white', borderRadius: 10, padding: 10, gap: 4 }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700' }}>First occurrence</Text>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.green }}>{fmt(firstDate)}</Text>
                              </View>
                              {lastDate && (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                  <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700' }}>Last occurrence</Text>
                                  <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.primary }}>{fmt(lastDate)}</Text>
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })()}
                    {endMode === 'until' && (() => {
                      const firstNext = computeNextDate(dueDate, recurringPreset, 1);
                      const minDate = firstNext ? parseLocalDate(firstNext) : new Date(parseLocalDate(dueDate).getTime() + 86400000);
                      const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      const totalCount = endUntilDate ? (() => { try { return countOccurrencesBetween(dueDate, recurringPreset, getLocalFormattedDate(endUntilDate)) + 1; } catch { return null; } })() : null;
                      return (
                        <View>
                          {endUntilError && !endUntilDate && (
                            <Text style={{ fontSize: 9, fontWeight: '900', color: COLORS.red, textTransform: 'uppercase', marginBottom: 6 }}>End date required • Required</Text>
                          )}
                          <Pressable onPress={() => setShowEndCalendar(v => !v)}
                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', borderRadius: 12, borderWidth: 1.5, borderColor: endUntilError && !endUntilDate ? COLORS.red : endUntilDate ? COLORS.primary : '#E2E8F0', padding: 12 }}>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: endUntilDate ? '#0F172A' : endUntilError ? COLORS.red : '#94A3B8' }}>
                              {endUntilDate ? endUntilDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Pick end date'}
                            </Text>
                            <ChevronDown size={16} color="#64748B" />
                          </Pressable>
                          {showEndCalendar && (
                            <InlineCalendar minDate={minDate} selected={endUntilDate} onSelect={d => { setEndUntilDate(d); setEndUntilError(false); setShowEndCalendar(false); }} />
                          )}
                          {totalCount != null && (
                            <View style={{ marginTop: 10, backgroundColor: 'white', borderRadius: 10, padding: 10, gap: 4 }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700' }}>First occurrence</Text>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.green }}>{fmt(parseLocalDate(dueDate))}</Text>
                              </View>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700' }}>Last occurrence</Text>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.primary }}>{fmt(endUntilDate!)}</Text>
                              </View>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700' }}>Total</Text>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#0F172A' }}>{totalCount} time{totalCount !== 1 ? 's' : ''}</Text>
                              </View>
                            </View>
                          )}
                        </View>
                      );
                    })()}
                  </View>
                )}

                {/* Custom iCalendar-style Builder */}
                {recurringPreset === 'Custom' && (
                  <View className="bg-slate-50 border border-slate-100 p-5 rounded-3xl gap-6">

                    {/* Frequency Selector */}
                    <View className="flex-row bg-slate-200 rounded-2xl p-1">
                      {RECURRING_FREQUENCIES.map(freq => (
                        <Pressable
                          key={freq}
                          onPress={() => requestAnimationFrame(() => { setCustomFreq(freq as 'Daily' | 'Weekly' | 'Monthly' | 'Yearly'); setDueDate(getTodayStr()); setEndUntilDate(null); setShowEndCalendar(false); Haptics.selectionAsync(); })}
                          className={`flex-1 py-2 rounded-xl items-center ${customFreq === freq ? 'bg-white' : ''}`}
                        >
                          <Text className={`text-[10px] font-black ${customFreq === freq ? 'text-indigo-600' : 'text-slate-500'}`}>{freq.toUpperCase()}</Text>
                        </Pressable>
                      ))}
                    </View>

                    {/* Interval Input */}
                    <View className="flex-row items-center justify-between">
                      <Text className="text-slate-600 font-bold">Every</Text>
                      <View className="flex-row items-center gap-3">
                        <Pressable onPress={() => setCustomInterval(Math.max(1, customInterval - 1))} className="w-8 h-8 bg-white rounded-full items-center justify-center border border-slate-200"><ChevronDown size={14} color="#64748B" /></Pressable>
                        <Text className="text-lg font-black text-slate-900 w-8 text-center">{customInterval}</Text>
                        <Pressable onPress={() => { setCustomInterval(customInterval + 1); setDueDate(getTodayStr()); setEndUntilDate(null); setShowEndCalendar(false); }} className="w-8 h-8 bg-white rounded-full items-center justify-center border border-slate-200"><ChevronUp size={14} color="#64748B" /></Pressable>
                        <Text className="text-slate-500 font-bold ml-1">
                          {customFreq === 'Daily'
                            ? (customInterval > 1 ? 'days' : 'day')
                            : customFreq.replace('ly', customInterval > 1 ? 's' : '')}
                        </Text>
                      </View>
                    </View>

                    {/* Weekly Specifics */}
                    {customFreq === 'Weekly' && (
                      <View className="border-t border-slate-200 pt-4">
                        <Text style={{ fontSize: 9, fontWeight: '900', textTransform: 'uppercase', marginBottom: 12, color: recurringError && customDaysOfWeek.length === 0 ? COLORS.red : '#94A3B8' }}>
                          On these days{recurringError && customDaysOfWeek.length === 0 ? ' • Required' : ''}
                        </Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderWidth: recurringError && customDaysOfWeek.length === 0 ? 1.5 : 0, borderColor: COLORS.red, borderRadius: 12, padding: recurringError && customDaysOfWeek.length === 0 ? 8 : 0 }}>
                          {DAYS_OF_WEEK.map(day => {
                            const isActive = customDaysOfWeek.includes(day);
                            return (
                              <Pressable
                                key={day}
                                onPress={() => { toggleArrayItem(setCustomDaysOfWeek, day); setRecurringError(false); }}
                                className={`w-9 h-9 rounded-full items-center justify-center border ${isActive ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}
                              >
                                <Text className={`text-[10px] font-black ${isActive ? 'text-white' : 'text-slate-500'}`}>{day.slice(0, 1)}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {/* Monthly Specifics */}
                    {customFreq === 'Monthly' && (
                      <View className="border-t border-slate-200 pt-4">
                        <View className="flex-row bg-slate-200 rounded-full p-1 mb-4">
                          <Pressable onPress={() => requestAnimationFrame(() => setCustomMonthlyMode('each'))} className={`flex-1 py-2 rounded-full items-center ${customMonthlyMode === 'each' ? 'bg-white' : ''}`}>
                            <Text className={`text-[10px] font-black ${customMonthlyMode === 'each' ? 'text-slate-900' : 'text-slate-500'}`}>EACH</Text>
                          </Pressable>
                          <Pressable onPress={() => requestAnimationFrame(() => setCustomMonthlyMode('on_the'))} className={`flex-1 py-2 rounded-full items-center ${customMonthlyMode === 'on_the' ? 'bg-white' : ''}`}>
                            <Text className={`text-[10px] font-black ${customMonthlyMode === 'on_the' ? 'text-slate-900' : 'text-slate-500'}`}>ON THE</Text>
                          </Pressable>
                        </View>

                        {customMonthlyMode === 'each' ? (
                          <View style={{ borderWidth: recurringError && customMonthlyDays.length === 0 ? 1.5 : 0, borderColor: COLORS.red, borderRadius: 12, padding: recurringError && customMonthlyDays.length === 0 ? 6 : 0 }}>
                            {recurringError && customMonthlyDays.length === 0 && (
                              <Text style={{ fontSize: 9, fontWeight: '900', color: COLORS.red, textTransform: 'uppercase', marginBottom: 6 }}>Select at least one day • Required</Text>
                            )}
                          <View className="flex-row flex-wrap mt-2">
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                              const isActive = customMonthlyDays.includes(day);
                              return (
                                <View key={day} style={{ width: '14.28%', aspectRatio: 1, padding: 4 }}>
                                  <Pressable
                                    onPress={() => { toggleArrayItem(setCustomMonthlyDays, day); setRecurringError(false); }}
                                    className={`w-full h-full rounded-full items-center justify-center border ${isActive ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-100'}`}
                                    style={isActive ? GOLDEN_SHADOW : {}}
                                  >
                                    <Text style={{ fontSize: 11, fontWeight: '900', color: isActive ? 'white' : '#475569' }}>{day}</Text>
                                  </Pressable>
                                </View>
                              );
                            })}
                          </View>
                          </View>
                        ) : (
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <View style={{ width: '50%', gap: 4 }}>
                              {recurringError && !monthlyOrdinalPicked && (
                                <Text style={{ fontSize: 9, fontWeight: '900', color: COLORS.red, textTransform: 'uppercase', textAlign: 'center' }}>Order • Required</Text>
                              )}
                              <Text style={{ fontSize: 8, fontWeight: '900', color: recurringError && !monthlyOrdinalPicked ? COLORS.red : '#94A3B8', textTransform: 'uppercase', textAlign: 'center' }}>Order</Text>
                              <ScrollView style={{ maxHeight: 120, borderWidth: recurringError && !monthlyOrdinalPicked ? 1.5 : 0, borderColor: COLORS.red, borderRadius: 10 }} nestedScrollEnabled>
                                {WEEK_ORDINALS.map(ord => (
                                  <Pressable key={ord} onPress={() => requestAnimationFrame(() => { setCustomMonthlyOrdinal(ord); setMonthlyOrdinalPicked(true); setRecurringError(false); Haptics.selectionAsync(); })} style={{ padding: 8, borderRadius: 8, marginBottom: 4, alignItems: 'center', backgroundColor: customMonthlyOrdinal === ord && monthlyOrdinalPicked ? '#E0E7FF' : 'white' }}>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: customMonthlyOrdinal === ord && monthlyOrdinalPicked ? '#4F46E5' : '#64748B' }}>{ord}</Text>
                                  </Pressable>
                                ))}
                              </ScrollView>
                            </View>
                            <View style={{ width: '50%', gap: 4 }}>
                              {recurringError && !monthlyDayPicked && (
                                <Text style={{ fontSize: 9, fontWeight: '900', color: COLORS.red, textTransform: 'uppercase', textAlign: 'center' }}>Day • Required</Text>
                              )}
                              <Text style={{ fontSize: 8, fontWeight: '900', color: recurringError && !monthlyDayPicked ? COLORS.red : '#94A3B8', textTransform: 'uppercase', textAlign: 'center' }}>Day</Text>
                              <ScrollView style={{ maxHeight: 120, borderWidth: recurringError && !monthlyDayPicked ? 1.5 : 0, borderColor: COLORS.red, borderRadius: 10 }} nestedScrollEnabled>
                                {DAYS_OF_WEEK.map(day => (
                                  <Pressable key={day} onPress={() => requestAnimationFrame(() => { setCustomMonthlyOrdinalDay(day); setMonthlyDayPicked(true); setRecurringError(false); Haptics.selectionAsync(); })} style={{ padding: 8, borderRadius: 8, marginBottom: 4, alignItems: 'center', backgroundColor: customMonthlyOrdinalDay === day && monthlyDayPicked ? '#E0E7FF' : 'white' }}>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: customMonthlyOrdinalDay === day && monthlyDayPicked ? '#4F46E5' : '#64748B' }} numberOfLines={1}>{day}</Text>
                                  </Pressable>
                                ))}
                              </ScrollView>
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Yearly Specifics */}
                    {customFreq === 'Yearly' && (
                      <View className="border-t border-slate-200 pt-4">
                        <Text style={{ fontSize: 9, fontWeight: '900', textTransform: 'uppercase', marginBottom: 12, textAlign: 'center', color: recurringError && customYearlyMonths.length === 0 ? COLORS.red : '#94A3B8' }}>
                          In these months{recurringError && customYearlyMonths.length === 0 ? ' • Required' : ''}
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 24, borderWidth: recurringError && customYearlyMonths.length === 0 ? 1.5 : 0, borderColor: COLORS.red, borderRadius: 12, padding: recurringError && customYearlyMonths.length === 0 ? 8 : 0 }}>
                          {MONTHS.map(month => {
                            const isActive = customYearlyMonths.includes(month);
                            return (
                              <Pressable
                                key={month}
                                onPress={() => { toggleArrayItem(setCustomYearlyMonths, month); setRecurringError(false); }}
                                className={`w-[22%] py-2 rounded-xl items-center border ${isActive ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}
                              >
                                <Text className={`text-[10px] font-black ${isActive ? 'text-white' : 'text-slate-500'}`}>{month}</Text>
                              </Pressable>
                            );
                          })}
                        </View>

                        <View className="flex-row items-center justify-between mb-4 bg-white p-3 rounded-2xl border border-slate-100">
                          <Text className="text-slate-600 font-bold text-xs">On specific days of week</Text>
                          <Pressable
                            onPress={() => { setCustomYearlyUsesOrdinal(v => { if (v) { setYearlyOrdinalPicked(false); setYearlyDayPicked(false); } return !v; }); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                            className={`w-10 h-5 rounded-full px-1 justify-center ${customYearlyUsesOrdinal ? 'bg-indigo-600' : 'bg-slate-200'}`}
                          >
                            <View className={`w-3.5 h-3.5 rounded-full bg-white ${customYearlyUsesOrdinal ? 'self-end' : 'self-start'}`} />
                          </Pressable>
                        </View>

                        {customYearlyUsesOrdinal && (
                          <View className="flex-row gap-3">
                            <View style={{ flex: 1, gap: 4 }}>
                              {recurringError && !yearlyOrdinalPicked && (
                                <Text style={{ fontSize: 9, fontWeight: '900', color: COLORS.red, textTransform: 'uppercase', textAlign: 'center' }}>Order • Required</Text>
                              )}
                              <Text style={{ fontSize: 8, fontWeight: '900', color: recurringError && !yearlyOrdinalPicked ? COLORS.red : '#94A3B8', textTransform: 'uppercase', textAlign: 'center' }}>Order</Text>
                              <ScrollView style={{ maxHeight: 100, borderWidth: recurringError && !yearlyOrdinalPicked ? 1.5 : 0, borderColor: COLORS.red, borderRadius: 10 }} nestedScrollEnabled>
                                {WEEK_ORDINALS.map(ord => (
                                  <Pressable key={ord} onPress={() => requestAnimationFrame(() => { setCustomYearlyOrdinal(ord); setYearlyOrdinalPicked(true); setRecurringError(false); Haptics.selectionAsync(); })} className={`p-2 rounded-lg mb-1 items-center ${customYearlyOrdinal === ord && yearlyOrdinalPicked ? 'bg-indigo-100' : 'bg-white'}`}>
                                    <Text className={`text-[10px] font-bold ${customYearlyOrdinal === ord && yearlyOrdinalPicked ? 'text-indigo-600' : 'text-slate-500'}`}>{ord}</Text>
                                  </Pressable>
                                ))}
                              </ScrollView>
                            </View>
                            <View style={{ flex: 1, gap: 4 }}>
                              {recurringError && !yearlyDayPicked && (
                                <Text style={{ fontSize: 9, fontWeight: '900', color: COLORS.red, textTransform: 'uppercase', textAlign: 'center' }}>Day • Required</Text>
                              )}
                              <Text style={{ fontSize: 8, fontWeight: '900', color: recurringError && !yearlyDayPicked ? COLORS.red : '#94A3B8', textTransform: 'uppercase', textAlign: 'center' }}>Day</Text>
                              <ScrollView style={{ maxHeight: 100, borderWidth: recurringError && !yearlyDayPicked ? 1.5 : 0, borderColor: COLORS.red, borderRadius: 10 }} nestedScrollEnabled>
                                {DAYS_OF_WEEK.map(day => (
                                  <Pressable key={day} onPress={() => requestAnimationFrame(() => { setCustomYearlyOrdinalDay(day); setYearlyDayPicked(true); setRecurringError(false); Haptics.selectionAsync(); })} className={`p-2 rounded-lg mb-1 items-center ${customYearlyOrdinalDay === day && yearlyDayPicked ? 'bg-indigo-100' : 'bg-white'}`}>
                                    <Text className={`text-[10px] font-bold ${customYearlyOrdinalDay === day && yearlyDayPicked ? 'text-indigo-600' : 'text-slate-500'}`}>{day}</Text>
                                  </Pressable>
                                ))}
                              </ScrollView>
                            </View>
                          </View>
                        )}
                      </View>
                    )}
                    {/* End condition for Custom */}
                    <View style={{ borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 16 }}>
                      <Text style={{ fontSize: 9, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>Ends</Text>
                      <View style={{ flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 12, padding: 3, marginBottom: 12 }}>
                        {(['indefinite', 'count', 'until'] as const).map(m => (
                          <Pressable key={m} onPress={() => {
                            setEndMode(m); setShowEndCalendar(false); setEndCountError(false); setEndUntilError(false); Haptics.selectionAsync();
                            if (m === 'until' && !endUntilDate) {
                              let cr = `FREQ=${customFreq};INTERVAL=${customInterval}`;
                              if (customFreq === 'Weekly' && customDaysOfWeek.length > 0) cr += `;BYDAY=${customDaysOfWeek.map(d => DAY_ABBREV[d] ?? d).join(',')}`;
                              if (customFreq === 'Monthly') {
                                if (customMonthlyMode === 'each' && customMonthlyDays.length > 0) cr += `;BYMONTHDAY=${customMonthlyDays.join(',')}`;
                                else if (customMonthlyMode === 'on_the') cr += `;BYSETPOS=${ORDINALS[customMonthlyOrdinal] ?? 1};BYDAY=${DAY_ABBREV[customMonthlyOrdinalDay] ?? customMonthlyOrdinalDay}`;
                              }
                              if (customFreq === 'Yearly' && customYearlyMonths.length > 0) {
                                cr += `;BYMONTH=${customYearlyMonths.map(m => MONTH_ABBREV[m] ?? m).join(',')}`;
                                if (customYearlyUsesOrdinal) cr += `;BYSETPOS=${ORDINALS[customYearlyOrdinal] ?? 1};BYDAY=${DAY_ABBREV[customYearlyOrdinalDay] ?? customYearlyOrdinalDay}`;
                              }
                              const firstNext = computeNextDate(dueDate, cr, 1);
                              if (firstNext) setEndUntilDate(parseLocalDate(firstNext));
                            }
                          }}
                            style={{ flex: 1, paddingVertical: 7, borderRadius: 10, alignItems: 'center', backgroundColor: endMode === m ? 'white' : 'transparent' }}>
                            <Text style={{ fontSize: 10, fontWeight: '900', color: endMode === m ? COLORS.primary : '#64748B' }}>
                              {m === 'indefinite' ? 'FOREVER' : m === 'count' ? 'COUNT' : 'DATE'}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      {endMode === 'indefinite' && (() => {
                        const customRule = (() => {
                                          let r = `FREQ=${customFreq};INTERVAL=${customInterval}`;
                          if (customFreq === 'Weekly' && customDaysOfWeek.length > 0) r += `;BYDAY=${customDaysOfWeek.map(d => DAY_ABBREV[d] ?? d).join(',')}`;
                          if (customFreq === 'Monthly') {
                            if (customMonthlyMode === 'each' && customMonthlyDays.length > 0) r += `;BYMONTHDAY=${customMonthlyDays.join(',')}`;
                            else if (customMonthlyMode === 'on_the') r += `;BYSETPOS=${ORDINALS[customMonthlyOrdinal] ?? 1};BYDAY=${DAY_ABBREV[customMonthlyOrdinalDay] ?? customMonthlyOrdinalDay}`;
                          }
                          if (customFreq === 'Yearly' && customYearlyMonths.length > 0) {
                            r += `;BYMONTH=${customYearlyMonths.map(m => MONTH_ABBREV[m] ?? m).join(',')}`;
                            if (customYearlyUsesOrdinal) r += `;BYSETPOS=${ORDINALS[customYearlyOrdinal] ?? 1};BYDAY=${DAY_ABBREV[customYearlyOrdinalDay] ?? customYearlyOrdinalDay}`;
                          }
                          return r;
                        })();
                        const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        const firstDate = parseLocalDate(dueDate);
                        const oneYearOut = getLocalFormattedDate(new Date(firstDate.getFullYear() + 1, firstDate.getMonth(), firstDate.getDate()));
                        // Guard: don't show stats until required selections are made
                        const ruleComplete = !(customFreq === 'Yearly' && customYearlyMonths.length === 0)
                          && !(customFreq === 'Yearly' && customYearlyUsesOrdinal && (!yearlyOrdinalPicked || !yearlyDayPicked))
                          && !(customFreq === 'Monthly' && customMonthlyMode === 'on_the' && (!monthlyOrdinalPicked || !monthlyDayPicked))
                          && !(customFreq === 'Monthly' && customMonthlyMode === 'each' && customMonthlyDays.length === 0)
                          && !(customFreq === 'Weekly' && customDaysOfWeek.length === 0);
                        const perYear = ruleComplete ? (() => { try { return countOccurrencesBetween(dueDate, customRule, oneYearOut); } catch { return null; } })() : null;
                        return perYear != null ? (
                          <View style={{ backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, gap: 4 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700' }}>First occurrence</Text>
                              <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.green }}>{fmt(firstDate)}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700' }}>Approx. per year</Text>
                              <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.primary }}>~{perYear}</Text>
                            </View>
                          </View>
                        ) : null;
                      })()}
                      {endMode === 'count' && (() => {
                        // minCount: must cover at least one full interval worth of occurrences
                        const minCount = (() => {
                          if (customFreq === 'Weekly' && customDaysOfWeek.length > 1) return customDaysOfWeek.length;
                          if (customFreq === 'Monthly' && customMonthlyMode === 'each' && customMonthlyDays.length > 1) return customMonthlyDays.length;
                          if (customFreq === 'Yearly' && customYearlyMonths.length > 1) return customYearlyMonths.length;
                          return 1;
                        })();
                        const n = Math.max(minCount, parseInt(endCount) || 0);
                        const customRule = (() => {
                                          let r = `FREQ=${customFreq};INTERVAL=${customInterval}`;
                          if (customFreq === 'Weekly' && customDaysOfWeek.length > 0) r += `;BYDAY=${customDaysOfWeek.map(d => DAY_ABBREV[d] ?? d).join(',')}`;
                          if (customFreq === 'Monthly') {
                            if (customMonthlyMode === 'each' && customMonthlyDays.length > 0) r += `;BYMONTHDAY=${customMonthlyDays.join(',')}`;
                            else if (customMonthlyMode === 'on_the') r += `;BYSETPOS=${ORDINALS[customMonthlyOrdinal] ?? 1};BYDAY=${DAY_ABBREV[customMonthlyOrdinalDay] ?? customMonthlyOrdinalDay}`;
                          }
                          if (customFreq === 'Yearly' && customYearlyMonths.length > 0) {
                            r += `;BYMONTH=${customYearlyMonths.map(m => MONTH_ABBREV[m] ?? m).join(',')}`;
                            if (customYearlyUsesOrdinal) r += `;BYSETPOS=${ORDINALS[customYearlyOrdinal] ?? 1};BYDAY=${DAY_ABBREV[customYearlyOrdinalDay] ?? customYearlyOrdinalDay}`;
                          }
                          return r;
                        })();
                        const ruleComplete = !(customFreq === 'Yearly' && customYearlyMonths.length === 0)
                          && !(customFreq === 'Yearly' && customYearlyUsesOrdinal && (!yearlyOrdinalPicked || !yearlyDayPicked))
                          && !(customFreq === 'Monthly' && customMonthlyMode === 'on_the' && (!monthlyOrdinalPicked || !monthlyDayPicked))
                          && !(customFreq === 'Monthly' && customMonthlyMode === 'each' && customMonthlyDays.length === 0)
                          && !(customFreq === 'Weekly' && customDaysOfWeek.length === 0);
                        const firstDate = parseLocalDate(dueDate);
                        const lastDate = (() => {
                          if (!ruleComplete || n < minCount) return null;
                          let cur = dueDate;
                          for (let i = 1; i < n; i++) {
                            const next = computeNextDate(cur, customRule, 1);
                            if (!next) return parseLocalDate(cur);
                            cur = next;
                          }
                          return parseLocalDate(cur);
                        })();
                        const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        return (
                          <View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                              <Pressable onPress={() => { setEndCount(c => String(Math.max(minCount, parseInt(c) - 1))); setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50); }}
                                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
                                <ChevronDown size={14} color="#64748B" />
                              </Pressable>
                              <TextInput value={String(n)} onChangeText={v => { const val = Math.max(minCount, parseInt(v.replace(/[^0-9]/g, '')) || minCount); setEndCount(String(val)); setEndCountError(false); setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50); }} keyboardType="number-pad"
                                style={{ flex: 1, textAlign: 'center', fontSize: 22, fontWeight: '900', color: '#0F172A', backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 8 }} />
                              <Pressable onPress={() => { setEndCount(c => String(Math.max(minCount, parseInt(c)) + 1)); setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50); }}
                                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
                                <ChevronUp size={14} color="#64748B" />
                              </Pressable>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>times</Text>
                            </View>
                            {minCount > 1 && <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: '700', marginTop: 4, textAlign: 'center' }}>Min {minCount} · one per selected {customFreq === 'Yearly' ? 'month' : 'day'}</Text>}
                            <View style={{ marginTop: 10, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, gap: 4 }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700' }}>First occurrence</Text>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.green }}>{fmt(firstDate)}</Text>
                              </View>
                              {lastDate && (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                  <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700' }}>Last occurrence</Text>
                                  <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.primary }}>{fmt(lastDate)}</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        );
                      })()}
                      {endMode === 'until' && (() => {
                        const customRule = (() => {
                                          let r = `FREQ=${customFreq};INTERVAL=${customInterval}`;
                          if (customFreq === 'Weekly' && customDaysOfWeek.length > 0) r += `;BYDAY=${customDaysOfWeek.map(d => DAY_ABBREV[d] ?? d).join(',')}`;
                          if (customFreq === 'Monthly') {
                            if (customMonthlyMode === 'each' && customMonthlyDays.length > 0) r += `;BYMONTHDAY=${customMonthlyDays.join(',')}`;
                            else if (customMonthlyMode === 'on_the') r += `;BYSETPOS=${ORDINALS[customMonthlyOrdinal] ?? 1};BYDAY=${DAY_ABBREV[customMonthlyOrdinalDay] ?? customMonthlyOrdinalDay}`;
                          }
                          if (customFreq === 'Yearly' && customYearlyMonths.length > 0) {
                            r += `;BYMONTH=${customYearlyMonths.map(m => MONTH_ABBREV[m] ?? m).join(',')}`;
                            if (customYearlyUsesOrdinal) r += `;BYSETPOS=${ORDINALS[customYearlyOrdinal] ?? 1};BYDAY=${DAY_ABBREV[customYearlyOrdinalDay] ?? customYearlyOrdinalDay}`;
                          }
                          return r;
                        })();
                        const ruleComplete = !(customFreq === 'Yearly' && customYearlyMonths.length === 0)
                          && !(customFreq === 'Yearly' && customYearlyUsesOrdinal && (!yearlyOrdinalPicked || !yearlyDayPicked))
                          && !(customFreq === 'Monthly' && customMonthlyMode === 'on_the' && (!monthlyOrdinalPicked || !monthlyDayPicked))
                          && !(customFreq === 'Monthly' && customMonthlyMode === 'each' && customMonthlyDays.length === 0)
                          && !(customFreq === 'Weekly' && customDaysOfWeek.length === 0);
                        const firstNext = ruleComplete ? computeNextDate(dueDate, customRule, 1) : null;
                        const minDate = firstNext ? parseLocalDate(firstNext) : new Date(parseLocalDate(dueDate).getTime() + 86400000);
                        const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        const totalCount = (ruleComplete && endUntilDate) ? (() => { try { return countOccurrencesBetween(dueDate, customRule, getLocalFormattedDate(endUntilDate)) + 1; } catch { return null; } })() : null;
                        return (
                          <View>
                            {endUntilError && !endUntilDate && (
                              <Text style={{ fontSize: 9, fontWeight: '900', color: COLORS.red, textTransform: 'uppercase', marginBottom: 6 }}>End date required • Required</Text>
                            )}
                            <Pressable onPress={() => setShowEndCalendar(v => !v)}
                              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', borderRadius: 12, borderWidth: 1.5, borderColor: endUntilError && !endUntilDate ? COLORS.red : endUntilDate ? COLORS.primary : '#E2E8F0', padding: 12 }}>
                              <Text style={{ fontSize: 14, fontWeight: '800', color: endUntilDate ? '#0F172A' : endUntilError ? COLORS.red : '#94A3B8' }}>
                                {endUntilDate ? endUntilDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Pick end date'}
                              </Text>
                              <ChevronDown size={16} color="#64748B" />
                            </Pressable>
                            {showEndCalendar && (
                              <InlineCalendar minDate={minDate} selected={endUntilDate} onSelect={d => { setEndUntilDate(d); setEndUntilError(false); setShowEndCalendar(false); }} />
                            )}
                            {totalCount != null && (
                              <View style={{ marginTop: 10, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, gap: 4 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                  <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700' }}>First occurrence</Text>
                                  <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.green }}>{fmt(parseLocalDate(dueDate))}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                  <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700' }}>Last occurrence</Text>
                                  <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.primary }}>{fmt(endUntilDate!)}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                  <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700' }}>Total</Text>
                                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#0F172A' }}>{totalCount} time{totalCount !== 1 ? 's' : ''}</Text>
                                </View>
                              </View>
                            )}
                          </View>
                        );
                      })()}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

        </ScrollView>

        {/* FROZEN FOOTER */}
        <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16), borderTopWidth: 1, borderTopColor: '#F1F5F9', flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            onPress={() => handlePerformAdd(true)}
            style={{ flex: 1, backgroundColor: '#F1F5F9', paddingVertical: 18, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E2E8F0', gap: 2 }}
          >
            <Text style={{ color: '#475569', fontSize: 14, fontWeight: '900', letterSpacing: 0.3 }}>+ Add Another</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handlePerformAdd(false)}
            style={{ flex: 1.5, backgroundColor: COLORS.primary, paddingVertical: 18, borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 6 }}
          >
            <Text style={{ color: 'white', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 }}>Add Chore ✓</Text>
          </TouchableOpacity>
        </View>
        </KeyboardAvoidingView>
      </Animated.View>
      </View>
    </Modal>
  );
};

// ─── UNDO COUNTDOWN RING ──────────────────────────────────────────

// ─── COMPLETED CHORE LIST (manages own expand state) ──────────────
const CompletedChoreList = React.memo(({
  chores, onRevert, onDelete, onDefer, onEdit, currentUser, highlightedId, familyMembers, onPointsNotify,
}: {
  chores: Chore[];
  onRevert: (id: string) => void;
  onDelete: (id: string) => void;
  onDefer: (id: string) => void;
  onEdit: (c: Chore) => void;
  currentUser: string;
  highlightedId: string | null;
  familyMembers: any[];
  onPointsNotify?: (pts: number, total: number) => void;
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  return (
    <View style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: 'white' }}>
      {chores.map((c, idx) => (
        <RestockStyleChoreItem
          key={c.id}
          chore={c}
          isExpanded={expandedId === c.id}
          onToggleExpand={() => setExpandedId(prev => prev === c.id ? null : c.id)}
          onComplete={() => {}}
          onRevert={onRevert}
          onDelete={onDelete}
          onDefer={onDefer}
          onEdit={onEdit}
          sectionColor="#94A3B8"
          currentUser={currentUser}
          isLast={idx === chores.length - 1}
          isFirst={idx === 0}
          isHighlighted={highlightedId === c.id}
          familyMembers={familyMembers}
          onPointsNotify={onPointsNotify}
        />
      ))}
    </View>
  );
});

// --- UNDO BAR ---
const UndoBar = ({ title, onUndo, onDismiss, showViewDeleted, onViewDeleted }: { title: string; onUndo: () => void; onDismiss: () => void; showViewDeleted?: boolean; onViewDeleted?: () => void }) => {
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
      <View style={{ position: 'absolute', bottom: 108, left: 24, right: 24, zIndex: 1000 }}>
        <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOut} style={[animStyle, { backgroundColor: '#1E293B', borderRadius: 20, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', ...GOLDEN_SHADOW, shadowOpacity: 0.2 }]}>
          <Text style={{ color: '#E2E8F0', fontSize: 13, fontWeight: '700', flex: 1 }} numberOfLines={1}>{title}</Text>
          {showViewDeleted && onViewDeleted && (
            <TouchableOpacity onPress={onViewDeleted} style={{ paddingHorizontal: 10, paddingVertical: 7, marginLeft: 8 }}>
              <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '700' }}>View</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onUndo} style={{ paddingHorizontal: 14, paddingVertical: 7, backgroundColor: COLORS.primary, borderRadius: 12, marginLeft: 4 }}>
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '900' }}>Undo</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </GestureDetector>
  );
};

// --- MAIN SCREEN ---
export default function ChoresView() {
  const params = useLocalSearchParams<{ id?: string, filter?: string }>();
  const router = useRouter();
  const deepLinkChoreId = params.id;
  const authUser = useAuthStore((state) => state.user);

  const {
    sections,
    familyMembers,
    setChores,
    setSections,
    currentUser,
    completeChore,
    deleteChore,
    restoreChore,
    softDeleteChoresByGroup,
    purgeDeletedChores,
    addChoreDeletedDate,
    removeChoreDeletedDate,
    updateChore,
    addChore,
    addSection,
    deleteSection,
    updateSection,
    choreSort: persistedSort,
    choreFilter: persistedFilter,
    overdueExpanded,
    setChoreSort,
    setChoreFilter,
    setOverdueExpanded,
    vacationMode,
    setVacationMode,
    updateMemberStats,
    addRestockItem,
  } = useHuddleStore();

  // Exclude soft-deleted chores from all active views
  const allChores = useHuddleStore(s => s.chores);
  const chores = useMemo(() => allChores.filter(c => !c.deletedAt), [allChores]);
  const deletedCount = useMemo(() => {
    const softDeleted = allChores.filter(c => !!c.deletedAt).length;
    const exdated = allChores.reduce((sum, c) => sum + (c.deletedDates?.length ?? 0), 0);
    return softDeleted + exdated;
  }, [allChores]);

  // Chore load count per family member (pending only) for assignment sheet
  const choreCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    chores.filter(c => c.status === 'pending').forEach(c => {
      if (c.assignee) counts[c.assignee] = (counts[c.assignee] || 0) + 1;
    });
    return counts;
  }, [chores]);

  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    purgeDeletedChores();
    const task = InteractionManager.runAfterInteractions(() => setIsReady(true));
    return () => task.cancel();
  }, []);

  const [scope, setScope] = useState(params.filter === 'Me' ? 'Me' : 'All');
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [ptsNotify, setPtsNotify] = useState<{ points: number; prevTotal: number; total: number; recipientName?: string } | null>(null);
  const [isCalExpanded, setIsCalExpanded] = useState(false);
  const [calDate, setCalDate] = useState(new Date());
  const [calMode, setCalMode] = useState<'Day' | 'Month' | 'Year'>('Day');
  const [scrollMonthLabel, setScrollMonthLabel] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [isAddingChore, setIsAddingChore] = useState(false);
  const [addChoreKey, setAddChoreKey] = useState(0);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [deferTarget, setDeferTarget] = useState<{ id: string; title: string; sourceDateStr?: string; isVirtual?: boolean; virtualDate?: string; bulkRecurringMode?: 'reset' | 'instance' } | null>(null);
  // Track rs_ section IDs the user has manually deleted so useLayoutEffect won't re-create them on the same date
  const manuallyDeletedRsSections = useRef<Set<string>>(new Set());
  const [reassignTargetChore, setReassignTargetChore] = useState<Chore | null>(null);
  const [randomGameChore, setRandomGameChore] = useState<Chore | null>(null);
  const [showGamePicker, setShowGamePicker] = useState(false);
  // HAR-29: persisted sort/filter via store
  const activeSort: ActiveSort = persistedSort as ActiveSort;
  const setActiveSort = (s: ActiveSort) => setChoreSort(s);
  const filter: FilterState = persistedFilter as FilterState;
  const setFilter = (f: FilterState | ((prev: FilterState) => FilterState)) => {
    if (typeof f === 'function') {
      setChoreFilter(f(persistedFilter as FilterState));
    } else {
      setChoreFilter(f);
    }
  };

  const dateSections = useMemo(() =>
    sections.filter(s => s.date === selectedDate),
    [sections, selectedDate]
  );

  // Sync scope → filter.assignees
  useEffect(() => {
    const targetAssignees = scope === 'Me' && currentUser ? [currentUser] : [];
    setFilter(prev => {
      if (JSON.stringify(prev.assignees) === JSON.stringify(targetAssignees)) return prev;
      return { ...prev, assignees: targetAssignees };
    });
  }, [scope, currentUser]);


  const [showSortFilter, setShowSortFilter] = useState(false);
  // #23: collapsible search
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setIsRefreshing(false), 1500);
  }, []);
  // #22: show completed
  const [showCompleted, setShowCompleted] = useState(false);
  // HAR-35: bulk select mode
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedChoreIds, setSelectedChoreIds] = useState<Set<string>>(new Set());

  const handleEnterBulkSelect = useCallback((id: string) => {
    setBulkSelectMode(true);
    setSelectedChoreIds(new Set([id]));
  }, []);

  const handleBulkSelectToggle = useCallback((id: string) => {
    setSelectedChoreIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }, []);

  // #11: undo on completion, deletion, deferral
  const [undoItem, setUndoItem] = useState<{ choreId: string; title: string; action: 'complete' | 'delete' | 'delete-instance' | 'defer' | 'bulk-delete' | 'bulk-assign' | 'bulk-defer'; originalChore?: Chore; spawnedId?: string; originalChores?: Chore[]; deletedDate?: string; exdatedChores?: { id: string; date: string }[] } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Centralized undo timer — clears any existing timer, sets a new 3.5s auto-dismiss
  const startUndoTimer = useCallback((item: typeof undoItem) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoItem(item);
    undoTimerRef.current = setTimeout(() => {
      setUndoItem(null);
      setPtsNotify(null);
    }, 3500);
  }, []);

  const hudRef = useRef<any>(null);
  // Ref so bulk handlers (defined before filteredSortedChores useMemo) can access current visible chores incl. virtuals
  const filteredSortedChoresRef = useRef<Chore[]>([]);
  const listRef = useRef<any>(null);
  const flatListRef = useRef<any>(null);
  const mainScrollRef = useRef<ScrollView>(null);

  // Handle deep link from home screen "Go To" button
  useEffect(() => {
    if (deepLinkChoreId && chores.length > 0) {
      const instance = chores.find(c => c.id === deepLinkChoreId);
      if (instance) {
        // Close search bar if open
        if (isSearchOpen) {
          setIsSearchOpen(false);
          setSearchQuery('');
        }

        const targetDate = instance.dueDate;
        const isSameDate = targetDate === selectedDate;

        if (!isSameDate) {
          startTransition(() => setSelectedDate(targetDate));
          setCalDate(parseLocalDate(targetDate));
          hudRef.current?.scrollToDate(targetDate);
        }

        if (instance.sectionId) {
          updateSection(instance.sectionId, { isCollapsed: false });
        }

        // Allow state to settle before setting pending scroll
        setTimeout(() => {
          setPendingScrollId(instance.id);
        }, 300);
      }
    }
  }, [deepLinkChoreId, chores.length]);

  // #23: animated search bar height
  const searchOpenVal = useSharedValue(0);
  useEffect(() => {
    searchOpenVal.value = withSpring(isSearchOpen ? 1 : 0, SPRING_CONFIG);
    if (!isSearchOpen) setSearchQuery('');
  }, [isSearchOpen]);
  const searchBarAnimStyle = useAnimatedStyle(() => ({
    height: searchOpenVal.value * 56,
    opacity: searchOpenVal.value,
    overflow: 'hidden',
  }));

  // Overdue & streak tracking — run once on mount only
  useEffect(() => {
    const today = getTodayStr();
    const overdueUpdates: { id: string; updates: Partial<Chore> }[] = [];

    chores.forEach(c => {
      if (c.status !== 'pending' || c.deletedAt) return;
      const isOverdue = c.dueDate < today;
      if (isOverdue && !c.isOverdue) {
        const overdueDays = Math.ceil((parseLocalDate(today).getTime() - parseLocalDate(c.dueDate).getTime()) / (1000 * 60 * 60 * 24));
        // Don't re-increment missedStreak if this was already counted during a prior overdue cycle (recovery path)
        const newMissedStreak = c.isOverdueRecovery ? (c.missedStreak || 1) : (c.missedStreak || 0) + 1;
        overdueUpdates.push({
          id: c.id,
          updates: { isOverdue: true, overdueDays, missedStreak: newMissedStreak, isOverdueRecovery: false }
        });
      }
    });

    if (overdueUpdates.length > 0) {
      unstable_batchedUpdates(() => {
        overdueUpdates.forEach(u => updateChore(u.id, u.updates));
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally runs once on mount

  // Section handlers
  const handleRenameSection = useCallback((id: string, title: string) => {
    updateSection(id, { title: title.trim() });
  }, [updateSection]);

  const handleDeleteSection = useCallback((id: string) => {
    deleteSection(id);
    // Find active chores in this section and unassign section
    chores.filter(c => c.sectionId === id && !c.deletedAt).forEach(c => updateChore(c.id, { sectionId: null }));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [chores, deleteSection, updateChore]);

  const handleChangeSectionColor = useCallback((id: string, color: string) => {
    updateSection(id, { themeColor: color });
  }, [updateSection]);

  const handleMoveSectionUp = useCallback((id: string) => {
    const sorted = [...sections].sort((a, b) => a.priorityIndex - b.priorityIndex);
    const idx = sorted.findIndex(s => s.id === id);
    if (idx <= 0) return;
    [sorted[idx - 1], sorted[idx]] = [sorted[idx], sorted[idx - 1]];
    sorted.forEach((s, i) => updateSection(s.id, { priorityIndex: i }));
  }, [sections, updateSection]);

  const handleMoveSectionDown = useCallback((id: string) => {
    const sorted = [...sections].sort((a, b) => a.priorityIndex - b.priorityIndex);
    const idx = sorted.findIndex(s => s.id === id);
    if (idx >= sorted.length - 1) return;
    [sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]];
    sorted.forEach((s, i) => updateSection(s.id, { priorityIndex: i }));
  }, [sections, updateSection]);

  const productionMutations = useRef(new Set<string>());
  const updateProductionChore = useCallback(async (id: string, updates: Partial<Chore>) => {
    const state = useHuddleStore.getState();
    const existing = state.chores.find(chore => chore.id === id);
    if (!authUser || !state.householdId || !existing || productionMutations.current.has(id)) return false;
    productionMutations.current.add(id);
    try {
      const next = { ...existing, ...updates };
      let assigneeId = next.assigned_to;
      if (Object.prototype.hasOwnProperty.call(updates, 'assignee') && !Object.prototype.hasOwnProperty.call(updates, 'assigned_to')) {
        const matches = state.familyMembers.filter(member => member.name === updates.assignee);
        if (matches.length > 1) throw new Error('More than one member has this name. Use the assignment picker to select a specific member.');
        assigneeId = matches[0]?.id;
      }
      await householdApi.updateChore({ id, title: next.title, points: next.points, assigneeId, dueDate: next.dueDate, notes: next.notes, photoRequired: next.photoRequired, version: existing.version });
      requestHouseholdRefresh(state.householdId);
      return true;
    } catch (error) {
      Alert.alert('Chore not updated', error instanceof Error ? error.message : 'Please try again.');
      return false;
    } finally { productionMutations.current.delete(id); }
  }, [authUser]);

  const archiveProductionChore = useCallback(async (id: string) => {
    const householdId = useHuddleStore.getState().householdId;
    if (!householdId || productionMutations.current.has(id)) return;
    productionMutations.current.add(id);
    try { await householdApi.archiveChore(id); requestHouseholdRefresh(householdId); }
    catch (error) { Alert.alert('Chore not archived', error instanceof Error ? error.message : 'Please try again.'); }
    finally { productionMutations.current.delete(id); }
  }, []);

  const submitProductionCompletion = useCallback(async (id: string) => {
    if (!authUser) return false;
    if (productionMutations.current.has(id)) return false;
    productionMutations.current.add(id);

    try {
      const chore = chores.find((item) => item.id === id);
      if (!chore) return false;

      const householdId = await householdApi.getMyHouseholdId(authUser.id);
      if (!householdId) throw new Error('Your household is not ready yet. Please finish setup and try again.');

      const snapshot = await householdData.load(householdId);
      const completedBy = chore.assigned_to
        ? snapshot.members.find(member => member.id === chore.assigned_to && !member.removed_at)
        : snapshot.members.find(member => member.auth_user_id === authUser.id && !member.removed_at);
      if (!completedBy) throw new Error('Choose a household member before completing this chore.');

      const [beforePath, afterPath] = await Promise.all([
        chore.photoProvided?.beforeUri
          ? householdProofs.upload({ householdId, choreId: id, slot: 'before', uri: chore.photoProvided.beforeUri })
          : Promise.resolve(undefined),
        chore.photoProvided?.afterUri
          ? householdProofs.upload({ householdId, choreId: id, slot: 'after', uri: chore.photoProvided.afterUri })
          : Promise.resolve(undefined),
      ]);

      await householdApi.submitCompletion({
        choreId: id,
        memberId: completedBy.id,
        occurrenceDate: chore.dueDate || getTodayStr(),
        beforePath,
        afterPath,
      });
      requestHouseholdRefresh(householdId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return true;
    } catch (error) {
      Alert.alert('Unable to submit chore', error instanceof Error ? error.message : 'Please try again.');
      return false;
    } finally { productionMutations.current.delete(id); }
  }, [authUser, chores]);

  // #11: completion with undo
  const handleCompleteChore = useCallback((id: string) => {
    if (authUser) {
      void submitProductionCompletion(id);
      return;
    }

    const chore = chores.find(c => c.id === id);
    if (!chore) return;

    // Guard: already completed — no double points
    if (chore.status === 'completed') return;

    // 1. Identify target for points
    const targetName = chore.assignee || currentUser;
    const targetUser = familyMembers.find(m => m.name === targetName);

    // 2. Mark CURRENT as completed (stays on this day)
    updateChore(id, {
      status: 'completed',
      completedBy: currentUser,
      completedAt: new Date().toISOString()
    });

    // 3. Handle Recurrence Spawning
    let spawnedId: string | undefined;
    if (chore.isRecurring && chore.recurrenceRule && !chore.isOverdueRecovery) {
      // Determine occurrence index of the chore being completed (1-based)
      const seriesStart = chore.seriesStartDate ?? chore.dueDate;
      const occurrenceIndex = seriesStart === chore.dueDate
        ? 1
        : 1 + countOccurrencesBetween(seriesStart, chore.recurrenceRule, chore.dueDate);
      const nextDate = computeNextDate(chore.dueDate, chore.recurrenceRule, occurrenceIndex);
      if (nextDate) {
        spawnedId = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const nextChore: Chore = {
          ...chore,
          id: spawnedId,
          dueDate: nextDate,
          seriesStartDate: seriesStart,
          nextRecurringDate: computeNextDate(nextDate, chore.recurrenceRule, occurrenceIndex + 1),
          status: 'pending',
          isOverdue: false,
          overdueDays: undefined,
          wasOverdue: false,
          isOverdueRecovery: false,
          photoProvided: { before: false, after: false },
          completedBy: null,
          completedAt: null,
          isNudged: false,
        };
        addChore(nextChore);
      }
    }

    // 4. Points Notification + actual stat update
    if (targetUser) {
      const isOthers = targetName !== currentUser;
      updateMemberStats(targetName, { pointsEarned: chore.points, choresCompleted: 1 });
      setPtsNotify({
        points: chore.points,
        prevTotal: targetUser.stats.pointsEarned,
        total: targetUser.stats.pointsEarned + chore.points,
        recipientName: isOthers ? targetName : undefined,
      });
    }

    // 4b. Auto-add linked restock items (respecting everyN)
    if (chore.linkedRestockItems && chore.linkedRestockItems.length > 0) {
      const completedCount = chore.recurringGroupId
        ? allChores.filter(c => c.recurringGroupId === chore.recurringGroupId && c.status === 'completed').length + 1
        : 1;
      chore.linkedRestockItems.forEach(item => {
        if (completedCount % item.everyN === 0) {
          addRestockItem({
            name: item.name,
            category: 'Other',
            addedBy: { name: currentUser, avatar: '🛒' },
            isUrgent: false,
            isStaple: false,
            isCompleted: false,
            addedAt: Date.now(),
            qty: item.qty,
            unit: item.unit || undefined,
            store: item.store || undefined,
            brand: item.brand || undefined,
            note: `Via chore: ${chore.title}`,
            tags: ['Via Chore', ...((item as any).tags ?? [])].filter((t, i, a) => a.indexOf(t) === i),
          });
        }
      });
    }

    // 5. Undo Timer
    startUndoTimer({ choreId: id, title: chore.title, action: 'complete', spawnedId });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [addChore, authUser, chores, currentUser, familyMembers, setPtsNotify, submitProductionCompletion, updateChore]);

  // HAR-35: bulk action handlers (declared after handleCompleteChore)
  const handleBulkComplete = useCallback(() => {
    if (authUser) {
      Alert.alert('Complete chores individually', 'Each submitted chore needs its own completion record and optional proof.');
      return;
    }
    const photoGated: string[] = [];
    const othersChores: string[] = [];
    let completedCount = 0;
    selectedChoreIds.forEach(id => {
      const chore = filteredSortedChoresRef.current.find(c => c.id === id) ?? chores.find(c => c.id === id);
      if (!chore || chore.status === 'completed') return;
      // Skip unassigned chores and other people's chores
      if (!chore.assignee || (chore.assignee && currentUser && chore.assignee !== currentUser)) {
        othersChores.push(chore.title);
        return;
      }
      if (chore.photoRequired && !chore.photoProvided?.after) {
        photoGated.push(chore.title);
        return;
      }
      handleCompleteChore(id);
      completedCount++;
    });
    setBulkSelectMode(false);
    setSelectedChoreIds(new Set());
    const messages: string[] = [];
    if (photoGated.length > 0) messages.push(`${photoGated.length} chore${photoGated.length !== 1 ? 's' : ''} skipped — photo required before completing.`);
    if (othersChores.length > 0) messages.push(`${othersChores.length} chore${othersChores.length !== 1 ? 's' : ''} skipped — assigned to other family members.`);
    if (messages.length > 0) {
      Alert.alert(completedCount > 0 ? 'Partially Completed' : 'Cannot Complete', messages.join('\n'), [{ text: 'OK' }]);
    }
  }, [selectedChoreIds, chores, handleCompleteChore, currentUser]);

  const handleBulkDelete = useCallback(() => {
    if (authUser) {
      Alert.alert('Not available yet', 'Deleting chores is not available for signed-in households yet.');
      return;
    }
    if (selectedChoreIds.size === 0) return;
    const snapshot = filteredSortedChoresRef.current.filter(c => selectedChoreIds.has(c.id));
    const recurringOnes = snapshot.filter(c => c.isRecurring);
    const nonRecurring = snapshot.filter(c => !c.isRecurring);

    const commitDelete = (instanceOnly: boolean) => {
      const softDeletedChores: Chore[] = [];
      const exdated: { id: string; date: string }[] = [];

      for (const c of snapshot) {
        if (!c.isRecurring) {
          // Non-recurring: always hard soft-delete the record
          deleteChore(c.id);
          softDeletedChores.push(c);
        } else if (instanceOnly) {
          // Recurring + this date only: EXDATE the selectedDate
          addChoreDeletedDate(c.id, selectedDate);
          exdated.push({ id: c.id, date: selectedDate });
        } else {
          // Recurring + all future: series soft-delete
          const groupId = c.recurringGroupId;
          if (groupId) {
            softDeleteChoresByGroup(groupId, c.dueDate);
            // For undo, track all affected records
            const affected = allChores.filter(ac => ac.recurringGroupId === groupId && ac.dueDate >= c.dueDate && !ac.deletedAt);
            softDeletedChores.push(...affected);
          } else {
            deleteChore(c.id, 'series');
            softDeletedChores.push(c);
          }
        }
      }

      setBulkSelectMode(false);
      setSelectedChoreIds(new Set());
      startUndoTimer({
        choreId: '__bulk__',
        title: `${snapshot.length} chore${snapshot.length > 1 ? 's' : ''} deleted`,
        action: 'bulk-delete',
        originalChores: softDeletedChores.length > 0 ? softDeletedChores : undefined,
        exdatedChores: exdated.length > 0 ? exdated : undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    };

    if (recurringOnes.length === 0) {
      // No recurring chores — delete immediately
      commitDelete(false);
      return;
    }

    // Build descriptive message
    const allRecurring = nonRecurring.length === 0;
    const msg = allRecurring
      ? `${recurringOnes.length} of the selected chore${recurringOnes.length > 1 ? 's repeat' : ' repeats'}. Remove just today's instance or all future occurrences?`
      : `${recurringOnes.length} of ${snapshot.length} selected chores repeat. The rest will be permanently removed. For recurring ones, remove just today or all future?`;

    Alert.alert('Delete Recurring Chores', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'This date only', onPress: () => commitDelete(true) },
      { text: 'All future instances', style: 'destructive', onPress: () => commitDelete(false) },
    ]);
  }, [selectedChoreIds, allChores, selectedDate, deleteChore, addChoreDeletedDate, softDeleteChoresByGroup]);

  const handleBulkDefer = useCallback(() => {
    if (authUser) {
      Alert.alert('Not available yet', 'Rescheduling chores is not available for signed-in households yet.');
      return;
    }
    if (selectedChoreIds.size === 0) return;
    // Use filteredSortedChoresRef so virtual projections on future dates are included with correct dueDate
    const snapshot = filteredSortedChoresRef.current.filter(c => selectedChoreIds.has(c.id));
    const recurringOnes = snapshot.filter(c => c.isRecurring);
    const proceed = (instanceOnly: boolean) => {
      if (!instanceOnly && recurringOnes.length > 0) {
        setDeferTarget({ id: snapshot.map(c => c.id).join(','), title: `${snapshot.length} chores`, bulkRecurringMode: 'reset' });
      } else {
        setDeferTarget({ id: snapshot.map(c => c.id).join(','), title: `${snapshot.length} chores`, bulkRecurringMode: 'instance' });
      }
      setBulkSelectMode(false);
      setSelectedChoreIds(new Set());
    };
    if (recurringOnes.length > 0) {
      const msg = recurringOnes.length === snapshot.length
        ? `All ${snapshot.length} selected chore${snapshot.length > 1 ? 's' : ''} repeat. Reschedule just today's instance or reset their schedules going forward?`
        : `${recurringOnes.length} of ${snapshot.length} selected chores repeat. For recurring ones, reschedule just this instance or reset their schedules?`;
      Alert.alert('Reschedule Recurring Chores', msg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'This instance only', onPress: () => proceed(true) },
        { text: 'Reset schedule', onPress: () => proceed(false) },
      ]);
    } else {
      proceed(true);
    }
  }, [selectedChoreIds]);

  const handleBulkAssign = useCallback(() => {
    if (authUser) {
      Alert.alert('Not available yet', 'Assigning chores is not available for signed-in households yet.');
      return;
    }
    Alert.alert('Bulk Assign', 'Select a family member', [
      { text: 'Cancel', style: 'cancel' },
      ...familyMembers.map(m => ({
        text: `${m.avatar} ${m.name}`,
        onPress: () => {
          const snapshot = filteredSortedChoresRef.current.filter(c => selectedChoreIds.has(c.id));
          snapshot.forEach(c => updateChore(c.id, {
            assignee: m.name, avatar: m.avatar, pool: m.pool,
            ...(c.randomAssignedRunId ? { randomAssignedBy: undefined, randomAssignedGameName: undefined, randomAssignedRunId: undefined, randomAssignedOverridden: true } : {}),
          }));
          setBulkSelectMode(false);
          setSelectedChoreIds(new Set());
          startUndoTimer({ choreId: '__bulk__', title: `${snapshot.length} chore${snapshot.length > 1 ? 's' : ''} assigned to ${m.name}`, action: 'bulk-assign', originalChores: snapshot });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }))
    ]);
  }, [selectedChoreIds, familyMembers, updateChore]);

  const handleRevertComplete = useCallback((id: string) => {
    if (authUser) {
      Alert.alert('Completion already submitted', 'Submitted chores must be reviewed from the household inbox.');
      return;
    }

    const chore = chores.find(c => c.id === id);
    if (!chore) return;

    const userObj = familyMembers.find(m => m.name === currentUser);
    const isParent = userObj?.pool === 'Parents';
    const wasCompletedByMe = chore.completedBy === currentUser;
    const onBehalf = wasCompletedByMe && !!chore.assignee && chore.assignee !== currentUser;
    // Parent can revert any chore; others only if they completed it
    const canRevert = isParent || wasCompletedByMe;

    if (!canRevert) {
      Alert.alert(
        'Permission Denied',
        `Only ${chore.assignee || chore.completedBy || 'the assignee'} or a Parent can revert this chore.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Points always went to the assignee (or completer if unassigned)
    // Points always awarded to assignee; fall back to completer if unassigned
    const pointsRecipient = chore.assignee || chore.completedBy || currentUser;
    const isSelfPoints = pointsRecipient === currentUser;
    const warning = onBehalf
      ? `You completed this on behalf of ${pointsRecipient}. Reverting will deduct ${chore.points} pts from ${pointsRecipient}.`
      : isSelfPoints
        ? `The ${chore.points} pts you earned will be deducted.`
        : `${pointsRecipient}'s ${chore.points} pts will be deducted.`;

    // Safety confirmation & Warning
    Alert.alert(
      "Bring Back to Today?",
      `Are you sure you want to move "${chore.title}" back to the active list?\n\n⚠️ ${warning}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "destructive",
          onPress: () => {

            // Deduct from whoever received the points (assignee, or completer if unassigned)
            const pointsHolder = chore.assignee || chore.completedBy || currentUser;
            const targetUser = familyMembers.find(m => m.name === pointsHolder);

            updateChore(id, {
              status: 'pending',
              completedBy: null,
              completedAt: null,
              dueDate: getTodayStr(),
              due: getTodayStr()
            });

            if (targetUser) {
              const isOthersRevert = pointsHolder !== currentUser;
              updateMemberStats(pointsHolder, { pointsEarned: -chore.points, choresCompleted: -1 });
              setPtsNotify({
                points: -chore.points,
                prevTotal: targetUser.stats.pointsEarned,
                total: targetUser.stats.pointsEarned - chore.points, // HAR-117: allow negative
                recipientName: isOthersRevert ? pointsHolder : undefined, // HAR-116: name whose pts drop
              });
              // Synchronization: ensure pts bar stays for 3.5s like undo bar
              if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
              undoTimerRef.current = setTimeout(() => { setPtsNotify(null); }, 3500);
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      ]
    );
  }, [authUser, chores, currentUser, updateChore, familyMembers, setPtsNotify]);

  const handleUndo = useCallback(() => {
    if (!undoItem) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    if (undoItem.action === 'complete') {
      const chore = chores.find(c => c.id === undoItem.choreId);
      // Guard: skip undo if chore was already reverted by another code path
      if (!chore || chore.status !== 'completed') {
        setUndoItem(null);
        return;
      }
      updateChore(undoItem.choreId, { status: 'pending', completedAt: null, completedBy: null });
      if (undoItem.spawnedId) deleteChore(undoItem.spawnedId);
      // Restore overdue badges on future instances that were cleared during completion
      if (undoItem.originalChores) {
        undoItem.originalChores.forEach(orig => {
          updateChore(orig.id, { missedStreak: orig.missedStreak, wasOverdue: orig.wasOverdue, overdueDays: orig.overdueDays, baseOverdueDays: orig.baseOverdueDays, isOverdueRecovery: orig.isOverdueRecovery });
        });
      }

      const targetName = chore?.assignee || currentUser;
      const user = familyMembers.find(m => m.name === targetName);
      if (chore && user) {
        const isOthers = targetName !== currentUser;
        updateMemberStats(targetName, { pointsEarned: -chore.points, choresCompleted: -1 });
        setPtsNotify({
          points: -chore.points,
          prevTotal: user.stats.pointsEarned,
          total: user.stats.pointsEarned - chore.points, // HAR-117: allow negative
          recipientName: isOthers ? targetName : undefined,
        });
        // Clear ptsNotify after 3.5s
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        undoTimerRef.current = setTimeout(() => { setPtsNotify(null); }, 3500);
      }
    } else if (undoItem.action === 'delete' && undoItem.originalChore) {
      restoreChore(undoItem.choreId);
      const today = getTodayStr();
      const orig = undoItem.originalChore;
      if (orig.isOverdue || orig.dueDate < today) {
        const due = parseLocalDate(orig.dueDate);
        const now = parseLocalDate(today);
        const diffDays = Math.max(orig.overdueDays ?? 0, Math.floor((now.getTime() - due.getTime()) / 86400000));
        updateChore(undoItem.choreId, { isOverdue: true, overdueDays: diffDays, wasOverdue: orig.wasOverdue });
      } else if (orig.wasOverdue && orig.overdueDays) {
        // Chore was moved to today (wasOverdue=true, dueDate=today) — restore overdue badge
        updateChore(undoItem.choreId, { wasOverdue: true, overdueDays: orig.overdueDays, isOverdueRecovery: orig.isOverdueRecovery });
      }
    } else if (undoItem.action === 'delete-instance' && undoItem.deletedDate) {
      removeChoreDeletedDate(undoItem.choreId, undoItem.deletedDate);
    } else if (undoItem.action === 'defer' && undoItem.originalChore) {
      updateChore(undoItem.choreId, { ...undoItem.originalChore });
    } else if (undoItem.action === 'bulk-delete') {
      const today = getTodayStr();
      undoItem.originalChores?.forEach(c => {
        restoreChore(c.id);
        if (c.isOverdue || c.dueDate < today) {
          const due = parseLocalDate(c.dueDate);
          const now = parseLocalDate(today);
          const diffDays = Math.max(c.overdueDays ?? 0, Math.floor((now.getTime() - due.getTime()) / 86400000));
          updateChore(c.id, { isOverdue: true, overdueDays: diffDays, wasOverdue: c.wasOverdue });
        } else if (c.wasOverdue && c.overdueDays) {
          updateChore(c.id, { wasOverdue: true, overdueDays: c.overdueDays, isOverdueRecovery: c.isOverdueRecovery });
        }
      });
      undoItem.exdatedChores?.forEach(({ id, date }) => removeChoreDeletedDate(id, date));
    } else if (undoItem.action === 'bulk-assign' && undoItem.originalChores) {
      undoItem.originalChores.forEach(c => updateChore(c.id, { assignee: c.assignee, avatar: c.avatar, pool: c.pool }));
    } else if (undoItem.action === 'bulk-defer' && undoItem.originalChores) {
      undoItem.originalChores.forEach(c => updateChore(c.id, { dueDate: c.dueDate, isOverdue: c.isOverdue, priorityIndex: c.priorityIndex, sectionId: c.sectionId }));
    }

    setUndoItem(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [undoItem, updateChore, addChore, deleteChore, chores, familyMembers, currentUser]);

  // #15: nudge handler
  const handleNudge = useCallback((id: string) => {
    updateChore(id, { isNudged: true });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [updateChore]);

  // #21: add chore
  const handleAddChore = useCallback((chore: Omit<Chore, 'id'>) => {
    addChore(chore);
  }, [addChore]);

  const createProductionChore = useCallback(async (chore: Omit<Chore, 'id'>) => {
    if (!authUser) {
      addChore(chore);
      return true;
    }

    try {
      const householdId = await householdApi.getMyHouseholdId(authUser.id);
      if (!householdId) throw new Error('Your household is not ready yet. Please finish setup and try again.');

      const snapshot = await householdData.load(householdId);
      const assigneeId = snapshot.members.find((member) => member.display_name === chore.assignee)?.id;
      const dueAt = chore.dueDate ? new Date(chore.dueDate + 'T12:00:00').toISOString() : undefined;

      await householdApi.createChore({
        householdId,
        title: chore.title,
        points: chore.points,
        assigneeId,
        dueAt,
        recurrenceRule: chore.recurrenceRule,
        photoRequired: chore.photoRequired,
      });
      return true;
    } catch (error) {
      Alert.alert('Unable to add chore', error instanceof Error ? error.message : 'Please try again.');
      return false;
    }
  }, [addChore, authUser]);

  // Debounced calDate: only recompute choresByDate after user stops navigating months
  const [debouncedCalDate, setDebouncedCalDate] = useState(calDate);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCalDate(calDate), 150);
    return () => clearTimeout(t);
  }, [calDate]);

  const choresByDate = useMemo(() => {
    const acc: Record<string, boolean> = {};
    const calBase = debouncedCalDate;
    const windowStartStr = getLocalFormattedDate(new Date(calBase.getFullYear(), calBase.getMonth() - 1, 1));
    const windowEndStr = getLocalFormattedDate(new Date(calBase.getFullYear(), calBase.getMonth() + 2, 0));

    // Mirror the exact same scope/assignee logic used by filteredSortedChores so dots
    // only appear on dates where the list will actually show at least one chore.
    const passesScope = (c: Chore) => {
      if (scope === 'All') return true;
      // scope='Me': list requires assignee === currentUser (via filter.assignees sync)
      return c.assignee === currentUser;
    };

    // Only suppress dots for true daily (every single day = too many dots to be useful)
    const isDaily   = (rule: string) => rule === 'Every Day' || rule === 'FREQ=Daily;INTERVAL=1' || /^FREQ=Daily$/.test(rule);
    const isWeekly  = (rule: string) => rule === 'Every Week'   || rule === 'Every 2 Weeks'
                                     || (rule.startsWith('FREQ=Weekly') && !rule.includes('INTERVAL=') )
                                     || /FREQ=Weekly;INTERVAL=[12];/.test(rule)
                                     || /FREQ=Weekly;INTERVAL=[12]$/.test(rule);

    // Use a per-chore accumulator then merge to avoid cross-chore EXDATE deletion
    for (const c of chores) {
      if (c.status !== 'completed' && passesScope(c)) {
        // Real chore record gets a dot on its own due date
        if (!c.deletedDates?.includes(c.dueDate) && !(c.deletedFromDate && c.dueDate >= c.deletedFromDate)) {
          acc[c.dueDate] = true;
        }

        // Project occurrences for recurring chores across the calendar window
        if (c.isRecurring && c.recurrenceRule && !isDaily(c.recurrenceRule)) {
          const choreAcc: Record<string, boolean> = {};
          fillOccurrencesInWindow(c.dueDate, c.recurrenceRule, windowStartStr, windowEndStr, choreAcc);
          // Apply per-chore EXDATE and deletedFromDate suppressions before merging
          if (c.deletedDates) {
            for (const d of c.deletedDates) { delete choreAcc[d]; }
          }
          if (c.deletedFromDate) {
            for (const d of Object.keys(choreAcc)) {
              if (d >= c.deletedFromDate) delete choreAcc[d];
            }
          }
          Object.assign(acc, choreAcc);
        }
      }
    }
    return acc;
  }, [chores, scope, currentUser, debouncedCalDate]);

  const choresByDateMap = useMemo(() => {
    const map = new Map<string, Chore[]>();
    for (const c of chores) {
      const list = map.get(c.dueDate) || [];
      list.push(c);
      map.set(c.dueDate, list);
    }
    return map;
  }, [chores]);

  const filteredSortedChores = useMemo(() => {
    const isVacationDate = vacationMode?.active && selectedDate >= vacationMode.startDate && selectedDate <= vacationMode.endDate;
    const dayChores: Chore[] = (choresByDateMap.get(selectedDate) || [])
      .filter(c => {
        if (c.status === 'completed' || c.status === 'deferred' || c.status === 'sick_reassigned') return false;
        if (scope !== 'All' && c.assignee !== currentUser) return false;
        if (c.deletedDates?.includes(selectedDate)) return false;
        if (c.deletedFromDate && selectedDate >= c.deletedFromDate) return false;
        if (isVacationDate && c.isRecurring) return false; // suppress recurring during vacation
        return true;
      });

    const virtualChores: Chore[] = [];
    const realIds = new Set(dayChores.map(c => c.id));

    // Targeted pass for virtual projections only
    for (const c of chores) {
      if (c.isRecurring && c.recurrenceRule && c.status === 'pending' && c.dueDate < selectedDate) {
        // Use same scope check as choresByDate: scope='Me' requires assignee match
        if (scope !== 'All' && c.assignee !== currentUser) continue;
        if (!realIds.has(c.id) && recurringOccursOn(c.dueDate, c.recurrenceRule, selectedDate)
            && !(c.deletedDates?.includes(selectedDate))
            && !(c.deletedFromDate && selectedDate >= c.deletedFromDate)) {
          let virtualSectionId: string | null = null;
          if (c.recurringSection) {
            // recurringSection auto-creates a named section per date
            const match = sections.find(s => s.date === selectedDate && s.title === c.recurringSection!.title);
            virtualSectionId = match ? match.id : `rs_${c.id}_${selectedDate}`;
          } else if (c.sectionId) {
            // Find a section on selectedDate with the same title as the parent section
            const parentSection = sections.find(s => s.id === c.sectionId);
            if (parentSection) {
              const sameOnDate = sections.find(s => s.date === selectedDate && s.title === parentSection.title);
              virtualSectionId = sameOnDate ? sameOnDate.id : null;
            }
          }
          virtualChores.push({ ...c, dueDate: selectedDate, due: selectedDate, _isVirtual: true, sectionId: virtualSectionId });
        }
      }
    }

    let combined = [...dayChores, ...virtualChores];

    // Search
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      combined = combined.filter(c => c.title.toLowerCase().includes(q) || (c.assignee?.toLowerCase().includes(q) ?? false));
    }

    // Filter
    combined = applyFilter(combined, filter);

    // Sort
    return activeSort ? applySort(combined, activeSort) : combined.sort((a, b) => (a.priorityIndex || 0) - (b.priorityIndex || 0));
  }, [choresByDateMap, chores, sections, selectedDate, scope, currentUser, searchQuery, activeSort, filter]);

  // Keep ref in sync so bulk handlers (defined earlier) can access current visible chores incl. virtuals
  filteredSortedChoresRef.current = filteredSortedChores;

  // Clear the manually-deleted rs_ section set whenever the user navigates to a different date
  const prevSelectedDateRef = useRef<string>(selectedDate);
  useLayoutEffect(() => {
    if (prevSelectedDateRef.current !== selectedDate) {
      manuallyDeletedRsSections.current.clear();
      prevSelectedDateRef.current = selectedDate;
    }
  }, [selectedDate]);

  // Auto-create recurringSection sections on selectedDate for any recurring chore that has one.
  // useLayoutEffect fires before paint to prevent flash of uncategorized chore.
  useLayoutEffect(() => {
    const choresWithRecurringSection = chores.filter(c => c.isRecurring && c.recurringSection && c.recurrenceRule);
    for (const c of choresWithRecurringSection) {
      // Only create a section if this chore actually occurs on selectedDate
      const occursToday = c.dueDate === selectedDate
        || (c.dueDate < selectedDate
            && recurringOccursOn(c.dueDate, c.recurrenceRule!, selectedDate)
            && !(c.deletedDates?.includes(selectedDate))
            && !(c.deletedFromDate && selectedDate >= c.deletedFromDate));
      if (!occursToday) continue;

      const { title, color } = c.recurringSection!;
      const newId = `rs_${c.id}_${selectedDate}`;

      // Skip if user explicitly deleted this section on this date
      if (manuallyDeletedRsSections.current.has(newId)) continue;

      let sectionExists = sections.find(s => (s.date === selectedDate && s.title === title) || s.id === newId);
      if (!sectionExists) {
        addSection({ id: newId, title, themeColor: color, isCollapsed: false, date: selectedDate, priorityIndex: sections.filter(s => s.date === selectedDate).length });
        sectionExists = { id: newId, title, themeColor: color, isCollapsed: false, date: selectedDate, priorityIndex: 0 };
      }
      // If the anchor chore's dueDate is selectedDate (first occurrence), assign it to the auto-created section
      if (c.dueDate === selectedDate && c.sectionId !== sectionExists.id) {
        updateChore(c.id, { sectionId: sectionExists.id });
      }
    }
  }, [chores, selectedDate, sections, addSection, updateChore]);

  // #GoTo: pendingScrollId is passed to TodayChoreList which scrolls internally

  const handleToggleSection = useCallback((id: string) => {
    const section = sections.find(s => s.id === id);
    if (section) {
      updateSection(id, { isCollapsed: !section.isCollapsed });
    }
  }, [sections, updateSection]);

  const handleDeleteChore = useCallback((id: string) => {
    if (authUser) {
      Alert.alert('Archive this chore?', 'Completion and points history will be preserved.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', onPress: () => { void archiveProductionChore(id); } },
      ]);
      return;
    }
    const chore = chores.find(c => c.id === id);
    if (!chore) return;

    const doSingleDelete = () => {
      deleteChore(id, chore.isRecurring ? 'instance' : undefined);
      startUndoTimer({ choreId: id, title: chore.title, action: 'delete', originalChore: chore });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    };

    const doInstanceDelete = () => {
      // EXDATE approach: use selectedDate (the currently viewed date, which may differ from the
      // base chore's dueDate when acting on a virtual projection onto a future date)
      addChoreDeletedDate(id, selectedDate);
      startUndoTimer({ choreId: id, title: chore.title, action: 'delete-instance', originalChore: chore, deletedDate: selectedDate });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    };

    if (chore.isRecurring) {
      Alert.alert(
        'Delete Recurring Chore',
        `"${chore.title}" repeats. What would you like to delete?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'This instance only', onPress: doInstanceDelete },
          {
            text: 'All future instances',
            style: 'destructive',
            onPress: () => {
              const groupId = chore.recurringGroupId;
              const fromDate = selectedDate;
              const affectedChores = groupId
                ? allChores.filter(c => c.recurringGroupId === groupId && c.dueDate >= fromDate && !c.deletedAt)
                : [chore];
              if (groupId) {
                softDeleteChoresByGroup(groupId, fromDate);
                // If the parent chore's dueDate is before fromDate, it won't be caught by the
                // group soft-delete (which filters dueDate >= fromDate). Set deletedFromDate on
                // the parent so virtual projections on/after fromDate are suppressed.
                if (chore.dueDate < fromDate) {
                  updateChore(id, { deletedFromDate: fromDate });
                }
              } else {
                deleteChore(id, 'series');
              }
              startUndoTimer({ choreId: '__bulk__', title: `"${chore.title}" series`, action: 'bulk-delete', originalChores: affectedChores });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            },
          },
        ]
      );
      return;
    }

    doSingleDelete();
  }, [chores, allChores, selectedDate, deleteChore, addChoreDeletedDate, softDeleteChoresByGroup, updateChore]);

  const handleViewDeleted = useCallback(() => {
    router.push('/settings/chore-history?tab=deleted');
  }, [router]);

  const handleDeferChore = useCallback((id: string) => {
    const chore = chores.find(c => c.id === id);
    if (!chore) return;
    setDeferTarget({ id, title: chore.title, sourceDateStr: chore.dueDate });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [chores]);

  const handleDeferTo = useCallback((id: string, dateStr: string, isVirtualDefer?: boolean, virtualOccurrenceDate?: string, bulkRecurringMode?: 'reset' | 'instance') => {
    if (authUser) {
      void Promise.all(id.split(',').map(choreId => updateProductionChore(choreId, { dueDate: dateStr })));
      return;
    }
    // Bulk defer: id may be comma-joined
    const ids = id.split(',');
    if (ids.length > 1) {
      const snapshot = chores.filter(c => ids.includes(c.id));
      const destSections = sections.filter(s => s.date === dateStr);
      const sectionIdCache: Record<string, string | null> = {};
      snapshot.forEach(c => {
        let targetSectionId: string | null = null;
        if (c.sectionId) {
          if (c.sectionId in sectionIdCache) {
            targetSectionId = sectionIdCache[c.sectionId];
          } else {
            const sourceSection = sections.find(s => s.id === c.sectionId);
            if (sourceSection) {
              const existingOnDest = destSections.find(s => s.title === sourceSection.title);
              if (existingOnDest) {
                targetSectionId = existingOnDest.id;
              } else {
                const newSectionId = `s_${Date.now()}_${c.sectionId}`;
                addSection({ id: newSectionId, title: sourceSection.title, themeColor: sourceSection.themeColor, isCollapsed: false, date: dateStr, priorityIndex: destSections.length });
                destSections.push({ id: newSectionId, title: sourceSection.title, themeColor: sourceSection.themeColor, isCollapsed: false, date: dateStr, priorityIndex: destSections.length });
                targetSectionId = newSectionId;
              }
            }
            sectionIdCache[c.sectionId] = targetSectionId;
          }
        }
        const anchorId = c.id; // for virtuals this is the anchor record's id
        const occurrenceDate = c.dueDate; // for virtuals dueDate = selectedDate (set in filteredSortedChores)
        if (c._isVirtual && c.isRecurring && c.recurrenceRule) {
          if (bulkRecurringMode === 'reset') {
            // Freeze anchor from this occurrence onward, spawn new series at dateStr
            updateChore(anchorId, { deletedFromDate: occurrenceDate });
            const newId = `${anchorId}_reset_${dateStr}`;
            if (!allChores.some(existing => existing.id === newId)) {
              const newGroupId = `rg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
              addChore({ ...c, id: newId, dueDate: dateStr, due: dateStr, isOverdue: false, wasOverdue: undefined, isOverdueRecovery: undefined, recurringGroupId: newGroupId, seriesStartDate: dateStr, nextRecurringDate: computeNextDate(dateStr, c.recurrenceRule, 1), deletedFromDate: undefined, deletedDates: undefined, _isVirtual: false, sectionId: targetSectionId, priorityIndex: c.priorityIndex + 100, status: 'pending' } as any);
            }
          } else {
            // Instance only: EXDATE this occurrence on the anchor, spawn one-off at dateStr
            addChoreDeletedDate(anchorId, occurrenceDate);
            const newId = `${anchorId}_inst_${dateStr}`;
            if (!allChores.some(existing => existing.id === newId)) {
              addChore({ ...c, id: newId, dueDate: dateStr, due: dateStr, isRecurring: false, recurrenceRule: undefined, recurringGroupId: undefined, isOverdue: false, deletedFromDate: undefined, deletedDates: undefined, _isVirtual: false, sectionId: targetSectionId, priorityIndex: c.priorityIndex + 100, status: 'pending' } as any);
            }
          }
        } else if (!c._isVirtual && c.isRecurring && c.recurrenceRule) {
          if (bulkRecurringMode === 'reset') {
            // Real record reset: freeze from dueDate, spawn new series at dateStr
            updateChore(anchorId, { deletedFromDate: occurrenceDate });
            const newId = `${anchorId}_reset_${dateStr}`;
            if (!allChores.some(existing => existing.id === newId)) {
              const newGroupId = `rg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
              addChore({ ...c, id: newId, dueDate: dateStr, due: dateStr, isOverdue: false, wasOverdue: undefined, isOverdueRecovery: undefined, recurringGroupId: newGroupId, seriesStartDate: dateStr, nextRecurringDate: computeNextDate(dateStr, c.recurrenceRule, 1), deletedFromDate: undefined, deletedDates: undefined, sectionId: targetSectionId, priorityIndex: c.priorityIndex + 100, status: 'pending' } as any);
            }
          } else {
            // Instance only for real recurring record: EXDATE its dueDate, spawn one-off at dateStr
            addChoreDeletedDate(anchorId, occurrenceDate);
            const newId = `${anchorId}_inst_${dateStr}`;
            if (!allChores.some(existing => existing.id === newId)) {
              addChore({ ...c, id: newId, dueDate: dateStr, due: dateStr, isRecurring: false, recurrenceRule: undefined, recurringGroupId: undefined, isOverdue: false, deletedFromDate: undefined, deletedDates: undefined, sectionId: targetSectionId, priorityIndex: c.priorityIndex + 100, status: 'pending' } as any);
            }
          }
        } else {
          // Non-recurring: just move dueDate
          updateChore(anchorId, { dueDate: dateStr, isOverdue: false, priorityIndex: c.priorityIndex + 100, sectionId: targetSectionId });
        }
      });
      startUndoTimer({ choreId: '__bulk__', title: `${snapshot.length} chore${snapshot.length > 1 ? 's' : ''} rescheduled`, action: 'bulk-defer', originalChores: snapshot });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    const chore = chores.find(c => c.id === id);
    if (!chore) return;

    // Helper: find or create a matching section on targetDate, returns sectionId or null
    const resolveTargetSection = (targetDate: string): string | null => {
      if (!chore.sectionId) return null;
      const sourceSection = sections.find(s => s.id === chore.sectionId);
      if (!sourceSection) return null;
      const destSections = sections.filter(s => s.date === targetDate);
      const existing = destSections.find(s => s.title === sourceSection.title);
      if (existing) return existing.id;
      const newId = `s_${Date.now()}`;
      addSection({ id: newId, title: sourceSection.title, themeColor: sourceSection.themeColor, isCollapsed: false, date: targetDate, priorityIndex: destSections.length });
      return newId;
    };

    // Helper: create a one-off copy of a recurring chore on targetDate, suppressing the sourceOccurrence
    const doInstanceOnlyDefer = (sourceOccurrence: string) => {
      addChoreDeletedDate(id, sourceOccurrence);
      const copyId = `${id}_deferred_${dateStr}`;
      addChore({
        ...chore,
        id: copyId,
        dueDate: dateStr,
        due: dateStr,
        isRecurring: false,
        recurrenceRule: undefined,
        recurringGroupId: undefined,
        _isVirtual: false,
        sectionId: resolveTargetSection(dateStr),
        status: 'pending',
        isOverdue: false,
        priorityIndex: chore.priorityIndex + 100,
      });
      startUndoTimer({ choreId: copyId, title: chore.title, action: 'defer', originalChore: chore });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    // Helper: reset the series anchor to dateStr (shift schedule forward from this point)
    // Strategy: freeze the existing record at its current anchor via deletedFromDate (so past
    // occurrences and completed entries are preserved), then spawn a new record starting at dateStr.
    const doResetSchedule = (sourceOccurrence?: string) => {
      const cutoff = sourceOccurrence ?? chore.dueDate;
      // Freeze existing record: suppress all projections from cutoff onward
      updateChore(id, { deletedFromDate: cutoff });
      // Guard against duplicate spawns (e.g. double-tap)
      const newId = `${id}_reset_${dateStr}`;
      if (allChores.some(c => c.id === newId)) return;
      // Spawn new series starting at dateStr
      const newGroupId = `rg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      addChore({
        ...chore,
        id: newId,
        dueDate: dateStr,
        due: dateStr,
        isOverdue: false,
        wasOverdue: undefined,
        isOverdueRecovery: undefined,
        recurringGroupId: newGroupId,
        seriesStartDate: dateStr,
        nextRecurringDate: chore.recurrenceRule ? computeNextDate(dateStr, chore.recurrenceRule, 1) : undefined,
        deletedFromDate: undefined,
        deletedDates: undefined,
        sectionId: resolveTargetSection(dateStr),
        priorityIndex: chore.priorityIndex + 100,
        status: 'pending',
      } as any);
      startUndoTimer({ choreId: newId, title: chore.title, action: 'defer', originalChore: chore });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    if (chore.isRecurring) {
      const occurrenceDate = (isVirtualDefer && virtualOccurrenceDate) ? virtualOccurrenceDate : chore.dueDate;
      // If bulkRecurringMode is already set (user already answered the alert in handleBulkDefer), skip the second alert
      if (bulkRecurringMode === 'reset') {
        doResetSchedule(occurrenceDate);
        return;
      }
      if (bulkRecurringMode === 'instance') {
        doInstanceOnlyDefer(occurrenceDate);
        return;
      }
      Alert.alert(
        'Reschedule Recurring Chore',
        `"${chore.title}" repeats. How would you like to reschedule it?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'This instance only',
            onPress: () => doInstanceOnlyDefer(occurrenceDate),
          },
          {
            text: 'Reset schedule',
            onPress: () => doResetSchedule(occurrenceDate),
          },
        ]
      );
      return;
    }

    // Non-recurring chore: defer directly
    // If this chore was already carrying an overdue badge (wasOverdue or isOverdue), accumulate the additional days
    const isAlreadyOverdue = chore.wasOverdue || chore.isOverdue;
    const extraDays = (() => {
      const base = parseLocalDate(getTodayStr());
      const target = parseLocalDate(dateStr);
      return Math.max(0, Math.floor((target.getTime() - base.getTime()) / 86400000));
    })();
    // baseOverdueDays: locked on first reschedule, used for all subsequent accumulations
    const baseOverdue = chore.baseOverdueDays ?? chore.overdueDays ?? 0;
    const updatedOverdueDays = isAlreadyOverdue ? baseOverdue + extraDays : undefined;
    updateChore(id, {
      dueDate: dateStr,
      isOverdue: false,
      wasOverdue: isAlreadyOverdue ? true : undefined,
      overdueDays: updatedOverdueDays ?? chore.overdueDays,
      baseOverdueDays: isAlreadyOverdue ? baseOverdue : undefined,
      isOverdueRecovery: isAlreadyOverdue ? true : chore.isOverdueRecovery,
      priorityIndex: chore.priorityIndex + 100,
      sectionId: resolveTargetSection(dateStr),
    });
    startUndoTimer({ choreId: id, title: chore.title, action: 'defer', originalChore: chore });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [chores, sections, updateChore, addSection, addChoreDeletedDate, addChore, startUndoTimer]);

  const onReorderChores = useCallback((sectionId: string, from: number, to: number) => {
    const sectionChores = chores.filter(c => c.sectionId === sectionId).sort((a, b) => (a.priorityIndex || 0) - (b.priorityIndex || 0));
    const moved = sectionChores[from];
    if (!moved) return;

    const newSectionItems = [...sectionChores];
    newSectionItems.splice(from, 1);
    newSectionItems.splice(to, 0, moved);

    const updated = chores.map(c => {
      if (c.sectionId === sectionId) {
        const nidx = newSectionItems.findIndex(ni => ni.id === c.id);
        return { ...c, priorityIndex: nidx };
      }
      return c;
    });
    setChores(updated);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [chores, setChores]);

  const onMoveChoreBetweenSections = useCallback((choreId: string, fromSectionId: string, toSectionId: string, toIndex: number) => {
    const chore = chores.find(c => c.id === choreId);
    if (!chore) return;

    updateChore(choreId, { sectionId: toSectionId });

    // Re-index destination section
    const others = chores.filter(c => c.id !== choreId && c.sectionId === toSectionId).sort((a, b) => (a.priorityIndex || 0) - (b.priorityIndex || 0));
    others.splice(toIndex, 0, { ...chore, sectionId: toSectionId });
    others.forEach((c, idx) => updateChore(c.id, { priorityIndex: idx }));

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [chores, updateChore]);

  const handleAddToToday = useCallback((id: string) => {
    const chore = chores.find(c => c.id === id);
    if (!chore) return;
    setOverdueExpanded(false);

    if (chore.isRecurring && chore.nextRecurringDate === getTodayStr()) {
      // If it's recurring today, it's already due today.
      // In a real app we might scroll to the today instance, but for now we just block.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const days = chore.overdueDays ?? Math.ceil((new Date().getTime() - new Date(chore.dueDate + 'T00:00:00').getTime()) / 86400000);
    updateChore(id, {
      dueDate: getTodayStr(),
      isOverdue: false,
      wasOverdue: true,
      overdueDays: days > 0 ? days : undefined,
      isOverdueRecovery: true, // Tag it as a recovery task
      sectionId: null, // Default to Uncategorized
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [chores, updateChore, setOverdueExpanded]);

  const handleGoToDate = useCallback((dateStr: string, choreId: string) => {
    startTransition(() => setSelectedDate(dateStr));
    setCalDate(parseLocalDate(dateStr));
    hudRef.current?.scrollToDate(dateStr);
    setPendingScrollId(choreId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [setSelectedDate, setCalDate]);

  const handleGoToLinked = useCallback((chore: Chore) => {
    setOverdueExpanded(false);
    if (!chore.isRecurring || !chore.recurrenceRule) {
      // Non-recurring: navigate directly to its date
      handleGoToDate(chore.dueDate, chore.id);
      return;
    }

    const today = getTodayStr();

    // 1. Check if there's a real persisted pending future/today instance in the same series
    if (chore.recurringGroupId) {
      const realFuture = chores
        .filter(c =>
          c.recurringGroupId === chore.recurringGroupId &&
          c.dueDate >= today &&
          c.status !== 'completed' &&
          !c.deletedAt
        )
        .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))[0];
      if (realFuture) {
        handleGoToDate(realFuture.dueDate, realFuture.id);
        return;
      }
    }

    // 2. Compute next virtual occurrence anchored on the series start date.
    //    Must use fillOccurrencesInWindow from seriesStartDate (not yesterday) so that
    //    interval-based rules (Every 2 Weeks, Every Month, etc.) stay phase-correct.
    try {
      const seriesAnchor = chore.seriesStartDate ?? chore.dueDate;
      const windowEnd = (() => {
        const d = parseLocalDate(today);
        d.setFullYear(d.getFullYear() + 2);
        return getLocalFormattedDate(d);
      })();
      const acc: Record<string, boolean> = {};
      fillOccurrencesInWindow(seriesAnchor, chore.recurrenceRule, today, windowEnd, acc);
      const nextDate = Object.keys(acc).filter(d => d >= today).sort()[0];
      if (nextDate) {
        handleGoToDate(nextDate, chore.id);
        return;
      }
    } catch { /* rule may be exhausted or malformed */ }

    // 3. Rule exhausted or no future occurrence — navigate to today
    handleGoToDate(today, chore.id);
  }, [chores, handleGoToDate, setOverdueExpanded]);

  const handleCompleteOnBehalf = useCallback((id: string) => {
    if (authUser) {
      void submitProductionCompletion(id);
      return;
    }
    const chore = chores.find(c => c.id === id);
    if (!chore) return;

    // Guard: already completed — no double points
    if (chore.status === 'completed') return;

    let spawnedId: string | undefined;

    // 1. Mark current as completed
    updateChore(id, { status: 'completed' as const, completedBy: currentUser, completedAt: new Date().toISOString() });

    // 2. Clear missed streaks + overdue badges on all future instances of the same series
    // when this chore was carrying an overdue/wasOverdue badge (recovery or original overdue)
    let clearedFutureChores: Chore[] = [];
    if ((chore.isOverdueRecovery || chore.wasOverdue || chore.isOverdue) && chore.recurringGroupId) {
      const today = getTodayStr();
      clearedFutureChores = chores.filter(c =>
        c.recurringGroupId === chore.recurringGroupId && c.id !== id && c.dueDate >= today && c.status !== 'completed'
      );
      clearedFutureChores.forEach(c => {
        updateChore(c.id, { missedStreak: 0, wasOverdue: undefined, overdueDays: undefined, baseOverdueDays: undefined, isOverdueRecovery: undefined });
      });
    }

    // 3. Spawning logic: Only spawn if it's a normal recurring task (not a recovery task)
    // because recovery tasks should stick to their original cycle.
    if (chore.isRecurring && chore.recurrenceRule && !chore.isOverdueRecovery) {
      const seriesStart = chore.seriesStartDate ?? chore.dueDate;
      const occurrenceIndex = seriesStart === chore.dueDate
        ? 1
        : 1 + countOccurrencesBetween(seriesStart, chore.recurrenceRule, chore.dueDate);
      const nextDate = computeNextDate(chore.dueDate, chore.recurrenceRule, occurrenceIndex);
      if (nextDate) {
        spawnedId = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const nextChore: Chore = {
          ...chore,
          id: spawnedId,
          dueDate: nextDate,
          seriesStartDate: seriesStart,
          nextRecurringDate: computeNextDate(nextDate, chore.recurrenceRule, occurrenceIndex + 1),
          status: 'pending',
          isOverdue: false,
          overdueDays: undefined,
          wasOverdue: false,
          isOverdueRecovery: false,
          photoProvided: { before: false, after: false },
          completedBy: null,
          completedAt: null,
          isNudged: false,
        };
        addChore(nextChore);
      }
    }
    // Points notification (same as handleCompleteChore)
    const targetName = chore.assignee || currentUser;
    const targetUser = familyMembers.find(m => m.name === targetName);
    if (targetUser) {
      const isOthers = targetName !== currentUser;
      setPtsNotify({
        points: chore.points,
        prevTotal: targetUser.stats.pointsEarned,
        total: targetUser.stats.pointsEarned + chore.points,
        recipientName: isOthers ? targetName : undefined,
      });
    }
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    startUndoTimer({ choreId: id, title: chore.title, action: 'complete', spawnedId, originalChores: clearedFutureChores.length > 0 ? clearedFutureChores : undefined });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [authUser, chores, currentUser, updateChore, addChore, familyMembers, setPtsNotify, submitProductionCompletion]);

  const handleAssignToMe = useCallback((id: string) => {
    if (authUser) {
      const me = useHuddleStore.getState().familyMembers.find(member => member.authUserId === authUser.id);
      if (me) void updateProductionChore(id, { assignee: me.name, assigned_to: me.id });
      return;
    }
    const me = FAMILY_MEMBERS.find(m => m.name === currentUser);
    if (me) {
      const existing = chores.find(c => c.id === id);
      const wasRandom = !!existing?.randomAssignedRunId;
      updateChore(id, {
        assignee: me.name, avatar: me.avatar, pool: 'Me',
        ...(wasRandom ? { randomAssignedBy: undefined, randomAssignedGameName: undefined, randomAssignedRunId: undefined, randomAssignedOverridden: true } : {}),
      });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [currentUser, chores, updateChore]);

  const handleAssignTo = useCallback((id: string, member: typeof FAMILY_MEMBERS[0]) => {
    if (authUser) {
      const selected = useHuddleStore.getState().familyMembers.find(candidate => candidate === member);
      void updateProductionChore(id, { assignee: member.name, ...(selected?.id ? { assigned_to: selected.id } : {}) });
      return;
    }
    const isMe = member.name === currentUser;
    const existing = chores.find(c => c.id === id);
    const wasRandom = !!existing?.randomAssignedRunId;
    updateChore(id, {
      assignee: member.name,
      avatar: member.avatar,
      pool: (isMe ? 'Me' : member.pool) as 'Me' | 'Kids' | 'Parents',
      ...(wasRandom ? { randomAssignedBy: undefined, randomAssignedGameName: undefined, randomAssignedRunId: undefined, randomAssignedOverridden: true } : {}),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [currentUser, chores, updateChore]);

  const handleReassignSwipe = useCallback((id: string) => {
    const chore = chores.find(c => c.id === id);
    if (chore) { setReassignTargetChore(chore); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }
  }, [chores]);

  const handleToggleOverdue = useCallback(() => {
    setOverdueExpanded(!overdueExpanded);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [overdueExpanded, setOverdueExpanded]);

  const handleToggleCompleted = useCallback(() => {
    setShowCompleted(prev => !prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handlePhotoUpload = useCallback((id: string, slot: 'before' | 'after', uri: string | null) => {
    const chore = chores.find(c => c.id === id);
    if (!chore) return;
    const provided = { ...chore.photoProvided };
    if (slot === 'before') {
      provided.before = uri !== null;
      provided.beforeUri = uri ?? undefined;
    } else {
      provided.after = uri !== null;
      provided.afterUri = uri ?? undefined;
    }
    updateChore(id, { photoProvided: provided });
  }, [chores, updateChore]);

  const handleReassign = useCallback((choreId: string, toSectionId: string | null, newPriority: number) => {
    updateChore(choreId, { sectionId: toSectionId ?? undefined, priorityIndex: newPriority });
  }, [updateChore]);

  const handleEditChore = useCallback((chore: Chore, scope: 'this' | 'all', updates: Partial<Chore>) => {
    if (authUser) {
      void updateProductionChore(chore.id, updates);
      return;
    }
    updateChore(chore.id, updates);
    // If 'all' scope was selected, in a real app we'd update all instances.
    // For now, central store update handles the current instance.
  }, [updateChore]);
  const handleStartEditSection = useCallback((id: string) => {
    setEditingSectionId(id);
  }, []);

  const handleEndEditSection = useCallback(() => {
    setEditingSectionId(null);
  }, []);

  const handleReorderSections = useCallback((from: number, to: number) => {
    const newSections = [...sections];
    const [moved] = newSections.splice(from, 1);
    newSections.splice(to, 0, moved);
    const updated = newSections.map((s, idx) => ({ ...s, priorityIndex: idx }));
    setSections(updated);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [sections, setSections]);

  const handleGoToInstance = useCallback((title: string, targetDate: string) => {
    const isSameDate = targetDate === selectedDate;

    // Find the chore in the full list to get its ID and section
    const instance = chores.find(c => c.title.toLowerCase() === title.toLowerCase() && c.dueDate === targetDate);

    if (instance) {
      if (!isSameDate) {
        startTransition(() => setSelectedDate(targetDate));
        setCalDate(parseLocalDate(targetDate));
        hudRef.current?.scrollToDate(targetDate);
      }

      if (instance.sectionId) {
        updateSection(instance.sectionId, { isCollapsed: false });
      }

      // Allow state to settle before setting pending scroll
      setTimeout(() => {
        setPendingScrollId(instance.id);
      }, 150);
    }
  }, [chores, selectedDate]);

  // Titles of chores that have an overdue sibling — used to flag recurring today-instances as wasOverdue
  const overdueTitles = useMemo(() => {
    const titles = new Set<string>();
    chores.forEach(c => { if (c.isOverdue && c.missedStreak && c.missedStreak > 0) titles.add(c.title.toLowerCase()); });
    return titles;
  }, [chores]);

  const progressBarNode = useMemo(() => {
    // Always show today's progress — not the selected date's
    const todayStr = getTodayStr();
    const todayChores = chores.filter(c => c.dueDate === todayStr && (scope === 'All' || c.assignee === currentUser));
    if (todayChores.length === 0) return null;

    const dayTotalCount = todayChores.length;
    const dayDoneCount = todayChores.filter(c => c.status === 'completed').length;
    const dayTotalMinutes = todayChores.reduce((acc, c) => acc + c.estMinutes, 0);

    // Build segments ONLY for completed chores
    const completedStats: Record<string, { count: number; color: string }> = {};
    todayChores.filter(c => c.status === 'completed').forEach(c => {
      const sId = c.sectionId || 'uncategorized';
      if (!completedStats[sId]) {
        const s = sections.find(sec => sec.id === sId);
        completedStats[sId] = { count: 0, color: s?.themeColor || '#CBD5E1' };
      }
      completedStats[sId].count++;
    });

    return (
      <View className="px-6 pt-2 bg-slate-50 dark:bg-zinc-950 pb-3 border-b border-slate-50 dark:border-zinc-900">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2.5">
            <View className="bg-indigo-50/50 border border-indigo-100/50 px-2 py-0.5 rounded-lg flex-row items-center">
              <Clock size={10} color={COLORS.primary} style={{ marginRight: 4 }} /><Text style={{ fontSize: 10, fontWeight: '900', color: COLORS.primary }}>{dayTotalMinutes}m</Text>
            </View>
            <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>Today&apos;s Focus</Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '900', color: dayDoneCount === dayTotalCount ? COLORS.green : '#334155' }}>{dayDoneCount}/{dayTotalCount}</Text>
        </View>
        <View style={{ height: 10, backgroundColor: '#E2E8F0', borderRadius: 5, overflow: 'hidden' }}>
          <View
            style={{
              width: `${(dayDoneCount / dayTotalCount) * 100}%`,
              height: '100%',
              backgroundColor: dayDoneCount === dayTotalCount ? COLORS.green : '#6366F1',
              borderRadius: 5,
              shadowColor: dayDoneCount === dayTotalCount ? COLORS.green : '#6366F1',
              shadowOpacity: 0.3,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 0 }
            }}
          />
        </View>
      </View>
    );
  }, [chores, scope, currentUser, sections]);
  const renderProgressBar = useCallback(() => progressBarNode, [progressBarNode]);

  const overdueSectionNode = useMemo(() => {
    const overdueList = chores
      .filter(c => {
        if (c.status === 'completed' || c.dueDate >= getTodayStr()) return false;
        // Suppress recurring chores whose dueDate falls within an active vacation window
        if (c.isRecurring && vacationMode?.active && c.dueDate >= vacationMode.startDate && c.dueDate <= vacationMode.endDate) return false;
        return true;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()); // Oldest dueDate first = longest overdue on top

    if (overdueList.length === 0) return null;

    const hasChildren = overdueExpanded && overdueList.length > 0;

    return (
      <View style={{ marginTop: 12, marginBottom: hasChildren ? 0 : 12 }}>
        <View style={{
          marginHorizontal: 16,
          backgroundColor: '#E11D48',
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          borderBottomLeftRadius: hasChildren ? 0 : 12,
          borderBottomRightRadius: hasChildren ? 0 : 12,
          borderWidth: 1,
          borderBottomWidth: hasChildren ? 0 : 1,
          borderColor: '#BE123C',
          overflow: 'hidden',
          ...GOLDEN_SHADOW,
        }}>
          <TouchableOpacity
            onPress={handleToggleOverdue}
            activeOpacity={0.8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10 }}
          >
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: 'white' }} />
            <Text style={{ fontSize: 11, fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: 1, flex: 1 }}>Overdue Tasks</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: 'white', marginRight: 4 }}>{overdueList.length}</Text>
            <ChevronDown size={13} color="white" style={{ transform: [{ rotate: overdueExpanded ? '0deg' : '-90deg' }], marginLeft: 2 }} />
          </TouchableOpacity>
        </View>
        {hasChildren && (
          <View style={{ marginHorizontal: 16, backgroundColor: 'white', borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#E2E8F0', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, overflow: 'hidden', marginBottom: 12, maxHeight: 320 }}>
            <ScrollView showsVerticalScrollIndicator={true} nestedScrollEnabled>
              {overdueList.map((c, idx) => {
                const today = getTodayStr();
                const isRecurringToday = c.isRecurring && c.nextRecurringDate === today;
                const isOneTime = !c.isRecurring;

                return (
                  <View key={c.id} style={{ borderBottomWidth: idx < overdueList.length - 1 ? 1 : 0, borderBottomColor: '#F1F5F9' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 12, paddingVertical: 12, gap: 10 }}>
                      {/* Left: title + badges + overdue info */}
                      <View style={{ flex: 1, gap: 5 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#1E293B' }} numberOfLines={1}>{c.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F8FAFC', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                            <Clock size={10} color={c.estMinutes <= 30 ? COLORS.green : c.estMinutes <= 60 ? COLORS.blue : COLORS.orange} />
                            <Text style={{ fontSize: 10, fontWeight: '800', color: c.estMinutes <= 30 ? COLORS.green : c.estMinutes <= 60 ? COLORS.blue : COLORS.orange }}>{c.estMinutes}m</Text>
                          </View>
                          <View style={{ backgroundColor: '#F8FAFC', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8' }}>{c.points}pt</Text>
                          </View>
                          {c.assignee && (
                            <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.primary }}>{c.assignee === currentUser ? 'Me' : c.assignee}</Text>
                            </View>
                          )}
                          {c.isRecurring && (
                            <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.green }}>Recurring</Text>
                            </View>
                          )}
                          {c.photoRequired && (
                            <View style={{ backgroundColor: '#FFF7ED', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#EA580C' }}>Photo</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#E11D48' }}>
                          {isOneTime
                            ? `${c.overdueDays ?? Math.ceil((new Date().getTime() - new Date(c.dueDate + 'T00:00:00').getTime()) / 86400000)}d missed`
                            : (() => {
                                const streak = `Missed ${c.missedStreak ?? 1}×`;
                                if (!c.nextRecurringDate) return streak;
                                const tomorrow = getLocalFormattedDate(new Date(parseLocalDate(today).getTime() + 86400000));
                                const label = c.nextRecurringDate === today ? 'Today' : c.nextRecurringDate === tomorrow ? 'Tomorrow' : parseLocalDate(c.nextRecurringDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                return `${streak} • Next: ${label}`;
                              })()}
                        </Text>
                      </View>
                      {/* Right: action buttons (Horizontal stacking) */}
                      <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'center' }}>
                        <TouchableOpacity
                          onPress={() => handleAddToToday(c.id)}
                          disabled={isRecurringToday}
                          style={{
                            backgroundColor: isRecurringToday ? '#F1F5F9' : '#8B5CF6',
                            borderRadius: 12,
                            width: 44,
                            height: 44,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Plus size={20} color={isRecurringToday ? '#CBD5E1' : 'white'} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleGoToLinked(c)}
                          disabled={isOneTime}
                          style={{
                            backgroundColor: isOneTime ? '#F1F5F9' : '#475569',
                            borderRadius: 12,
                            width: 44,
                            height: 44,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <ChevronRight size={20} color={isOneTime ? '#CBD5E1' : 'white'} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
    );
  }, [chores, overdueExpanded, handleToggleOverdue, handleCompleteChore, handleDeleteChore, handleDeferChore, handleAddToToday, handleGoToLinked]);
  const renderOverdueSection = useCallback(() => overdueSectionNode, [overdueSectionNode]);

  const listHeaderNode = useMemo(() => (
    <View collapsable={false}>
      {vacationMode?.active && (() => {
        const isOngoing = getTodayStr() >= vacationMode.startDate && getTodayStr() <= vacationMode.endDate;
        if (!isOngoing) return null;
        return (
          <View style={{ marginHorizontal: 16, marginTop: 10, backgroundColor: '#EFF6FF', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#BFDBFE' }}>
            <Text style={{ fontSize: 20 }}>🏖️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: '#1D4ED8' }}>Vacation Mode Active</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#3B82F6' }}>Recurring chores are paused until {vacationMode.endDate}</Text>
            </View>
            <TouchableOpacity onPress={() => setVacationMode(null)} style={{ padding: 6 }}>
              <X size={16} color="#3B82F6" />
            </TouchableOpacity>
          </View>
        );
      })()}
      <View style={{ height: 8 }} />
    </View>
  ), [vacationMode, setVacationMode]);
  const renderHeader = useCallback(() => listHeaderNode, [listHeaderNode]);

  const dayCompleted = useMemo(() =>
    chores.filter(c => c.dueDate === selectedDate && c.status === 'completed' && (scope === 'All' || c.assignee === currentUser)),
    [chores, selectedDate, scope, currentUser]);

  const listFooterNode = useMemo(() => {
    const daySections = sections.filter(s => s.date === selectedDate);
    const isEmpty = filteredSortedChores.length === 0;

    const hasActiveSearch = searchQuery.trim().length > 0;
    const hasActiveFilter = filterActiveCount(filter) > 0;

    return (
      <View collapsable={false} className="pb-[160px]">
        {isEmpty && (() => {
          // HAR-57: search/filter empty state
          if (hasActiveSearch || hasActiveFilter) {
            let heading = '';
            let subtext = '';
            let clearLabel = '';
            let onClear: (() => void) | null = null;
            if (hasActiveSearch && hasActiveFilter) {
              heading = `No results for "${searchQuery}" with current filters`;
              subtext = '';
              clearLabel = 'Clear Filters';
              onClear = () => { setFilter(DEFAULT_FILTER); };
            } else if (hasActiveSearch) {
              heading = `No results for "${searchQuery}"`;
              subtext = '';
              clearLabel = 'Clear Search';
              onClear = () => { setSearchQuery(''); };
            } else {
              heading = 'No chores match this filter';
              subtext = '';
              clearLabel = 'Clear Filter';
              onClear = () => { setFilter(DEFAULT_FILTER); };
            }
            return (
              <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 }}>
                <Text style={{ fontSize: 36 }}>🔍</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#334155', marginTop: 12, textAlign: 'center' }}>{heading}</Text>
                {subtext ? <Text style={{ fontSize: 13, color: '#94A3B8', marginTop: 6, textAlign: 'center' }}>{subtext}</Text> : null}
                {onClear && (
                  <TouchableOpacity onPress={() => { onClear!(); Haptics.selectionAsync(); }} style={{ marginTop: 14 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.primary }}>{clearLabel}</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }
          // default empty state
          return (
            <View style={{ alignItems: 'center', paddingVertical: 64, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 52 }}>🎉</Text>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A', marginTop: 16, textAlign: 'center' }}>All clear!</Text>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#94A3B8', marginTop: 8, textAlign: 'center' }}>
                {selectedDate === getTodayStr() ? 'Nothing due today. Enjoy the break!' : 'Nothing scheduled for this day.'}
              </Text>
              <TouchableOpacity onPress={() => { setIsAddingChore(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={{ marginTop: 24, backgroundColor: '#EEF2FF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Plus size={16} color={COLORS.primary} />
                <Text style={{ fontSize: 13, fontWeight: '900', color: COLORS.primary }}>Add a Chore</Text>
              </TouchableOpacity>
            </View>
          );
        })()}

        {dayCompleted.length > 0 && (
          <View className="px-5 mt-2 mb-2">
            <TouchableOpacity onPress={handleToggleCompleted} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: '#F1F5F9' }} />
              <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 12 }}>
                {showCompleted ? 'Hide' : 'Show'} completed ({dayCompleted.length})
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#F1F5F9' }} />
            </TouchableOpacity>
            {showCompleted && (
              <CompletedChoreList
                chores={dayCompleted}
                onRevert={handleRevertComplete}
                onDelete={handleDeleteChore}
                onDefer={handleDeferChore}
                onEdit={setEditingChore}
                currentUser={currentUser}
                highlightedId={highlightedId}
                familyMembers={familyMembers}
                onPointsNotify={(pts, total) => {
                  const user = familyMembers.find(m => m.name === currentUser);
                  setPtsNotify({ points: pts, prevTotal: user?.stats.pointsEarned || 0, total });
                }}
              />
            )}
          </View>
        )}
        {deletedCount > 0 && (
          <TouchableOpacity
            onPress={handleViewDeleted}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 }}
          >
            <Trash2 size={13} color="#94A3B8" />
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8' }}>
              {deletedCount} deleted item{deletedCount !== 1 ? 's' : ''} in trash
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [dayCompleted, sections, selectedDate, scope, searchQuery, filter, chores, deletedCount, handleToggleCompleted, showCompleted, handleRevertComplete, filteredSortedChores, handleDeferChore, handleDeleteChore, setEditingChore, currentUser, highlightedId, setIsAddingChore, familyMembers, setPtsNotify, setSearchQuery, setFilter, handleViewDeleted]);
  const renderFooter = useCallback(() => listFooterNode, [listFooterNode]);

  const handleDeferChoreInList = useCallback((id: string) => {
    const c = filteredSortedChores.find(ch => ch.id === id) ?? chores.find(ch => ch.id === id);
    const isVirtual = !!c?._isVirtual;
    setDeferTarget({
      id,
      title: c?.title || '',
      sourceDateStr: isVirtual ? selectedDate : c?.dueDate,
      isVirtual,
      virtualDate: isVirtual ? selectedDate : undefined,
    });
  }, [chores, filteredSortedChores, selectedDate]);

  const handleReorderDaySections = useCallback((fromIdx: number, toIdx: number) => {
    const ds = [...sections.filter(s => s.date === selectedDate)].sort((a, b) => (a.priorityIndex || 0) - (b.priorityIndex || 0));
    const moved = ds[fromIdx]; ds.splice(fromIdx, 1); ds.splice(toIdx, 0, moved);
    ds.forEach((s, i) => updateSection(s.id, { priorityIndex: i }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [sections, selectedDate, updateSection]);

  const handleEditSectionCallback = useCallback((id: string, title: string, color: string) => {
    updateSection(id, { title, themeColor: color });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [updateSection]);

  const handleDeleteSectionCallback = useCallback((id: string, dismiss?: () => void) => {
    const doDelete = () => {
      // For rs_ sections: record the deletion so useLayoutEffect won't re-create it this session
      if (id.startsWith('rs_')) {
        manuallyDeletedRsSections.current.add(id);
      }
      chores.filter(c => c.sectionId === id).forEach(c => updateChore(c.id, { sectionId: null }));
      deleteSection(id);
      dismiss?.();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };
    // rs_ sections are auto-created by recurring chores — warn user before deleting
    if (id.startsWith('rs_')) {
      const section = sections.find(s => s.id === id);
      // Find the originating recurring chore name from the ID pattern rs_<choreId>_<date>
      const choreId = id.replace(/^rs_/, '').replace(/_\d{4}-\d{2}-\d{2}$/, '');
      const originChore = chores.find(c => c.id === choreId);
      const choreName = originChore?.title ?? section?.title ?? 'a recurring chore';
      Alert.alert(
        'Auto-Created Section',
        `This section was created automatically by the recurring chore "${choreName}". Deleting it only affects today — it will reappear on future dates.\n\nContinue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
      return;
    }
    doDelete();
  }, [chores, sections, updateChore, deleteSection]);

  const handleScrolledToChore = useCallback(() => {
    if (pendingScrollId) {
      setHighlightedId(pendingScrollId);
      setTimeout(() => setHighlightedId(null), 3000);
    }
    setPendingScrollId(null);
  }, [pendingScrollId]);

  const handleScrollBeginDrag = useCallback(() => {
    if (isCalExpanded) setIsCalExpanded(false);
  }, [isCalExpanded]);

  const currentMonthLabel = useMemo(() => {
    const d = parseLocalDate(selectedDate);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }, [selectedDate]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-black" edges={['top']}>
        {/* #12: pt-8 → pt-2 (SafeAreaView already handles status bar inset) */}
        <View className="flex-row items-center justify-between px-4 bg-slate-50 dark:bg-zinc-950 z-20 pt-2 pb-1.5">
          <View style={{ width: 85, height: 36, justifyContent: 'center' }}>
            <Text className="text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-tighter" numberOfLines={1}>
              {scrollMonthLabel ?? currentMonthLabel}
            </Text>
          </View>

          <ScopeSegmentedControl scope={scope} setScope={setScope} />

          {/* right side: search + today buttons */}
          <View style={{ width: 85, height: 36 }} className="items-center flex-row justify-end gap-2">
            <TouchableOpacity
              onPress={() => { setIsSearchOpen(!isSearchOpen); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: isSearchOpen ? '#EEF2FF' : '#F1F5F9' }}
            >
              <Search size={16} color={isSearchOpen ? COLORS.primary : '#64748B'} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { startTransition(() => setSelectedDate(getTodayStr())); setCalDate(new Date()); hudRef.current?.scrollToDate(getTodayStr()); setSearchQuery(''); setFilter(DEFAULT_FILTER); setIsSearchOpen(false); setScope('All'); setActiveSort(null); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2FF' }}
            >
              <RotateCcw size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* #23: animated search bar */}
        <Animated.View style={[searchBarAnimStyle, { backgroundColor: '#F8FAFC', paddingHorizontal: 20 }]}>
          <View className="flex-row items-center bg-slate-100 dark:bg-zinc-900 h-11 rounded-2xl px-4">
            <Search size={16} color="#94A3B8" />
            <TextInput
              autoFocus={isSearchOpen}
              placeholder="Search chores..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 ml-3 text-sm text-slate-900 dark:text-white font-medium"
            />
            {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><X size={16} color="#94A3B8" /></TouchableOpacity>}
          </View>
        </Animated.View>

        <PrototypeNotice screen="Chores" />

        <CalendarHUD ref={hudRef} selectedDate={selectedDate} setSelectedDate={(d) => { startTransition(() => { setSelectedDate(d); setScrollMonthLabel(null); }); }} choresByDate={choresByDate} isExpanded={isCalExpanded} setIsExpanded={setIsCalExpanded} calDate={calDate} setCalDate={setCalDate} calMode={calMode} setCalMode={setCalMode} onScrollMonth={setScrollMonthLabel} />

        {renderOverdueSection()}

        {/* Sort / Filter bar */}
        {(() => {
          const activeCount = filterActiveCount(filter);
          const chips: { key: string; label: string }[] = [
            ...filter.assignees.map(a => ({ key: `a:${a}`, label: a })),
            ...(filter.recurring ? [{ key: 'recurring', label: 'Recurring' }] : []),
            ...(filter.photoRequired ? [{ key: 'photoRequired', label: 'Photo' }] : []),
            ...(filter.nudged ? [{ key: 'nudged', label: 'Nudged' }] : []),
            ...(filter.overdue ? [{ key: 'overdue', label: 'Overdue' }] : []),
          ];
          const removeChip = (key: string) => {
            if (key.startsWith('a:')) setFilter(prev => ({ ...prev, assignees: prev.assignees.filter(a => a !== key.slice(2)) }));
            else setFilter(prev => ({ ...prev, [key]: false }));
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          };

          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 6 }}>
              {/* Sort pills — tap to cycle asc→desc→off */}
              {SORT_FIELDS.map(({ field, label }) => {
                const isThis = activeSort?.field === field;
                const dir = isThis ? activeSort!.dir : null;
                return (
                  <TouchableOpacity
                    key={field}
                    onPress={() => { setActiveSort(cycleSort(activeSort, field)); Haptics.selectionAsync(); }}
                    activeOpacity={0.75}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 4,
                      backgroundColor: isThis ? '#EEF2FF' : '#F8FAFC',
                      borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6,
                      borderWidth: 1, borderColor: isThis ? COLORS.primary : '#E2E8F0',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: isThis ? COLORS.primary : '#64748B' }}>{label}</Text>
                    {dir === 'asc' && <ArrowUp size={10} color={COLORS.primary} />}
                    {dir === 'desc' && <ArrowDown size={10} color={COLORS.primary} />}
                    {!dir && <ArrowUpDown size={10} color="#CBD5E1" />}
                  </TouchableOpacity>
                );
              })}

              {/* Active filter chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ flexDirection: 'row', gap: 5 }}>
                {chips.map(chip => (
                  <TouchableOpacity
                    key={chip.key} onPress={() => removeChip(chip.key)} activeOpacity={0.75}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#EEF2FF', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: '#C7D2FE' }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.primary }}>{chip.label}</Text>
                    <X size={9} color={COLORS.primary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Games button */}
              <TouchableOpacity
                onPress={() => { setShowGamePicker(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                activeOpacity={0.75}
                style={{ backgroundColor: '#F5F3FF', borderRadius: 20, padding: 7, borderWidth: 1, borderColor: '#DDD6FE' }}
              >
                <Dices size={14} color="#7C3AED" />
              </TouchableOpacity>
              {/* Filter button */}
              <TouchableOpacity
                onPress={() => { setShowSortFilter(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                activeOpacity={0.75}
                style={{ position: 'relative', backgroundColor: activeCount > 0 ? '#EEF2FF' : '#F8FAFC', borderRadius: 20, padding: 7, borderWidth: 1, borderColor: activeCount > 0 ? COLORS.primary : '#E2E8F0' }}
              >
                <SlidersHorizontal size={14} color={activeCount > 0 ? COLORS.primary : '#94A3B8'} />
                {activeCount > 0 && (
                  <View style={{ position: 'absolute', top: -3, right: -3, width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 8, fontWeight: '900', color: 'white' }}>{activeCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          );
        })()}

        {renderProgressBar()}

        <View style={{ flex: 1 }}>
        {!isReady ? (
          <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16, gap: 10 }}>
            {[1,2,3].map(i => (
              <View key={i} style={{ height: 72, backgroundColor: '#F1F5F9', borderRadius: 16, opacity: 1 - i * 0.15 }} />
            ))}
          </View>
        ) : (<TodayChoreListMemo
          chores={filteredSortedChores}
          sections={(() => {
            if (searchQuery.trim().length > 0) {
              const q = searchQuery.toLowerCase();
              const matchedSectionIds = new Set(filteredSortedChores.map(c => c.sectionId).filter(Boolean));
              return dateSections.filter(s => matchedSectionIds.has(s.id));
            }
            return dateSections;
          })()}
          onCompleteChore={handleCompleteChore}
          onRevertChore={handleRevertComplete}
          onDeleteChore={handleDeleteChore}
          onDeferChore={handleDeferChoreInList}
          onEditChore={setEditingChore}
          currentUser={currentUser}
          activeSort={activeSort}
          listHeader={listHeaderNode}
          listFooter={listFooterNode}
          onReassign={handleReassign}
          onReorderSections={handleReorderDaySections}
          onEditSection={handleEditSectionCallback}
          onDeleteSection={handleDeleteSectionCallback}
          scrollToChoreId={pendingScrollId}
          highlightedId={highlightedId}
          onScrolledToChore={handleScrolledToChore}
          onScrollBeginDrag={handleScrollBeginDrag}
          onNudgeChore={handleNudge}
          onUploadPhoto={handlePhotoUpload}
          onAssignToMe={handleAssignToMe}
          onAssignTo={handleAssignTo}
          onAddToToday={handleAddToToday}
          onGoToTodayInstance={handleGoToLinked}
          updateSection={updateSection}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          familyMembers={familyMembers}
          onPointsNotify={(pts, total) => {
            const user = familyMembers.find(m => m.name === currentUser);
            setPtsNotify({ points: pts, prevTotal: user?.stats.pointsEarned || 0, total });
          }}
          selectedDate={selectedDate}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          bulkSelectMode={bulkSelectMode}
          selectedChoreIds={selectedChoreIds}
          onEnterBulkSelect={handleEnterBulkSelect}
          onBulkSelectToggle={handleBulkSelectToggle}
          choreCounts={choreCounts}
          onReassignSwipe={handleReassignSwipe}
          onRandomGame={(chore) => { setRandomGameChore(chore); }}
        />)}
        </View>

        {/* #21: static action buttons */}
        <View style={{ position: 'absolute', right: 24, bottom: 100, flexDirection: 'row', gap: 16 }}>
          {/* Collapse / Expand All */}
          {(() => {
            const sectionKeys = [...dateSections.map(s => s.id), 'uncategorized'];
            const collapsedCount = sectionKeys.filter(k => collapsed[k]).length;
            // Consider completed section as "expanded" when showCompleted is true
            const hasCompleted = dayCompleted.length > 0;
            const allExpanded = collapsedCount === 0 && (!hasCompleted || showCompleted);
            const handleToggleAll = () => {
              if (allExpanded) {
                // Collapse all sections + hide completed
                const next: Record<string, boolean> = {};
                sectionKeys.forEach(k => { next[k] = true; });
                setCollapsed(next);
                if (hasCompleted && showCompleted) setShowCompleted(false);
              } else {
                // Expand all sections + show completed
                setCollapsed({});
                if (hasCompleted && !showCompleted) setShowCompleted(true);
              }
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            };
            return (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleToggleAll}
                style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 6 }}
              >
                {allExpanded
                  ? <ChevronsDownUp size={26} color="white" strokeWidth={2.5} />
                  : <ChevronsUpDown size={26} color="white" strokeWidth={2.5} />}
              </TouchableOpacity>
            );
          })()}
          {/* Add Chore */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => { setIsAddingChore(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 6 }}
          >
            <Plus size={30} color="white" strokeWidth={2.5} />
          </TouchableOpacity>

          {/* Add Section */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              const id = `s_${Date.now()}`;
              addSection({ id, title: 'New Section', themeColor: COLORS.primary, isCollapsed: false, date: selectedDate, priorityIndex: sections.length });
              setEditingSectionId(id);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
            style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center', shadowColor: '#8B5CF6', shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 6 }}
          >
            <FolderPlus size={28} color="white" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* #21: quick add chore bottom sheet */}
        {isAddingChore && (
          <QuickAddChorePanel
            key={addChoreKey}
            onClose={() => setIsAddingChore(false)}
            onAdd={async (c) => {
              const saved = await createProductionChore({ ...c, sectionId: c.sectionId ?? null, due: c.dueDate });
              if (!saved) return;
              setIsAddingChore(false);
              // Jump to date if not already there
              if (c.dueDate !== selectedDate) {
                startTransition(() => setSelectedDate(c.dueDate));
                setCalDate(parseLocalDate(c.dueDate));
                hudRef.current?.scrollToDate(c.dueDate);
              }
            }}
            onAddAnother={async (c) => {
              const saved = await createProductionChore({ ...c, sectionId: c.sectionId ?? null, due: c.dueDate });
              if (!saved) return;
              if (c.dueDate !== selectedDate) {
                startTransition(() => setSelectedDate(c.dueDate));
                setCalDate(parseLocalDate(c.dueDate));
                hudRef.current?.scrollToDate(c.dueDate);
              }
              // Remount the panel fresh
              setAddChoreKey(k => k + 1);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }}
            sections={sections}
            selectedDate={selectedDate}
            history={chores}
            onAddSection={addSection}
          />
        )}
        {editingChore && (
          <ChoreEditPanel
            chore={editingChore}
            onClose={() => setEditingChore(null)}
            onSave={(id, updates) => {
              if (authUser) {
                void updateProductionChore(id, updates).then(saved => { if (saved) setEditingChore(null); });
                return;
              }
              updateChore(id, updates);
              setEditingChore(null);
            }}
            onDelete={(id) => {
              handleDeleteChore(id);
              setEditingChore(null);
            }}
            sections={sections}
          />
        )}
        {reassignTargetChore && (
          <AssignChoreSheet
            chore={reassignTargetChore}
            familyMembers={familyMembers}
            currentUser={currentUser ?? ''}
            onAssignToMe={() => { handleAssignToMe(reassignTargetChore.id); setReassignTargetChore(null); }}
            onAssignTo={(member) => { handleAssignTo(reassignTargetChore.id, member); setReassignTargetChore(null); }}
            onClose={() => setReassignTargetChore(null)}
            choreCounts={choreCounts}
            hideAssignToMe={reassignTargetChore.assignee === currentUser}
            onRandomGame={() => { setRandomGameChore(reassignTargetChore); setReassignTargetChore(null); }}
          />
        )}
        {deferTarget && (
          <DeferDatePickerModal
            choreTitle={deferTarget.title}
            sourceDateStr={deferTarget.sourceDateStr}
            onClose={() => setDeferTarget(null)}
            onDefer={(date) => { handleDeferTo(deferTarget.id, date, deferTarget.isVirtual, deferTarget.virtualDate, deferTarget.bulkRecurringMode); setDeferTarget(null); }}
          />
        )}
        {showSortFilter && (
          <SortFilterSheet
            activeSort={activeSort}
            setActiveSort={setActiveSort}
            filter={filter}
            setFilter={setFilter}
            onClose={() => setShowSortFilter(false)}
            currentUser={currentUser}
          />
        )}

        <GamePickerModal visible={showGamePicker} onClose={() => setShowGamePicker(false)} />

        {randomGameChore && (
          <RandomAssignmentModal
            visible={!!randomGameChore}
            chore={randomGameChore}
            onClose={() => setRandomGameChore(null)}
            onAssigned={(memberName, gameId, gameName, runId) => {
              const member = familyMembers.find((m: any) => m.name === memberName);
              updateChore(randomGameChore.id, {
                assignee: memberName,
                avatar: member?.avatar ?? '',
                pool: (member?.name === currentUser ? 'Me' : member?.pool ?? 'Parents') as 'Me' | 'Kids' | 'Parents',
                randomAssignedBy: gameId,
                randomAssignedGameName: gameName,
                randomAssignedRunId: runId,
              });
              setRandomGameChore(null);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }}
          />
        )}

        {undoItem && (
          <UndoBar
            key={undoItem.choreId}
            title={undoItem.action.startsWith('bulk-') ? undoItem.title : `"${undoItem.title}" ${undoItem.action === 'complete' ? 'completed!' : (undoItem.action === 'delete' || undoItem.action === 'delete-instance') ? 'deleted!' : 'rescheduled!'}`}
            onUndo={handleUndo}
            onDismiss={() => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); setUndoItem(null); }}
            showViewDeleted={undoItem.action === 'delete' || undoItem.action === 'delete-instance' || undoItem.action === 'bulk-delete'}
            onViewDeleted={handleViewDeleted}
          />
        )}

        {/* HAR-35: Bulk select action bar — sits above the 85pt tab bar */}
        {bulkSelectMode && (
          <Animated.View
            entering={FadeInDown.duration(150)}
            exiting={FadeOut.duration(150)}
            style={{
              position: 'absolute', bottom: 85, left: 0, right: 0,
              backgroundColor: '#0F172A',
              paddingVertical: 12, paddingHorizontal: 20,
              flexDirection: 'row', alignItems: 'center',
              zIndex: 9999, elevation: 20,
            }}
          >
            <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '800', width: 28, textAlign: 'center' }}>
              {selectedChoreIds.size}
            </Text>
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' }}>
              {selectedDate <= getTodayStr() && (
                <TouchableOpacity onPress={handleBulkComplete} disabled={selectedChoreIds.size === 0} style={{ backgroundColor: '#10B981', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={20} color="white" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleBulkAssign} disabled={selectedChoreIds.size === 0} style={{ backgroundColor: '#8B5CF6', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
                <UserCheck size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleBulkDefer} disabled={selectedChoreIds.size === 0} style={{ backgroundColor: '#3B82F6', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleBulkDelete} disabled={selectedChoreIds.size === 0} style={{ backgroundColor: '#EF4444', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setBulkSelectMode(false); setSelectedChoreIds(new Set()); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={{ backgroundColor: '#475569', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} color="white" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
        {ptsNotify && (
          <PointsEarnedNotification
            points={ptsNotify.points}
            prevTotal={ptsNotify.prevTotal}
            newTotal={ptsNotify.total}
            recipientName={ptsNotify.recipientName}
            onFinished={() => setPtsNotify(null)}
            offsetY={undoItem ? 64 : 0}
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// --- SCOPE CONTROL ---
// --- SORT FILTER SHEET ---
const SortFilterSheet = ({
  activeSort, setActiveSort, filter, setFilter, onClose, currentUser,
}: {
  activeSort: ActiveSort;
  setActiveSort: (s: ActiveSort) => void;
  filter: FilterState;
  setFilter: (f: FilterState) => void;
  onClose: () => void;
  currentUser: string;
}) => {
  const [localSort, setLocalSort] = useState<ActiveSort>(activeSort);
  const [localFilter, setLocalFilter] = useState<FilterState>({ ...filter });
  const [assigneeOpen, setAssigneeOpen] = useState(false);

  const translateY = useSharedValue(600);
  useEffect(() => { translateY.value = withSpring(0, { damping: 28, stiffness: 260, mass: 0.6 }); }, []);
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  const dragGesture = Gesture.Pan()
    .onUpdate(e => { if (e.translationY > 0) translateY.value = e.translationY; })
    .onEnd(e => {
      if (e.translationY > 100 || e.velocityY > 600) {
        translateY.value = withTiming(700, { duration: 220 });
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, { damping: 28, stiffness: 260 });
      }
    });

  const cycleSortLocal = (field: SortField) => {
    setLocalSort(prev => cycleSort(prev, field));
    Haptics.selectionAsync();
  };

  const toggleAssignee = (name: string) => {
    setLocalFilter(prev => ({
      ...prev,
      assignees: prev.assignees.includes(name)
        ? prev.assignees.filter(a => a !== name)
        : [...prev.assignees, name],
    }));
    Haptics.selectionAsync();
  };

  const toggleFlag = (key: keyof Omit<FilterState, 'assignees'>) => {
    setLocalFilter(prev => ({ ...prev, [key]: !prev[key] }));
    Haptics.selectionAsync();
  };

  const handleApply = () => {
    setActiveSort(localSort);
    setFilter(localFilter);
    onClose();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleReset = () => {
    setLocalSort(null);
    setLocalFilter({ ...DEFAULT_FILTER });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const isDirty = localSort !== null || filterActiveCount(localFilter) > 0;
  const selectedAssigneeLabels = localFilter.assignees.length === 0
    ? 'Everyone'
    : localFilter.assignees.join(', ');

  return (
    <Modal visible animationType="none" transparent statusBarTranslucent>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Pressable onPress={onClose} style={{ ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15,23,42,0.5)' }} />
        <GestureDetector gesture={dragGesture}>
          <Animated.View style={[sheetStyle, {
            position: 'absolute', bottom: 0, left: 0, right: 0,
            backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32,
            paddingBottom: 36,
          }]}>
            {/* Handle */}
            <View style={{ alignItems: 'center', paddingTop: 14, paddingBottom: 16 }}>
              <View style={{ width: 36, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 8 }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A' }}>Sort & Filter</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {isDirty && (
                    <TouchableOpacity onPress={handleReset} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEE2E2', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <RotateCcw size={11} color={COLORS.red} />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.red }}>Reset</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={onClose} style={{ backgroundColor: '#F1F5F9', padding: 8, borderRadius: 99 }}>
                    <X size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Sort — tap to cycle asc → desc → off */}
              <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Sort By</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                {SORT_FIELDS.map(({ field, label }) => {
                  const isThis = localSort?.field === field;
                  const dir = isThis ? localSort!.dir : null;
                  return (
                    <TouchableOpacity
                      key={field}
                      onPress={() => cycleSortLocal(field)}
                      activeOpacity={0.75}
                      style={{
                        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
                        paddingVertical: 11, borderRadius: 20, borderWidth: 1.5,
                        backgroundColor: isThis ? COLORS.primary : '#F8FAFC',
                        borderColor: isThis ? COLORS.primary : '#E2E8F0',
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '800', color: isThis ? 'white' : '#475569' }}>{label}</Text>
                      {dir === 'asc' && <ArrowUp size={12} color="white" />}
                      {dir === 'desc' && <ArrowDown size={12} color="white" />}
                      {!dir && <ArrowUpDown size={12} color="#CBD5E1" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={{ fontSize: 10, color: '#94A3B8', textAlign: 'center', marginBottom: 24 }}>Tap once ↑ · twice ↓ · again to clear</Text>

              {/* Filter — Assignee dropdown */}
              <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Assignee</Text>
              <TouchableOpacity
                onPress={() => { setAssigneeOpen(o => !o); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  backgroundColor: localFilter.assignees.length > 0 ? '#EEF2FF' : '#F8FAFC',
                  borderTopLeftRadius: 16, borderTopRightRadius: 16,
                  borderBottomLeftRadius: assigneeOpen ? 0 : 16, borderBottomRightRadius: assigneeOpen ? 0 : 16,
                  paddingVertical: 13, paddingHorizontal: 16,
                  borderWidth: 1.5, borderBottomWidth: assigneeOpen ? 0 : 1.5,
                  borderColor: localFilter.assignees.length > 0 ? COLORS.primary : '#E2E8F0',
                  marginBottom: assigneeOpen ? 0 : 24,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Users size={15} color={localFilter.assignees.length > 0 ? COLORS.primary : '#94A3B8'} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: localFilter.assignees.length > 0 ? COLORS.primary : '#475569' }}>
                    {selectedAssigneeLabels}
                  </Text>
                </View>
                <ChevronDown size={14} color={localFilter.assignees.length > 0 ? COLORS.primary : '#94A3B8'}
                  style={{ transform: [{ rotate: assigneeOpen ? '180deg' : '0deg' }] }}
                />
              </TouchableOpacity>
              {assigneeOpen && (
                <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1.5, borderTopWidth: 0, borderColor: localFilter.assignees.length > 0 ? COLORS.primary : '#E2E8F0', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, marginBottom: 24, overflow: 'hidden' }}>
                  <ScrollView style={{ maxHeight: 200 }} bounces={false} nestedScrollEnabled>
                    {FAMILY_MEMBERS.map((m, i) => {
                      const active = localFilter.assignees.includes(m.name);
                      return (
                        <TouchableOpacity
                          key={m.name}
                          onPress={() => toggleAssignee(m.name)}
                          activeOpacity={0.75}
                          style={{
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                            paddingVertical: 13, paddingHorizontal: 16,
                            backgroundColor: active ? '#EEF2FF' : 'transparent',
                            borderTopWidth: i === 0 ? 0 : 1, borderTopColor: '#F1F5F9',
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Text style={{ fontSize: 20 }}>{m.avatar}</Text>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: active ? COLORS.primary : '#475569' }}>{m.name}</Text>
                          </View>
                          <View style={{
                            width: 20, height: 20, borderRadius: 10, borderWidth: 2,
                            borderColor: active ? COLORS.primary : '#CBD5E1',
                            backgroundColor: active ? COLORS.primary : 'transparent',
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                            {active && <CheckCircle2 size={12} color="white" />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Filter — Flags */}
              <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Show Only</Text>
              <View style={{ gap: 8, marginBottom: 28 }}>
                {([
                  { key: 'recurring' as const, label: 'Recurring tasks', icon: <Repeat2 size={15} color={localFilter.recurring ? COLORS.primary : '#94A3B8'} /> },
                  { key: 'photoRequired' as const, label: 'Photo required', icon: <Camera size={15} color={localFilter.photoRequired ? COLORS.primary : '#94A3B8'} /> },
                  { key: 'nudged' as const, label: 'Nudged', icon: <BellRing size={15} color={localFilter.nudged ? COLORS.primary : '#94A3B8'} /> },
                  { key: 'overdue' as const, label: 'Overdue', icon: <AlertTriangle size={15} color={localFilter.overdue ? '#EF4444' : '#94A3B8'} /> },
                ]).map(row => {
                  const active = localFilter[row.key];
                  return (
                    <TouchableOpacity
                      key={row.key}
                      onPress={() => toggleFlag(row.key)}
                      activeOpacity={0.75}
                      style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        backgroundColor: active ? '#EEF2FF' : '#F8FAFC',
                        borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16,
                        borderWidth: 1.5, borderColor: active ? COLORS.primary : '#F1F5F9',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        {row.icon}
                        <Text style={{ fontSize: 14, fontWeight: '700', color: active ? COLORS.primary : '#475569' }}>{row.label}</Text>
                      </View>
                      <View style={{
                        width: 22, height: 22, borderRadius: 11, borderWidth: 2,
                        borderColor: active ? COLORS.primary : '#CBD5E1',
                        backgroundColor: active ? COLORS.primary : 'transparent',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        {active && <CheckCircle2 size={13} color="white" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Apply */}
            <View style={{ paddingHorizontal: 24, paddingTop: 4 }}>
              <TouchableOpacity
                onPress={handleApply}
                activeOpacity={0.85}
                style={{ backgroundColor: COLORS.primary, borderRadius: 20, paddingVertical: 17, alignItems: 'center' }}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '900' }}>Apply</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
};

// --- SCOPE SEGMENTED CONTROL ---
const ScopeSegmentedControl = ({ scope, setScope }: { scope: string; setScope: (s: string) => void }) => {
  const options = ['All', 'Me'];
  const containerWidth = 120;
  const padding = 4;
  const itemWidth = (containerWidth - padding * 2) / options.length;
  const translateX = useSharedValue(options.indexOf(scope) * itemWidth);
  useEffect(() => { translateX.value = withSpring(options.indexOf(scope) * itemWidth, SPRING_CONFIG); }, [scope]);
  return (
    <View style={{ width: containerWidth }} className="bg-slate-100 dark:bg-zinc-900 rounded-full p-1 h-9 flex-row relative">
      <Animated.View style={[useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] })), { width: itemWidth }]} className="absolute top-1 bottom-1 left-1 bg-white dark:bg-zinc-800 rounded-full shadow-sm" />
      {options.map(s => (
        <TouchableOpacity key={s} activeOpacity={1} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setScope(s); }} className="flex-1 items-center justify-center z-10">
          <Text className="text-[10px] font-black uppercase tracking-tight text-slate-400" style={scope === s ? { color: '#000' } : {}}>{s}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

SectionEditSheet.displayName = 'SectionEditSheet';
SectionHeader.displayName = 'SectionHeader';
RestockStyleChoreItem.displayName = 'RestockStyleChoreItem';
CompletedChoreList.displayName = 'CompletedChoreList';
