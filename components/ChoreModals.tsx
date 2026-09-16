import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, Pressable,
  StyleSheet, Modal, Alert, KeyboardAvoidingView,
  Platform, Dimensions, PanResponder
} from 'react-native';
import { 
  X, CheckCircle2, Clock, Trash2, Camera, 
  ChevronRight, Calendar as CalendarIcon, Users, UserCheck, 
  AlertTriangle, BellRing, Repeat2, Pencil, ChevronDown, ChevronUp,
  RotateCcw, CheckCircle, Smartphone, ChevronLeft
} from 'lucide-react-native';
import Animated, { 
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence, withDelay, interpolateColor, Easing, FadeInDown, FadeOut,
  runOnJS, Layout, interpolate, Extrapolation, useAnimatedProps
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { Colors as COLORS, GOLDEN_SHADOW, GOLDEN_RADIUS, SPRING_CONFIG } from '../constants/theme';
import { Chore, Section } from '../types/chores';
import { getTodayStr, getLocalFormattedDate, getDaysInMonth, getFirstDayOfMonth, parseLocalDate } from '../utils/dateUtils';
import { SECTION_COLORS, MONTHS } from '../constants/mockData';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// --- UNDO / TIMER RING ---
const RING_R = 10;
const RING_CIRC = 2 * Math.PI * RING_R;

export const ChoreUndoRing = ({ duration, color = "white" }: { duration: number; color?: string }) => {
  const progress = useSharedValue(1);
  useEffect(() => {
    progress.value = 1;
    progress.value = withTiming(0, { duration, easing: Easing.linear });
  }, [duration]);

  const animProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRC * (1 - progress.value),
  }) as any);

  return (
    <Svg width={26} height={26} style={{ marginLeft: 10 }}>
      <Circle cx={13} cy={13} r={RING_R} stroke="rgba(255,255,255,0.2)" strokeWidth={2.5} fill="none" />
      <AnimatedCircle
        cx={13} cy={13} r={RING_R}
        stroke={color} strokeWidth={2.5} fill="none"
        strokeDasharray={RING_CIRC}
        animatedProps={animProps}
        strokeLinecap="round"
        transform="rotate(-90 13 13)"
      />
    </Svg>
  );
};

// --- POINTS EARNED NOTIFICATION (Bottom Bar Style) ---
export const PointsEarnedNotification = ({
  points,
  prevTotal,
  newTotal,
  recipientName,
  onFinished,
  offsetY = 0
}: {
  points: number;
  prevTotal: number;
  newTotal: number;
  recipientName?: string;
  onFinished: () => void;
  offsetY?: number;
}) => {
  const isDeduction = points < 0;
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const dragY = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    opacity.value = withTiming(0, { duration: 200 });
    dragY.value = withTiming(80, { duration: 200 }, () => { runOnJS(onFinished)(); });
  };

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    translateY.value = withSpring(0, { damping: 20, stiffness: 150 });
    timerRef.current = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(10, { duration: 300 }, () => { runOnJS(onFinished)(); });
    }, 3200);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [newTotal, onFinished]);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 6,
    onPanResponderMove: (_, g) => { if (g.dy > 0) dragY.value = g.dy; },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 40) { dismiss(); }
      else { dragY.value = withSpring(0, { damping: 20, stiffness: 200 }); }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value - offsetY + dragY.value }],
  }));

  return (
    <View style={{ position: 'absolute', bottom: 108, left: 24, right: 24, zIndex: 999 }} {...panResponder.panHandlers}>
      <Animated.View style={[
        animatedStyle,
        {
          backgroundColor: isDeduction ? '#FFF1F2' : '#1E293B',
          borderRadius: 20,
          paddingVertical: 14,
          paddingHorizontal: 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderWidth: 1,
          borderColor: isDeduction ? '#FECDD3' : 'rgba(255,255,255,0.1)',
          ...GOLDEN_SHADOW,
          shadowOpacity: 0.2,
        }
      ]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isDeduction ? '#E11D48' : '#6366F1', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 14 }}>{isDeduction ? '⚠️' : '✨'}</Text>
          </View>
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '900', color: isDeduction ? '#E11D48' : 'white' }} numberOfLines={1}>
              {isDeduction
                ? `−${Math.abs(points)} pts deducted${recipientName ? ` from ${recipientName}` : ''}`
                : `+${points} pts → ${recipientName ?? 'You'}`}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: isDeduction ? '#FB7185' : '#94A3B8' }}>{prevTotal} ➔ </Text>
              <Text style={{ fontSize: 11, fontWeight: '900', color: isDeduction ? '#BE123C' : '#818CF8' }}>{newTotal}</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

export const InlineCalendar = ({ minDate, onSelect, selected, sourceDate, initialDate }: { minDate: Date; onSelect: (d: Date) => void; selected: Date | null; sourceDate?: Date; initialDate?: Date }) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = COLORS[colorScheme];

  const startView = initialDate ?? minDate;
  const effectiveSelected = selected ?? minDate;

  const [viewYear, setViewYear] = useState(startView.getFullYear());
  const [viewMonth, setViewYearMonth] = useState(startView.getMonth());

  // Keep view in sync when minDate changes (e.g. preset switched) but not when initialDate provided
  useEffect(() => {
    if (!initialDate) {
      setViewYear(minDate.getFullYear());
      setViewYearMonth(minDate.getMonth());
    }
  }, [minDate.getTime()]);

  const days = useMemo(() => {
    const first = getFirstDayOfMonth(viewYear, viewMonth);
    const count = getDaysInMonth(viewYear, viewMonth);
    const arr: (Date | null)[] = [];
    for (let i = 0; i < first; i++) arr.push(null);
    for (let i = 1; i <= count; i++) arr.push(new Date(viewYear, viewMonth, i));
    return arr;
  }, [viewYear, viewMonth]);

  const canGoPrev = viewYear > minDate.getFullYear() || (viewYear === minDate.getFullYear() && viewMonth > minDate.getMonth());

  const prevMonth = () => {
    if (!canGoPrev) return;
    if (viewMonth === 0) { setViewYearMonth(11); setViewYear(viewYear - 1); }
    else setViewYearMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYearMonth(0); setViewYear(viewYear + 1); }
    else setViewYearMonth(viewMonth + 1);
  };

  return (
    <View style={{ backgroundColor: theme.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: theme.border ?? '#F1F5F9', marginTop: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <TouchableOpacity onPress={prevMonth} style={{ opacity: canGoPrev ? 1 : 0.2 }}>
          <ChevronLeft size={20} color={theme.subtext} />
        </TouchableOpacity>
        <Text style={{ fontSize: 14, fontWeight: '800', color: theme.text }}>{MONTHS[viewMonth]} {viewYear}</Text>
        <TouchableOpacity onPress={nextMonth}><ChevronRight size={20} color={theme.subtext} /></TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(l => (
          <View key={l} style={{ width: '14.28%', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ fontSize: 10, fontWeight: '900', color: theme.subtext }}>{l}</Text>
          </View>
        ))}
        {days.map((d, i) => {
          const isSelected = d && effectiveSelected &&
            d.getDate() === effectiveSelected.getDate() &&
            d.getMonth() === effectiveSelected.getMonth() &&
            d.getFullYear() === effectiveSelected.getFullYear();
          const isMin = d && d.getDate() === minDate.getDate() && d.getMonth() === minDate.getMonth() && d.getFullYear() === minDate.getFullYear();
          const isSource = sourceDate && d &&
            d.getDate() === sourceDate.getDate() &&
            d.getMonth() === sourceDate.getMonth() &&
            d.getFullYear() === sourceDate.getFullYear();
          const disabled = !d || d < minDate;
          return (
            <TouchableOpacity
              key={i}
              disabled={disabled}
              onPress={() => d && onSelect(d)}
              style={{ width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', opacity: disabled && d ? 0.25 : 1 }}
            >
              <View style={{
                width: 30, height: 30, borderRadius: 15,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: isSelected ? theme.primary : isSource && !isSelected ? '#FFF7ED' : 'transparent',
                borderWidth: (isMin && !isSelected) || (isSource && !isSelected) ? 1.5 : 0,
                borderColor: isSource && !isSelected ? '#F97316' : theme.primary,
                borderStyle: isSource && !isSelected && !isMin ? 'dashed' : 'solid',
              }}>
                <Text style={{ fontSize: 13, fontWeight: isSelected ? '900' : '600', color: isSelected ? 'white' : isSource ? '#F97316' : (d ? theme.text : 'transparent') }}>
                  {d ? d.getDate() : ''}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export const PhotoSlotButton = ({ slot, uri, provided, onPress }: { slot: 'before' | 'after'; uri?: string | null; provided: boolean; onPress?: () => void }) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = COLORS[colorScheme];
  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.7}
      style={{ flex: 1, aspectRatio: 4/3, borderRadius: 16, overflow: 'hidden', backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border ?? '#E2E8F0', justifyContent: 'center', alignItems: 'center' }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
      ) : (
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Camera size={20} color={theme.subtext} />
          <Text style={{ fontSize: 10, fontWeight: '900', color: theme.subtext, textTransform: 'uppercase' }}>{slot}</Text>
        </View>
      )}
      {provided && (
        <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: theme.green, borderRadius: 8, padding: 2 }}>
          <CheckCircle size={10} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );
};

export const QuickAddChorePanel = ({ onClose, onAdd, sections, selectedDate, history }: { onClose: () => void; onAdd: (chore: Omit<Chore, 'id'>) => void; sections: Section[]; selectedDate: string; history: Chore[] }) => {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = COLORS[colorScheme];
  const [title, setTitle] = useState('');
  const [points, setPoints] = useState('15');
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState('Every Day');
  const [error, setError] = useState(false);

  const handlePerformAdd = (stayOpen: boolean) => {
    if (!title.trim()) {
      setError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    onAdd({
      title: title.trim(),
      assignee: null,
      avatar: '👤',
      pool: 'Me',
      points: parseInt(points) || 15,
      estMinutes: 15,
      dueDate: selectedDate,
      due: selectedDate,
      status: 'pending',
      isRecurring,
      recurrenceRule: isRecurring ? recurrenceRule : undefined,
      photoRequired: false,
      photoProvided: { before: false, after: false },
      isNudged: false,
      sectionId,
      priorityIndex: 0,
      isOverdue: false
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTitle('');
    if (!stayOpen) onClose();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
        <View style={{ backgroundColor: theme.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: insets.bottom + 20, padding: 24, gap: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: theme.text }}>Add Quick Chore</Text>
            <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}><X size={18} color={theme.subtext} /></TouchableOpacity>
          </View>
          <TextInput value={title} onChangeText={(t) => { setTitle(t); setError(false); }} placeholder="e.g. Empty Dishwasher" placeholderTextColor={theme.subtext} style={{ fontSize: 18, fontWeight: '700', color: theme.text, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: error ? theme.red : theme.primary }} autoFocus />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['15', '25', '50'].map(p => (
              <TouchableOpacity key={p} onPress={() => setPoints(p)} style={{ flex: 1, paddingVertical: 8, borderRadius: 12, backgroundColor: points === p ? theme.primary : theme.bg, alignItems: 'center' }}><Text style={{ fontWeight: '900', color: points === p ? 'white' : theme.subtext }}>{p}</Text></TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={() => setIsRecurring(!isRecurring)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: isRecurring ? theme.primary + '10' : theme.bg, borderWidth: 1, borderColor: isRecurring ? theme.primary : 'transparent' }}>
            <Repeat2 size={20} color={isRecurring ? theme.primary : theme.subtext} />
            <Text style={{ fontSize: 14, fontWeight: '800', color: isRecurring ? theme.primary : theme.subtext }}>{isRecurring ? `Recurring: ${recurrenceRule}` : 'One-time chore'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handlePerformAdd(false)} style={{ backgroundColor: theme.primary, borderRadius: 20, paddingVertical: 16, alignItems: 'center', marginTop: 10, ...GOLDEN_SHADOW }}><Text style={{ fontSize: 16, fontWeight: '900', color: 'white' }}>Create Chore</Text></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export const ChoreEditModal = ({ chore, onClose, onSave, onDelete, sections }: { chore: Chore; onClose: () => void; onSave: (id: string, updates: Partial<Chore>) => void; onDelete: (id: string) => void; sections: Section[] }) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = COLORS[colorScheme];
  const [title, setTitle] = useState(chore.title);
  const [points, setPoints] = useState(String(chore.points));
  const [sectionId, setSectionId] = useState(chore.sectionId || null);
  const [isRecurring, setIsRecurring] = useState(chore.isRecurring);
  const [recurrenceRule, setRecurrenceRule] = useState(chore.recurrenceRule || 'Every Day');

  return (
    <Modal visible transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: theme.card, borderRadius: 32, padding: 24, gap: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: theme.text }}>Edit Chore</Text>
            <TouchableOpacity onPress={onClose}><X size={24} color={theme.subtext} /></TouchableOpacity>
          </View>
          <TextInput value={title} onChangeText={setTitle} style={{ fontSize: 18, fontWeight: '700', borderBottomWidth: 2, borderBottomColor: theme.primary, paddingVertical: 8, color: theme.text }} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => { onSave(chore.id, { title, points: parseInt(points), sectionId, isRecurring, recurrenceRule }); onClose(); }} style={{ flex: 2, backgroundColor: theme.primary, paddingVertical: 16, borderRadius: 20, alignItems: 'center' }}><Text style={{ color: 'white', fontWeight: '900' }}>Save Changes</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { onDelete(chore.id); onClose(); }} style={{ flex: 1, backgroundColor: theme.red + '10', paddingVertical: 16, borderRadius: 20, alignItems: 'center' }}><Trash2 size={20} color={theme.red} /></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const SectionEditPanel = ({
  section, onClose, onSave, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown,
}: {
  section: Section;
  onClose: () => void;
  onSave: (id: string, title: string, color: string) => void;
  onDelete: (id: string, dismiss?: () => void) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}) => {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(section.title);
  const [color, setColor] = useState(section.themeColor);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const translateY = useSharedValue(600);
  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  useEffect(() => {
    translateY.value = withSpring(0, { ...SPRING_CONFIG, damping: 30 });
  }, []);

  const dismiss = () => {
    translateY.value = withTiming(700, { duration: 260, easing: Easing.in(Easing.ease) });
    setTimeout(onClose, 260);
  };

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
    onSave(section.id, title, color);
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
                value={title}
                onChangeText={setTitle}
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
                {SECTION_COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => { setColor(c); Haptics.selectionAsync(); }}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c,
                      borderWidth: color === c ? 3 : 0, borderColor: 'white',
                      shadowColor: c === '#1C1C1E' ? '#000' : c,
                      shadowOpacity: color === c ? 0.55 : 0.3, shadowRadius: color === c ? 8 : 4,
                      shadowOffset: { width: 0, height: 2 }, elevation: color === c ? 6 : 2 }}
                  />
                ))}
              </View>
            </View>
            {/* Buttons */}
            <View style={{ gap: 10, marginTop: -8 }}>
              <TouchableOpacity onPress={handleSave} style={{ backgroundColor: '#6366F1', paddingVertical: 15, borderRadius: 18, alignItems: 'center' }}>
                <Text style={{ color: 'white', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 }}>Save Changes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const isAutoCreated = section.id.startsWith('rs_');
                  if (isAutoCreated) {
                    // Delegate entirely to parent — it shows the alert and calls dismiss when confirmed
                    onDelete(section.id, dismiss);
                  } else if (!confirmDelete) {
                    setConfirmDelete(true);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  } else {
                    onDelete(section.id, dismiss);
                  }
                }}
                style={{ paddingVertical: 15, borderRadius: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, backgroundColor: confirmDelete ? '#EF4444' : '#FEF2F2' }}
              >
                <Trash2 size={15} color={confirmDelete ? 'white' : '#E11D48'} />
                <Text style={{ fontSize: 15, fontWeight: '900', color: confirmDelete ? 'white' : '#E11D48' }}>{confirmDelete ? 'Confirm Delete' : 'Delete Section'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export const ChoreEditPanel = ChoreEditModal;
export const DeferDatePickerModal = ({ choreTitle, onClose, onDefer, sourceDateStr }: { choreTitle: string; onClose: () => void; onDefer: (date: string) => void; sourceDateStr?: string }) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = COLORS[colorScheme];
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const sourceDate = sourceDateStr ? (() => {
    const [y, m, d] = sourceDateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  })() : undefined;

  return (
    <Modal visible transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: theme.card, borderRadius: 32, padding: 24, gap: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '900', color: theme.text }}>Reschedule Chore</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.subtext, marginTop: 2 }}>{choreTitle}</Text>
            </View>
            <TouchableOpacity onPress={onClose}><X size={24} color={theme.subtext} /></TouchableOpacity>
          </View>
          {sourceDate && (() => {
            const today = new Date();
            const isToday = sourceDate.getDate() === today.getDate() && sourceDate.getMonth() === today.getMonth() && sourceDate.getFullYear() === today.getFullYear();
            if (isToday) return null;
            return (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF7ED', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#FED7AA' }}>
                <Text style={{ fontSize: 13 }}>📅</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#C2410C' }}>Rescheduling from <Text style={{ fontWeight: '900' }}>{sourceDateStr}</Text></Text>
              </View>
            );
          })()}

          <InlineCalendar
            minDate={(() => { const d = new Date(); d.setHours(0,0,0,0); return d; })()}
            initialDate={sourceDate ?? (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })()}
            selected={selectedDate}
            onSelect={setSelectedDate}
            sourceDate={sourceDate}
          />

          <TouchableOpacity 
            disabled={!selectedDate}
            onPress={() => {
              if (selectedDate) {
                const dStr = selectedDate.toISOString().split('T')[0];
                onDefer(dStr);
              }
            }} 
            style={{ backgroundColor: selectedDate ? theme.primary : theme.bg, paddingVertical: 16, borderRadius: 20, alignItems: 'center' }}
          >
            <Text style={{ color: selectedDate ? 'white' : theme.subtext, fontWeight: '900' }}>Reschedule Task</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
