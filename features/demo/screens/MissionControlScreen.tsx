import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  TextInput,
  PanResponder,
  Animated as RNAnimated
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useAuthStore } from '../../../store/authStore';
import { PrototypeNotice } from '../../../components/ui/PrototypeNotice';

import { supabase } from '../../../lib/supabase';
import { householdApi } from '../../../lib/household';
import { householdData } from '../../../lib/household-data';
import { applyHouseholdSnapshot } from '../../../lib/household-sync';
import { getTodayStr, parseLocalDate, getLocalFormattedDate, computeNextDate } from '../../../utils/dateUtils';
import { Chore, Section } from '../../../types/chores';
import { ChoreEditPanel, ChoreUndoRing, PointsEarnedNotification, DeferDatePickerModal } from '../../../components/ChoreModals';
import { useHuddleStore, DayMenu, WeekMenu } from '../../../store/huddleStore';
import { FAMILY_MEMBERS } from '../../../constants/mockData';
import { classify } from '../../../utils/groceryClassifier';
import {
  Home,
  Users,
  Settings,
  Plus,
  Zap,
  CheckCircle2,
  ArrowRight,
  Clock,
  Shirt,
  Wind,
  Flame as DishwasherIcon,
  Monitor,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  AlertTriangle,
  Camera,
  Image as ImageIcon,
  Edit2,
  BellRing,
  UserPlus,
  LogOut,
  Shield,
  Bell,
  User,
  UserCheck,
  Repeat2,
  Circle,
  Trash2,
  CheckCircle,
  MoreHorizontal,
  Pencil,
  X,
  RotateCcw,
  Truck,
  Package,
  MessageSquare,
  Send,
  MessageCircle,
  Mic,
  PieChart,
  ArrowRightCircle,
  Megaphone,
  Target,
  History,
  ClipboardList,
  ShoppingBag,
  Scale,
  Dumbbell,
  ShieldAlert,
  Snowflake,
  HandMetal,
  Droplets,
  Coffee,
  Utensils,
  Microwave,
  Refrigerator,
  ChefHat,
  Flame,
  Thermometer,
  AirVent,
  Sun,
  Tv,
  Speaker,
  Gamepad2,
  Laptop,
  Bath,
  WashingMachine,
  Fan,
  Lightbulb,
  Wrench,
  Timer,
  CookingPot,
  Heater,
  ShowerHead,
  Sofa,
  Toilet,
  TowelRack,
  SprayCan,
  Drill,
  Hammer,
  Weight,
  Wine,
  Scale as ScaleIcon,
  Lamp,
  MirrorRound,
  Bike,
  Dumbbell as DumbbellIcon,
  Waves,
  Plug,
  Power,
  Armchair,
  BedDouble,
  Wind as WindIcon,
  CalendarDays,
  ShoppingCart,
  Play,
} from 'lucide-react-native';
import Svg, { Circle as SvgCircle, Rect as SvgRect } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
  Extrapolation,
  runOnJS,
  FadeIn,
  FadeInDown,
  SlideInDown,
  FadeInRight,
  FadeOut,
  FadeOutUp,
  Layout,
  withDelay,
  useAnimatedScrollHandler,
  interpolateColor,
  useAnimatedProps,
  cancelAnimation
} from 'react-native-reanimated';
import { Swipeable, GestureDetector, Gesture, PanGestureHandler, Pressable as GHPressable } from 'react-native-gesture-handler';

const AnimatedCircle = Animated.createAnimatedComponent(SvgCircle);
const AnimatedRect = Animated.createAnimatedComponent(SvgRect);
const { width, height } = Dimensions.get('window');

// --- GOLDEN STANDARD CONSTANTS ---
const GOLDEN_RADIUS = 12;
const GOLDEN_SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.04,
  shadowRadius: 12,
  elevation: 2,
};

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

// --- MOCK DATA ---
const MOCK_FAMILY = [
  { id: '1', name: 'Dad', status: 'available', streak: 12, avatar: '👨🏻' },
  { id: '2', name: 'Mom', status: 'away', streak: 8, avatar: '👩🏼' },
  { id: '3', name: 'Alex', status: 'available', streak: 4, avatar: '👦🏻' },
  { id: '4', name: 'Sarah', status: 'away', streak: 15, avatar: '👧🏻' },
];

type AutomationChore = Partial<Chore> & { id: string; title: string };
type AutomationType = { id: string; title: string; emoji: string; color?: string; chores: AutomationChore[] };

const MOCK_AUTOMATIONS: AutomationType[] = [
  { id: 'a1', title: 'Weekend Grocery', emoji: '🛒', chores: [] },
  { id: 'a2', title: 'School Morning', emoji: '🏫', chores: [] },
  { id: 'a3', title: 'Deep Clean', emoji: '🧹', chores: [] },
  { id: 'a4', title: 'Garden Care', emoji: '🌿', chores: [] },
  { id: 'a5', title: 'Night Routine', emoji: '🌙', chores: [] },
];


const newBlankChore = (): AutomationChore => ({
  id: `ac_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  title: '',
  assignee: null,
  avatar: '👤',
  pool: 'Me',
  points: 10,
  estMinutes: 30,
  dueDate: getTodayStr(),
  due: getTodayStr(),
  isOverdue: false,
  status: 'pending',
  photoRequired: false,
  photoProvided: { before: false, after: false },
  isNudged: false,
  priorityIndex: 0,
  sectionId: null,
  isRecurring: false,
});

const AddAutomationModal = ({ visible, onClose, onAdd, sections }: { visible: boolean; onClose: () => void; onAdd: (a: AutomationType) => void; sections: Section[] }) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🤖');
  const [emojiBg, setEmojiBg] = useState('#ffffff');
  const [emojiHint, setEmojiHint] = useState(false);
  const [chores, setChores] = useState<AutomationChore[]>([]);
  const emojiInputRef = useRef<any>(null);
  const emojiShake = useSharedValue(0);
  const emojiShakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: emojiShake.value }] }));
  const [editingChore, setEditingChore] = useState<AutomationChore | null>(null);
  const [recurError, setRecurError] = useState(false);

  const translateY = useSharedValue(700);
  const panCtx = useSharedValue(0);
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  const handleClose = useCallback(() => {
    setName(''); setEmoji('🤖'); setEmojiBg('#ffffff'); setChores([]); setEditingChore(null); setRecurError(false); onClose();
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
    } else {
      translateY.value = 700;
    }
  }, [visible]);

  const panGesture = Gesture.Pan()
    .onStart(() => { panCtx.value = translateY.value; })
    .onUpdate((e) => { if (e.translationY > 0 && !editingChore) translateY.value = e.translationY + panCtx.value; })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 600) {
        translateY.value = withTiming(700, { duration: 250 }, () => { runOnJS(handleClose)(); });
      } else {
        translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
      }
    });

  const handleSaveChore = (id: string, updates: Partial<Chore>) => {
    // Validate: recurring chores must have end condition (recurrenceRule with COUNT or UNTIL, or non-recurring)
    if (updates.isRecurring && updates.recurrenceRule) {
      const rule = updates.recurrenceRule;
      const hasEnd = rule.includes('COUNT=') || rule.includes('UNTIL=');
      const isSimplePreset = ['Every Day','Every Week','Every 2 Weeks','Every Month','Every Year'].includes(rule);
      if (!hasEnd && !isSimplePreset) {
        setRecurError(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
    }
    setRecurError(false);
    const saved: AutomationChore = { ...editingChore!, ...updates, id };
    setChores(prev => {
      const idx = prev.findIndex(c => c.id === saved.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
      return [...prev, saved];
    });
    setEditingChore(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleAddChore = () => {
    setRecurError(false);
    setEditingChore(newBlankChore());
  };

  const handleRemoveChore = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setChores(prev => prev.filter(c => c.id !== id));
  };

  const moveChore = (from: number, to: number) => {
    if (to < 0 || to >= chores.length) return;
    setChores(prev => { const n = [...prev]; const [item] = n.splice(from, 1); n.splice(to, 0, item); return n; });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragY = useSharedValue(0);
  const dragActive = useSharedValue(false);
  const [choreItemH, setChoreItemH] = useState(76);
  const CHORE_ITEM_H = choreItemH;

  const handleCreate = () => {
    if (!name.trim()) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return; }
    onAdd({ id: `auto_${Date.now()}`, title: name.trim(), emoji, color: emojiBg, chores });
    handleClose();
  };

  const assigneeMember = (c: AutomationChore) => FAMILY_MEMBERS.find(m => m.name === c.assignee);

  return (
    <Modal visible={visible} animationType="none" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={editingChore ? undefined : handleClose} />
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[sheetStyle, { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '94%' }]}>
            {/* Drag handle */}
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0' }} />
            </View>

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
              <View>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>New Automation</Text>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#0f172a' }}>Build Playbook</Text>
              </View>
              <Pressable onPress={handleClose} style={{ backgroundColor: '#f1f5f9', padding: 8, borderRadius: 20 }}>
                <X size={20} color="#64748b" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Emoji + Name row */}
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 4 }}>
                <Animated.View style={emojiShakeStyle}>
                <Pressable
                  onPress={() => emojiInputRef.current?.focus()}
                  style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: emojiHint ? '#fff7ed' : emojiBg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: emojiHint ? '#f97316' : '#4f46e5' }}
                >
                  <Text style={{ fontSize: 26 }}>{emoji}</Text>
                  {/* Hidden input — only accepts emoji (filters regular chars) */}
                  <TextInput
                    ref={emojiInputRef}
                    value=""
                    onChangeText={t => {
                      if (!t) return;
                      // Accept the last grapheme cluster typed
                      const segmenter = (typeof Intl !== 'undefined' && (Intl as any).Segmenter)
                        ? new (Intl as any).Segmenter().segment(t)
                        : null;
                      const graphemes = segmenter ? [...segmenter].map((s: any) => s.segment) : [...t];
                      const last = graphemes[graphemes.length - 1] ?? t[t.length - 1];
                      const isEmoji = /\p{Emoji_Presentation}/u.test(last) || /\p{Extended_Pictographic}/u.test(last);
                      if (isEmoji) {
                        setEmoji(last);
                        setEmojiHint(false);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        emojiInputRef.current?.blur();
                      } else {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        setEmojiHint(true);
                        emojiShake.value = withSequence(
                          withTiming(-6, { duration: 50 }), withTiming(6, { duration: 50 }),
                          withTiming(-4, { duration: 50 }), withTiming(4, { duration: 50 }),
                          withTiming(0, { duration: 50 })
                        );
                        setTimeout(() => setEmojiHint(false), 2500);
                      }
                    }}
                    style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
                  />
                </Pressable>
                </Animated.View>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Automation name..."
                  placeholderTextColor="#cbd5e1"
                  style={{ flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 16, fontSize: 16, fontWeight: '800', color: '#0f172a', height: 56 }}
                />
              </View>
              <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10, marginLeft: 2, color: emojiHint ? '#f97316' : '#94a3b8', textTransform: 'uppercase' }}>
                {emojiHint ? '⚠️ Only emoji allowed — switch to 🌐 emoji keyboard' : 'Tap emoji → switch to 🌐 emoji keyboard'}
              </Text>

              {/* Color swatches */}
              {(() => {
                const LIGHT = ['#ffffff','#fee2e2','#fef9c3','#dcfce7','#e0f2fe','#f3e8ff','#fce7f3'];
                const DARK  = ['#b91c1c','#b45309','#15803d','#1d4ed8','#7e22ce','#be185d','#0f172a'];
                return (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Background Color</Text>
                    <View style={{ gap: 5 }}>
                      {[LIGHT, DARK].map((row, ri) => (
                        <View key={ri} style={{ flexDirection: 'row', gap: 5 }}>
                          {row.map(c => {
                            const selected = emojiBg === c;
                            return (
                              <Pressable
                                key={c}
                                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setEmojiBg(c); }}
                                style={{ flex: 1, height: 28, borderRadius: 7, backgroundColor: c, borderWidth: selected ? 2 : 1, borderColor: selected ? '#4f46e5' : c === '#ffffff' ? '#e2e8f0' : 'transparent' }}
                              />
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })()}

              {/* Chore list header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '900', color: '#0f172a' }}>Chores in this Playbook</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#94a3b8', marginTop: 2 }}>{chores.length === 0 ? 'Add chores below — all run on one tap' : `${chores.length} chore${chores.length > 1 ? 's' : ''} · one-tap deploy`}</Text>
                </View>
              </View>

              {/* Chore cards */}
              {chores.length === 0 ? (
                <View style={{ backgroundColor: '#f8fafc', borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: '#e2e8f0', padding: 32, alignItems: 'center', marginBottom: 16 }}>
                  <ClipboardList size={28} color="#cbd5e1" />
                  <Text style={{ fontWeight: '800', color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 10 }}>No chores yet{'\n'}Tap + to add the first one</Text>
                </View>
              ) : (
                <View style={{ marginBottom: 16 }}>
                  {chores.map((c, i) => {
                    const member = assigneeMember(c);
                    const mins = c.estMinutes ?? 0;
                    const timeLabel = mins >= 60 ? `${Math.floor(mins/60)}h${mins%60 > 0 ? ` ${mins%60}m` : ''}` : `${mins}m`;
                    const isDragging = draggingId === c.id;
                    const isOver = dragOverIndex === i && !isDragging;

                    const dragGesture = Gesture.Pan()
                      .activateAfterLongPress(300)
                      .onStart(() => {
                        dragActive.value = true;
                        runOnJS(setDraggingId)(c.id);
                        runOnJS(setDragOverIndex)(i);
                        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
                      })
                      .onUpdate((e) => {
                        dragY.value = e.translationY;
                        const newIdx = Math.max(0, Math.min(chores.length - 1, Math.round(i + e.translationY / CHORE_ITEM_H)));
                        runOnJS(setDragOverIndex)(newIdx);
                      })
                      .onEnd((e) => {
                        const newIdx = Math.max(0, Math.min(chores.length - 1, Math.round(i + e.translationY / CHORE_ITEM_H)));
                        dragY.value = 0;
                        dragActive.value = false;
                        runOnJS(setDraggingId)(null);
                        runOnJS(setDragOverIndex)(null);
                        if (newIdx !== i) runOnJS(moveChore)(i, newIdx);
                      })
                      .onFinalize(() => {
                        dragY.value = 0;
                        dragActive.value = false;
                        runOnJS(setDraggingId)(null);
                        runOnJS(setDragOverIndex)(null);
                      });

                    return (
                      <GestureDetector key={c.id} gesture={dragGesture}>
                        <View onLayout={i === 0 ? (e) => { const h = e.nativeEvent.layout.height; if (h > 0) setChoreItemH(h + 4); } : undefined} style={{
                          backgroundColor: isDragging ? '#eef2ff' : isOver ? '#f8fafc' : '#fff',
                          borderRadius: 18,
                          borderWidth: isDragging ? 2 : 1,
                          borderColor: isDragging ? '#4f46e5' : isOver ? '#c7d2fe' : '#f1f5f9',
                          padding: 14,
                          marginBottom: 8,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: isDragging ? 8 : 2 },
                          shadowOpacity: isDragging ? 0.14 : 0.04,
                          shadowRadius: isDragging ? 16 : 6,
                          elevation: isDragging ? 8 : 2,
                          opacity: isDragging ? 0.95 : 1,
                        }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            {/* Drag handle */}
                            <View style={{ paddingHorizontal: 4, gap: 3, justifyContent: 'center' }}>
                              {[0,1,2].map(row => (
                                <View key={row} style={{ flexDirection: 'row', gap: 3 }}>
                                  {[0,1].map(col => (
                                    <View key={col} style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: isDragging ? '#6366f1' : '#cbd5e1' }} />
                                  ))}
                                </View>
                              ))}
                            </View>
                            {/* Assignee avatar */}
                            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontSize: 18 }}>{member?.avatar ?? '👤'}</Text>
                            </View>
                            {/* Info */}
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontWeight: '800', fontSize: 14, color: '#0f172a' }} numberOfLines={1}>{c.title || 'Untitled'}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                                <View style={{ backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                                  <Text style={{ fontSize: 9, fontWeight: '800', color: '#64748b' }}>{member?.name ?? 'Unassigned'}</Text>
                                </View>
                                <View style={{ backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                                  <Text style={{ fontSize: 9, fontWeight: '800', color: '#64748b' }}>⏱ {timeLabel}</Text>
                                </View>
                                <View style={{ backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                                  <Text style={{ fontSize: 9, fontWeight: '800', color: '#6366f1' }}>+{c.points ?? 0}pts</Text>
                                </View>
                                {c.isRecurring && (
                                  <View style={{ backgroundColor: '#fef9c3', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#ca8a04' }}>↻ {c.recurrenceRule}</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                            {/* Edit / remove */}
                            <View style={{ flexDirection: 'row', gap: 2 }}>
                              <Pressable onPress={() => setEditingChore(c)} style={{ padding: 8, borderRadius: 10, backgroundColor: '#f1f5f9' }}>
                                <Edit2 size={13} color="#6366f1" strokeWidth={2.5} />
                              </Pressable>
                              <Pressable onPress={() => handleRemoveChore(c.id)} style={{ padding: 8, borderRadius: 10, backgroundColor: '#fef2f2' }}>
                                <X size={13} color="#ef4444" strokeWidth={2.5} />
                              </Pressable>
                            </View>
                          </View>
                        </View>
                      </GestureDetector>
                    );
                  })}
                </View>
              )}

              {/* Recurring error banner */}
              {recurError && (
                <View style={{ backgroundColor: '#fef2f2', borderRadius: 14, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 18 }}>⚠️</Text>
                  <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: '#b91c1c' }}>Recurring chores in automations must use a preset (Every Day, Week, etc.) or include a COUNT / UNTIL end condition.</Text>
                </View>
              )}

              {/* Add chore button */}
              <Pressable
                onPress={handleAddChore}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderStyle: 'dashed', borderColor: '#c7d2fe', borderRadius: 18, paddingVertical: 16, marginBottom: 8 }}
              >
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={14} color="#fff" strokeWidth={3} />
                </View>
                <Text style={{ fontWeight: '800', fontSize: 14, color: '#4f46e5' }}>Add Chore to Playbook</Text>
              </Pressable>

            </ScrollView>

            {/* Footer submit */}
            <View style={{ paddingHorizontal: 24, paddingBottom: 32, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
              <Pressable onPress={handleCreate} style={{ backgroundColor: name.trim() ? '#0f172a' : '#e2e8f0', paddingVertical: 18, borderRadius: 20, alignItems: 'center' }}>
                <Text style={{ color: name.trim() ? '#fff' : '#94a3b8', fontWeight: '900', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                  {chores.length === 0 ? 'Create Empty Playbook' : `Save Playbook · ${chores.length} Chore${chores.length > 1 ? 's' : ''}`}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </GestureDetector>

        {/* Chore edit panel slides up on top */}
        {editingChore && (
          <ChoreEditPanel
            chore={editingChore as Chore}
            onClose={() => { setEditingChore(null); setRecurError(false); }}
            onSave={handleSaveChore}
            onDelete={handleRemoveChore}
            sections={sections}
          />
        )}
      </View>
    </Modal>
  );
};

type Machine = {
  id: string;
  name: string;
  status: string;
  since: number | null;
  startedBy: string | null;
  usesThisWeek: number;
  location?: string;
  runMinutes?: number;
  icon?: string;
};

const INITIAL_MACHINES: Machine[] = [
  { id: 'm1', name: 'Washer',        location: 'Basement',    icon: 'washer',    status: 'Running', since: Date.now() - 58 * 60 * 1000, startedBy: 'Dad',  usesThisWeek: 4,  runMinutes: 60  }, // Green (96%)
  { id: 'm2', name: 'Dryer',         location: 'Basement',    icon: 'dryer',     status: 'Running', since: Date.now() - 10 * 60 * 1000, startedBy: 'Alex', usesThisWeek: 3,  runMinutes: 60  }, // Blue (16%)
  { id: 'm3', name: 'Dishwasher',    location: 'Kitchen',     icon: 'dishwasher',status: 'Running', since: Date.now() - 95 * 60 * 1000, startedBy: 'Mom',  usesThisWeek: 7,  runMinutes: 90  }, // Orange (105%)
  { id: 'm4', name: 'Robot Vacuum',  location: '1st Floor',   icon: 'vacuum',    status: 'Running', since: Date.now() - 145 * 60 * 1000,startedBy: 'Mom',  usesThisWeek: 12, runMinutes: 120 }, // Red (120%)
  { id: 'm5', name: 'Air Purifier',  location: 'Living Room', icon: 'purifier',  status: 'Idle',    since: null,                         startedBy: null,   usesThisWeek: 6,  runMinutes: 180 },
  { id: 'm6', name: 'Coffee Maker',  location: 'Kitchen',     icon: 'coffee',    status: 'Idle',    since: null,                         startedBy: null,   usesThisWeek: 14, runMinutes: 10  },
];

// --- SPRING CONFIGS ---
const HEAVY_SPRING = { damping: 20, stiffness: 90, mass: 1 };

const AUTOMATION_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'];
const getAutomationColor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AUTOMATION_COLORS[h % AUTOMATION_COLORS.length];
};

// --- HELPER FUNCTIONS ---
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good Morning ☀️";
  if (hour >= 12 && hour < 17) return "Good Afternoon 👋";
  if (hour >= 17 && hour < 21) return "Good Evening 🌙";
  return "Burning the midnight oil? 🕯️";
}

function formatElapsed(since: number): string {
  const elapsed = Math.floor((Date.now() - since) / 1000);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return '<1m';
}

// --- SUB-COMPONENTS ---

const AmbientHUD = ({ onProfilePress, chores, familyMembers, currentUser }: { onProfilePress: () => void, chores: any[], familyMembers: any[], currentUser: string }) => {
  const currentMember = familyMembers.find(m => m.name === currentUser) ?? familyMembers.find(m => m.name.toLowerCase() === currentUser?.toLowerCase()) ?? familyMembers[0];
  const [greeting, setGreeting] = useState(getGreeting);
  useEffect(() => {
    const now = new Date();
    const msUntilNextHour = (60 - now.getMinutes()) * 60000 - now.getSeconds() * 1000 - now.getMilliseconds();
    let timer = setTimeout(function tick() {
      setGreeting(getGreeting());
      timer = setTimeout(tick, 3600000);
    }, msUntilNextHour);
    return () => clearTimeout(timer);
  }, []);
  const [orbitVisible, setOrbitVisible] = useState(false);
  const orbitOpacity = useSharedValue(0);
  const orbitY = useSharedValue(-20);

  const toggleOrbit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const targetVisible = !orbitVisible;
    setOrbitVisible(targetVisible);
    orbitOpacity.value = withTiming(targetVisible ? 1 : 0, { duration: 200 });
    orbitY.value = withSpring(targetVisible ? 0 : -20, HEAVY_SPRING);
  };

  const orbitStyle = useAnimatedStyle(() => ({
    opacity: orbitOpacity.value,
    transform: [{ translateY: orbitY.value }],
    pointerEvents: orbitVisible ? 'auto' : 'none'
  }));

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();

  return (
    <View className="px-6 pt-2 z-50">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-4">
          <Text className="text-slate-400 font-bold tracking-[0.2em] text-[11px] mb-1">{dateStr}</Text>
          <Text className="text-slate-700 dark:text-slate-300 font-bold text-[15px] tracking-tight">{greeting}</Text>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={toggleOrbit} activeOpacity={0.7} style={[GOLDEN_SHADOW, { width: 56, height: 56 }]} className="rounded-full bg-white dark:bg-zinc-900 items-center justify-center border border-[#E2E8F0] dark:border-zinc-800 mr-3">
            <Users size={24} color="#4F46E5" strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onProfilePress} activeOpacity={0.7} style={{ width: 56, height: 56 }} className="rounded-full border-2 border-white dark:border-zinc-800 shadow-md overflow-hidden">
            <View className="w-full h-full bg-indigo-500 items-center justify-center"><Text className="text-xl">{currentMember?.avatar ?? '👤'}</Text></View>
          </TouchableOpacity>
        </View>
      </View>
      <Animated.View style={[orbitStyle, styles.orbitOverlay]} className="overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-xl bg-white dark:bg-zinc-900">
        <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint="prominent" className="p-4">
          <Text className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Family Orbit</Text>
          {familyMembers.map((member) => {
            const memberChores = chores.filter((c: any) => c.assignee === member.name && c.dueDate === getTodayStr());
            const memberDone = memberChores.filter((c: any) => c.status === 'completed').length;
            const memberTotal = memberChores.length;
            const pct = memberTotal > 0 ? Math.round((memberDone / memberTotal) * 100) : null;
            const pctColor = pct === null ? '#94a3b8' : pct === 100 ? '#16a34a' : pct >= 66 ? '#65a30d' : pct >= 33 ? '#f59e0b' : '#ef4444';
            const trackColor = pct === null ? '#f1f5f9' : pct === 100 ? '#dcfce7' : pct >= 66 ? '#ecfccb' : pct >= 33 ? '#fef3c7' : '#fee2e2';
            return (
              <View key={member.name} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(148,163,184,0.1)' }}>
                <Text style={{ fontSize: 22, marginRight: 10 }}>{member.avatar}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: '#1e293b', marginBottom: 4 }}>{member.name}</Text>
                  <View style={{ height: 5, backgroundColor: trackColor, borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ height: 5, width: pct !== null ? `${pct}%` : '0%', backgroundColor: pctColor, borderRadius: 3 }} />
                  </View>
                </View>
                <View style={{ marginLeft: 12, alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: pctColor }}>{pct === null ? '—' : `${pct}%`}</Text>
                  {pct !== null && <Text style={{ fontSize: 9, fontWeight: '700', color: '#94a3b8', marginTop: 1 }}>{memberDone}/{memberTotal}</Text>}
                </View>
              </View>
            );
          })}
        </BlurView>
      </Animated.View>
    </View>
  );
};

const QAInbox = ({ isParent, count, onPress }: { isParent: boolean, count: number, onPress: () => void }) => {
  if (count === 0) return null;
  return (
    <View className="px-6 mt-4">
      <TouchableOpacity onPress={() => { if (!isParent) { Alert.alert("Pending", "Waiting on parents to approve."); return; } onPress(); }} activeOpacity={0.85} className="bg-indigo-600 rounded-[28px] flex-row items-center px-5 py-4 shadow-lg border border-indigo-500/50">
        <View className="bg-white/20 p-2.5 rounded-2xl mr-4"><CheckCircle2 color="#fff" size={22} strokeWidth={2.5} /></View>
        <View className="flex-1"><Text className="text-white font-black text-[15px] tracking-tight">Inbox Review</Text><Text className="text-indigo-100 font-bold text-[11px] uppercase tracking-widest mt-0.5">{count} Tasks Pending</Text></View>
        <View className="bg-white/10 w-8 h-8 rounded-full items-center justify-center"><ArrowRight color="#fff" size={16} strokeWidth={3} /></View>
      </TouchableOpacity>
    </View>
  );
};

const ROW_HEIGHT = 64;

// HAR-284: Modern run history modal
const AutomationHistoryModal = ({ visible, onClose, item, accentColor }: { visible: boolean; onClose: () => void; item: any; accentColor: string }) => {
  const history: { date: string; triggeredBy: string }[] = (item?.runHistory ?? []).slice().reverse();
  const slideY = useSharedValue(400);

  useEffect(() => {
    if (visible) {
      slideY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
    } else {
      slideY.value = withTiming(400, { duration: 220, easing: Easing.in(Easing.cubic) });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: slideY.value }] }));

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <Animated.View style={[{ backgroundColor: '#f8fafc', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }, sheetStyle]}>
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0' }} />
          </View>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: accentColor, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
              <Text style={{ fontSize: 22 }}>{item?.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '900', color: '#0f172a', letterSpacing: -0.3 }}>{item?.title}</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#94a3b8', marginTop: 1 }}>{history.length} run{history.length !== 1 ? 's' : ''} total</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} color="#64748b" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          {/* List */}
          <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ paddingVertical: 8 }}>
            {history.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <History size={36} color="#e2e8f0" strokeWidth={1.5} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#94a3b8', marginTop: 12 }}>No runs yet</Text>
                <Text style={{ fontSize: 11, fontWeight: '500', color: '#cbd5e1', marginTop: 4 }}>Hold the run button to trigger</Text>
              </View>
            ) : history.map((r, i) => {
              const d = new Date(r.date);
              const isLatest = i === 0;
              return (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12, borderBottomWidth: i < history.length - 1 ? 1 : 0, borderBottomColor: '#f8fafc' }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: isLatest ? accentColor : '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                    {isLatest
                      ? <Zap size={16} color="#fff" strokeWidth={2.5} />
                      : <History size={16} color="#94a3b8" strokeWidth={2} />
                    }
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: isLatest ? '#0f172a' : '#475569' }}>
                      {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#94a3b8', marginTop: 1 }}>
                      {d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · by {r.triggeredBy}
                    </Text>
                  </View>
                  {isLatest && (
                    <View style={{ backgroundColor: accentColor + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                      <Text style={{ fontSize: 9, fontWeight: '900', color: accentColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>Latest</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
          <View style={{ height: 32 }} />
        </Animated.View>
      </View>
    </Modal>
  );
};

const AUTO_GAUGE_SIZE = 48;
const AUTO_GAUGE_R = 10;
const AUTO_GAUGE_PERIMETER = 2 * (AUTO_GAUGE_SIZE - 4 - 2 * AUTO_GAUGE_R) * 2 + 2 * Math.PI * AUTO_GAUGE_R;

// Standalone row content — holds gauge ring around icon (like delivery card)
const AutomationRowContent = ({ item, isActive, onActivate, onConfirm, onCancel, accentColor, isDraggingRow, cancelHoldRef, dragGesture }: any) => {
  const holdProgress = useSharedValue(0);
  const isHoldingRef = useRef(false);
  const holdSessionRef = useRef(0);

  const handleHoldStart = useCallback(() => {
    if (isDraggingRow?.value) return;
    const session = ++holdSessionRef.current;
    isHoldingRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    holdProgress.value = withTiming(1, { duration: 2000, easing: Easing.linear }, (finished) => {
      if (finished && isHoldingRef.current && holdSessionRef.current === session) {
        runOnJS(onConfirm)();
      }
    });
  }, [isDraggingRow, onConfirm]);

  const handleHoldEnd = useCallback(() => {
    holdSessionRef.current++;
    isHoldingRef.current = false;
    holdProgress.value = withTiming(0, { duration: 200 });
  }, []);

  useEffect(() => {
    if (cancelHoldRef) cancelHoldRef.current = handleHoldEnd;
  });

  // Bottom progress bar fills across the whole card while holding
  const progressBarStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: accentColor,
    width: `${holdProgress.value * 100}%`,
  }));

  const gaugeRectProps = useAnimatedProps(() => {
    const offset = AUTO_GAUGE_PERIMETER * (1 - holdProgress.value);
    return { strokeDashoffset: offset, strokeDasharray: `${AUTO_GAUGE_PERIMETER} ${AUTO_GAUGE_PERIMETER}` };
  });

  // RNGH v2 tap gesture for the run button — works inside Swipeable/GestureDetector tree
  const runGesture = Gesture.Tap()
    .maxDuration(5000)
    .shouldCancelWhenOutside(true)
    .onTouchesDown(() => { 'worklet'; runOnJS(handleHoldStart)(); })
    .onTouchesUp(() => { 'worklet'; runOnJS(handleHoldEnd)(); })
    .onFinalize(() => { 'worklet'; runOnJS(handleHoldEnd)(); });

  const history: { date: string; triggeredBy: string }[] = item.runHistory ?? [];
  const lastRun = history.length > 0 ? history[history.length - 1] : null;
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  return (
    <>
    <AutomationHistoryModal visible={historyModalOpen} onClose={() => setHistoryModalOpen(false)} item={item} accentColor={accentColor} />
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 12, height: ROW_HEIGHT }}>
      {/* Drag handle — long press this area to drag */}
      <GestureDetector gesture={dragGesture}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: accentColor + '18', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
        </View>
      </GestureDetector>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '800', fontSize: 14, color: '#0f172a' }}>{item.title}</Text>
        {lastRun
          ? <TouchableOpacity onPress={() => setHistoryModalOpen(true)} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: '#94a3b8', marginTop: 2 }}>
                Last run {new Date(lastRun.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} by {lastRun.triggeredBy} · {history.length} total
              </Text>
            </TouchableOpacity>
          : <Text style={{ fontSize: 9, fontWeight: '700', color: '#cbd5e1', marginTop: 2 }}>No runs yet</Text>
        }
      </View>

      {/* Run button with gauge ring — hold for 2s fills ring and triggers */}
      <GestureDetector gesture={runGesture}>
        <View style={{ alignItems: 'center', justifyContent: 'center', width: AUTO_GAUGE_SIZE, height: AUTO_GAUGE_SIZE }}>
          <View style={{ width: AUTO_GAUGE_SIZE - 8, height: AUTO_GAUGE_SIZE - 8, borderRadius: 10, backgroundColor: accentColor + '18', alignItems: 'center', justifyContent: 'center' }}>
            <Play size={14} color={accentColor} strokeWidth={3} fill={accentColor} />
            <Text style={{ fontSize: 7, fontWeight: '900', color: accentColor, marginTop: 1, letterSpacing: 0.2 }}>RUN</Text>
          </View>
          <View style={{ position: 'absolute', top: 0, left: 0 }}>
            <Svg width={AUTO_GAUGE_SIZE} height={AUTO_GAUGE_SIZE} viewBox={`0 0 ${AUTO_GAUGE_SIZE} ${AUTO_GAUGE_SIZE}`}>
              <SvgRect x="2" y="2" width={AUTO_GAUGE_SIZE - 4} height={AUTO_GAUGE_SIZE - 4} rx={AUTO_GAUGE_R} ry={AUTO_GAUGE_R} stroke="#e2e8f0" strokeWidth="2" fill="none" />
              <AnimatedRect x="2" y="2" width={AUTO_GAUGE_SIZE - 4} height={AUTO_GAUGE_SIZE - 4} rx={AUTO_GAUGE_R} ry={AUTO_GAUGE_R}
                stroke={accentColor} strokeWidth="2.5" fill="none" strokeLinecap="round" animatedProps={gaugeRectProps} />
            </Svg>
          </View>
        </View>
      </GestureDetector>
    </View>
    {/* Full-width progress bar at bottom of row while holding */}
    <Animated.View style={progressBarStyle} />
    </>
  );
};

const DraggableAutomationList = ({ automations, activeAutomationId, setActiveAutomationId, addChore, setAutomations, updateAutomation, currentUser, automationsExpanded, setAutomationsExpanded, deleteChore, onAutomationTriggered }: any) => {
  const visible = useMemo(() =>
    automationsExpanded ? automations : automations.slice(0, 2),
    [automations, automationsExpanded]
  );

  const handleConfirm = (a: any) => {
    const today = getTodayStr();
    const ids: string[] = [];
    a.chores.forEach((c: any) => {
      const id = `${c.id}_run_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
      ids.push(id);
      addChore({ ...c, id, dueDate: today, due: today, status: 'pending', isOverdue: false });
    });
    const newRun = { date: new Date().toISOString(), triggeredBy: currentUser ?? 'Unknown' };
    const updatedHistory = [...(a.runHistory ?? []), newRun].slice(-10);
    updateAutomation(a.id, { runHistory: updatedHistory });
    setActiveAutomationId(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAutomationTriggered?.({ item: a, addedIds: ids });
  };

  const handleDelete = (id: string) => {
    setAutomations((prev: any[]) => prev.filter(a => a.id !== id));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleEdit = (item: any) => {
    Alert.alert("Edit Automation", `Editing "${item.title}" is coming soon!`);
  };

  const handleReorder = useCallback((from: number, to: number) => {
    setAutomations((prev: any[]) => {
      const next = [...prev];
      const [removed] = next.splice(from, 1);
      next.splice(to, 0, removed);
      return next;
    });
  }, [setAutomations]);

  return (
    <>
    <View style={[GOLDEN_SHADOW, { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden' }]}>
      <View style={{ height: visible.length * ROW_HEIGHT, position: 'relative' }}>
        {visible.map((a: any, index: number) => (
          <DraggableRow
            key={a.id}
            item={a}
            index={index}
            totalCount={visible.length}
            onReorder={handleReorder}
            onEdit={handleEdit}
            onDelete={handleDelete}
            accentColor={a.color || getAutomationColor(a.id)}
            isActive={activeAutomationId === a.id}
            onActivate={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveAutomationId(a.id);
            }}
            onConfirm={() => handleConfirm(a)}
            onCancel={() => setActiveAutomationId(null)}
          />
        ))}
      </View>

      {automations.length > 2 && (
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setAutomationsExpanded(!automationsExpanded);
          }}
          style={{ height: 44, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', flexDirection: 'row', gap: 6, backgroundColor: '#fff' }}
        >
          <Text style={{ fontSize: 11, fontWeight: '900', color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {automationsExpanded ? 'Show Less' : `Show ${automations.length - 2} More`}
          </Text>
          <ChevronDown size={14} color="#6366f1" strokeWidth={3} style={{ transform: [{ rotate: automationsExpanded ? '180deg' : '0deg' }] }} />
        </TouchableOpacity>
      )}
    </View>
    </>
  );
};

const DraggableRow = ({ item, index, totalCount, onReorder, accentColor, isActive, onActivate, onConfirm, onCancel, onEdit, onDelete }: any) => {
  const top = useSharedValue(index * ROW_HEIGHT);
  const startTop = useSharedValue(0);
  const zIndex = useSharedValue(1);
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const activeIndex = useSharedValue(index);

  const swipeableRef = useRef<Swipeable>(null);
  const cancelHoldRef = useRef<(() => void) | null>(null);
  const currentIndexRef = useRef(index);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { currentIndexRef.current = index; }, [index]);

  useEffect(() => {
    if (!isDragging.value) {
      top.value = withSpring(index * ROW_HEIGHT, { damping: 25, stiffness: 250 });
      activeIndex.value = index;
    }
  }, [index, isDragging.value]);

  const renderRightActions = (prog: RNAnimated.AnimatedInterpolation<number>, dragX: RNAnimated.AnimatedInterpolation<number>) => {
    const width = 160;
    const trans = dragX.interpolate({ inputRange: [-width, 0], outputRange: [0, width], extrapolate: 'clamp' });
    return (
      <View style={{ width, flexDirection: 'row', height: ROW_HEIGHT }}>
        <RNAnimated.View style={{ flex: 1, flexDirection: 'row', transform: [{ translateX: trans }] }}>
          <TouchableOpacity
            onPress={() => { swipeableRef.current?.close(); onEdit(item); }}
            style={{ flex: 1, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center' }}
          >
            <Pencil size={20} color="white" />
            <Text style={{ color: 'white', fontSize: 8, fontWeight: '900', marginTop: 4, textTransform: 'uppercase' }}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (isDeleting) { onDelete(item.id); swipeableRef.current?.close(); }
              else { setIsDeleting(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }
            }}
            style={{ flex: 1, backgroundColor: isDeleting ? '#b91c1c' : '#ef4444', justifyContent: 'center', alignItems: 'center' }}
          >
            <Trash2 size={20} color="white" />
            <Text style={{ color: 'white', fontSize: 8, fontWeight: '900', marginTop: 4, textTransform: 'uppercase' }}>{isDeleting ? 'Sure?' : 'Delete'}</Text>
          </TouchableOpacity>
        </RNAnimated.View>
      </View>
    );
  };

  const gesture = Gesture.Pan()
    .activateAfterLongPress(300)
    .onStart(() => {
      'worklet';
      isDragging.value = true;
      startTop.value = top.value;
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      if (cancelHoldRef.current) runOnJS(cancelHoldRef.current)();
      zIndex.value = 100;
      shadowOpacity.value = withTiming(0.10, { duration: 150 });
    })
    .onUpdate((e) => {
      'worklet';
      const currentTop = startTop.value + e.translationY;
      top.value = currentTop;
      const newIndex = Math.max(0, Math.min(totalCount - 1, Math.round(currentTop / ROW_HEIGHT)));
      if (newIndex !== activeIndex.value) {
        activeIndex.value = newIndex;
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
        runOnJS(onReorder)(currentIndexRef.current, newIndex);
      }
    })
    .onEnd(() => {
      'worklet';
      isDragging.value = false;
      // Snap to start; useEffect([index]) animates to settled position once onReorder resolves
      top.value = withSpring(startTop.value, { damping: 25, stiffness: 250 }, () => {
        zIndex.value = 1;
      });
      shadowOpacity.value = withTiming(0, { duration: 150 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ROW_HEIGHT,
    transform: [{ translateY: top.value }, { scale: scale.value }],
    zIndex: zIndex.value,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: shadowOpacity.value,
    shadowRadius: 12,
    elevation: zIndex.value > 1 ? 5 : 0,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        onSwipeableClose={() => setIsDeleting(false)}
        enabled={!isDragging.value}
      >
        <View style={{ height: ROW_HEIGHT, width: '100%', backgroundColor: '#fff' }}>
          <AutomationRowContent
            item={item}
            accentColor={accentColor}
            isActive={isActive}
            onActivate={onActivate}
            onConfirm={onConfirm}
            onCancel={onCancel}
            isDraggingRow={isDragging}
            cancelHoldRef={cancelHoldRef}
            dragGesture={gesture}
          />
          {index < totalCount - 1 && <View style={{ position: 'absolute', bottom: 0, left: 64, right: 16, height: 1, backgroundColor: '#f1f5f9' }} />}
        </View>
      </Swipeable>
    </Animated.View>
  );
};

const PulsingIcon = ({ isRunning, children }: { isRunning: boolean, children: React.ReactNode }) => {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (isRunning) scale.value = withRepeat(withTiming(1.15, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true);
    else scale.value = withTiming(1);
  }, [isRunning]);
  return <Animated.View style={useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))}>{children}</Animated.View>;
};

const FamilyGoalPulse = ({ goal }: { goal: any }) => {
  if (!goal) return null;
  const progress = goal.current / goal.target;
  return (
    <View className="px-6 mt-6">
      <View style={[GOLDEN_SHADOW, { backgroundColor: 'white', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#F1F5F9' }]}>
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-row items-center gap-2"><Target size={18} color={goal.color} /><Text className="text-[13px] font-black text-slate-900 tracking-tight uppercase">{goal.title}</Text></View>
          <Text className="text-[11px] font-black text-slate-400">{Math.round(progress * 100)}%</Text>
        </View>
        <View className="h-2 bg-slate-100 rounded-full overflow-hidden"><View style={{ width: `${progress * 100}%`, backgroundColor: goal.color }} className="h-full" /></View>
        <Text className="text-[10px] font-bold text-slate-400 mt-2">
          {goal.type === 'points'
            ? `${goal.current.toLocaleString()} of ${goal.target.toLocaleString()} pts`
            : `$${goal.current.toLocaleString()} of $${goal.target.toLocaleString()} saved`}
        </Text>
      </View>
    </View>
  );
};

// HAR-286: plain announcement card only — no style variants

// Extracted card row so useAnnCardAnimation hook is called at component level (not inside .map)
const ANN_ACCENT = '#6366f1';

const AnnCardRow = ({ a, editTitle, editBody, editExpiry, expandedId, deleteConfirmId, editingId, setExpandedId, setDeleteConfirmId, setEditingId, setEditTitle, setEditBody, setEditExpiry, handleSaveEdit, deleteAnnouncement }: any) => {
  const diffMin = Math.floor((Date.now() - a.timestamp) / 60000);
  const timeAgo = diffMin < 1 ? 'just now' : diffMin < 60 ? `${diffMin}m ago` : diffMin < 1440 ? `${Math.floor(diffMin / 60)}h ago` : `${Math.floor(diffMin / 1440)}d ago`;
  const isExpanded = expandedId === a.id;
  const isDelConfirm = deleteConfirmId === a.id;
  const isEditing = editingId === a.id;
  const expiresIn = a.expiresAt ? Math.max(0, Math.round((a.expiresAt - Date.now()) / 86400000)) : null;

  return (
    <TouchableOpacity key={a.id} activeOpacity={0.85} onPress={() => {
      setExpandedId(isExpanded ? null : a.id);
      setDeleteConfirmId(null); setEditingId(null);
    }}
      style={{ backgroundColor: '#ffffff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ANN_ACCENT, marginTop: 6, flexShrink: 0 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b', lineHeight: 20 }}>{a.title}</Text>
          {!!a.content && <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748b', marginTop: 2 }}>{a.content}</Text>}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b' }}>{a.author}</Text>
          <Text style={{ fontSize: 9, fontWeight: '600', color: '#94a3b8' }}>{timeAgo}</Text>
        </View>
      </View>
      {isExpanded && (
        <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10, gap: 8 }}>
          {expiresIn !== null && (
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8' }}>
              Expires in {expiresIn === 0 ? 'less than a day' : `${expiresIn} day${expiresIn !== 1 ? 's' : ''}`}
            </Text>
          )}
          {isEditing ? (
            <View style={{ gap: 8 }}>
              <TextInput value={editTitle} onChangeText={setEditTitle} placeholder="Title..." placeholderTextColor="#94a3b8"
                style={{ fontSize: 13, fontWeight: '700', color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#f8fafc' }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8' }}>Expires in</Text>
                {[1, 3, 7, 14].map(d => (
                  <TouchableOpacity key={d} onPress={() => setEditExpiry(d)} style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, backgroundColor: editExpiry === d ? '#0f172a' : '#f1f5f9' }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: editExpiry === d ? '#fff' : '#64748b' }}>{d}d</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => setEditingId(null)} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleSaveEdit(a.id)} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: ANN_ACCENT, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={(e) => { e.stopPropagation(); setEditingId(a.id); setEditTitle(a.title); setEditBody(a.content ?? ''); setEditExpiry(a.expiresAt ? Math.max(1, Math.round((a.expiresAt - Date.now()) / 86400000)) : 7); }}
                style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#eef2ff', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
                <Edit2 size={12} color={ANN_ACCENT} strokeWidth={2.5} />
                <Text style={{ fontSize: 12, fontWeight: '800', color: ANN_ACCENT }}>Edit</Text>
              </TouchableOpacity>
              {isDelConfirm ? (
                <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity onPress={() => setDeleteConfirmId(null)} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748b' }}>No</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { deleteAnnouncement?.(a.id); setExpandedId(null); setDeleteConfirmId(null); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); }}
                    style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>Yes, delete</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={(e) => { e.stopPropagation(); setDeleteConfirmId(a.id); }}
                  style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fee2e2', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
                  <Trash2 size={12} color="#ef4444" strokeWidth={2.5} />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#ef4444' }}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const AnnouncementBoardModal = ({ visible, onClose, announcements, addAnnouncement, updateAnnouncement, deleteAnnouncement, currentUser }: {
  visible: boolean; onClose: () => void; announcements: any[];
  addAnnouncement?: (a: any) => void;
  updateAnnouncement?: (id: string, updates: any) => void;
  deleteAnnouncement?: (id: string) => void;
  currentUser?: string;
}) => {
  const opacity = useSharedValue(0);
  const [composing, setComposing] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [expiryDays, setExpiryDays] = useState(7);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editExpiry, setEditExpiry] = useState(7);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      setComposing(false); setExpandedId(null); setDeleteConfirmId(null); setEditingId(null);
    }
  }, [visible]);
  const cardStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const handlePost = () => {
    if (!newTitle.trim() || !addAnnouncement) return;
    addAnnouncement({
      title: newTitle.trim(), content: newBody.trim() || undefined,
      type: 'info', author: currentUser ?? 'Me',
      expiresAt: Date.now() + expiryDays * 86400000,
      style: 'plain', color: ANN_ACCENT,
    });
    setNewTitle(''); setNewBody(''); setExpiryDays(7);
    setComposing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSaveEdit = (id: string) => {
    if (!editTitle.trim() || !updateAnnouncement) return;
    updateAnnouncement(id, {
      title: editTitle.trim(), content: editBody.trim() || undefined,
      style: 'plain', color: ANN_ACCENT,
      expiresAt: Date.now() + editExpiry * 86400000,
    });
    setEditingId(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[{ flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }, cardStyle]}>
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} />
        <View style={{ backgroundColor: '#fff', borderRadius: 16, width: '100%', maxHeight: '90%', overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 40, elevation: 20 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366f1' }} />
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a', letterSpacing: -0.4 }}>Announcements</Text>
              <View style={{ backgroundColor: '#eef2ff', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#6366f1' }}>{announcements.filter(a => !a.expiresAt || a.expiresAt > Date.now()).length}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {addAnnouncement && (
                <Pressable onPress={() => setComposing(c => !c)} style={{ backgroundColor: composing ? '#6366f1' : '#eef2ff', padding: 7, borderRadius: 16 }}>
                  <Plus size={15} color={composing ? '#fff' : '#6366f1'} strokeWidth={2.5} />
                </Pressable>
              )}
              <Pressable onPress={onClose} style={{ backgroundColor: '#f1f5f9', padding: 7, borderRadius: 16 }}>
                <X size={15} color="#64748b" strokeWidth={2.5} />
              </Pressable>
            </View>
          </View>

          {/* Composer */}
          {composing && (
            <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 10 }}>
              <TextInput value={newTitle} onChangeText={setNewTitle} placeholder="Announcement title..." placeholderTextColor="#94a3b8"
                style={{ fontSize: 14, fontWeight: '700', color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#f8fafc' }} />
              {/* Expiry */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8' }}>Expires in</Text>
                {[1, 3, 7, 14].map(d => (
                  <TouchableOpacity key={d} onPress={() => setExpiryDays(d)} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: expiryDays === d ? '#0f172a' : '#f1f5f9' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: expiryDays === d ? '#fff' : '#64748b' }}>{d}d</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={handlePost} disabled={!newTitle.trim()}
                style={{ backgroundColor: newTitle.trim() ? '#6366f1' : '#e2e8f0', borderRadius: 10, paddingVertical: 11, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: newTitle.trim() ? '#fff' : '#94a3b8' }}>Post Announcement</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Rows — filter out expired announcements */}
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }} showsVerticalScrollIndicator={false}>
            {announcements.filter(a => !a.expiresAt || a.expiresAt > Date.now()).map((a) => (
              <AnnCardRow key={a.id} a={a}
                editTitle={editTitle} editBody={editBody} editExpiry={editExpiry}
                expandedId={expandedId} deleteConfirmId={deleteConfirmId} editingId={editingId}
                setExpandedId={setExpandedId} setDeleteConfirmId={setDeleteConfirmId} setEditingId={setEditingId}
                setEditTitle={setEditTitle} setEditBody={setEditBody} setEditExpiry={setEditExpiry}
                handleSaveEdit={handleSaveEdit} deleteAnnouncement={deleteAnnouncement}
              />
            ))}
          </ScrollView>
        </View>
      </Animated.View>
    </Modal>
  );
};

const AnnouncementTicker = ({ announcements, onShowBoard }: { announcements: any[], onShowBoard: () => void }) => {
  if (!announcements || announcements.length === 0) return null;
  const latest = announcements[0];
  const moreCount = announcements.length - 1;
  return (
    <View className="px-6 mt-4">
      <TouchableOpacity activeOpacity={0.85} onPress={onShowBoard} className="bg-orange-50 border border-orange-100 rounded-[20px] px-4 py-3 flex-row items-center shadow-sm">
        <View className="bg-orange-100 p-2 rounded-xl mr-3"><Megaphone size={16} color="#C2410C" strokeWidth={2.5} /></View>
        <Text className="text-orange-900 font-black text-[13px] tracking-tight flex-1" numberOfLines={1}>{latest.title}</Text>
        {moreCount > 0 ? (
          <View className="bg-orange-200/50 px-2 py-0.5 rounded-full flex-row items-center gap-1 ml-2"><Text className="text-orange-800 font-black text-[10px]">+{moreCount}</Text></View>
        ) : (
          <View className="bg-orange-200/30 w-6 h-6 rounded-full items-center justify-center ml-2"><ArrowRight color="#C2410C" size={12} strokeWidth={3} /></View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const ChoreSummaryGauge = ({ completed, total, onManage }: { completed: number, total: number, onManage: () => void }) => {
  const progress = total > 0 ? completed / total : 0;
  const isDone = completed === total && total > 0;
  const isEmpty = total === 0;

  // Arc params — large arc, 240° sweep starting bottom-left
  const R = 54;
  const ARC_ANGLE = 240;
  const ARC_RAD = (ARC_ANGLE * Math.PI) / 180;
  const circumference = 2 * Math.PI * R;
  const arcLength = circumference * (ARC_ANGLE / 360);

  // Animated arc fill
  const arcProgress = useSharedValue(0);
  useEffect(() => {
    arcProgress.value = withTiming(progress, { duration: 1200, easing: Easing.out(Easing.cubic) });
  }, [progress]);
  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: arcLength * (1 - arcProgress.value),
  }));

  // Pulse on complete
  const pulseScale = useSharedValue(1);
  useEffect(() => {
    if (isDone) pulseScale.value = withSequence(withSpring(1.04, { damping: 4 }), withSpring(1, { damping: 8 }));
  }, [isDone]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale.value }] }));

  // Number count-up
  const countVal = useSharedValue(0);
  useEffect(() => { countVal.value = withTiming(completed, { duration: 900, easing: Easing.out(Easing.quad) }); }, [completed]);
  const countStyle = useAnimatedStyle(() => ({})); // just drives re-render via shared value display

  const motiv = isEmpty ? 'No tasks yet today' : isDone ? 'All done — great work!' : completed === 0 ? "Let's get started" : `${total - completed} left to go`;
  const arcColor = isDone ? '#10b981' : '#6366f1';
  const glowColor = isDone ? '#bbf7d0' : '#e0e7ff';

  // SVG arc path helper: start at 210° (bottom-left), sweep 240°
  const startAngle = 210 * (Math.PI / 180);
  const endAngle = startAngle + ARC_RAD;
  const cx = 70; const cy = 70;
  const x1 = cx + R * Math.cos(startAngle);
  const y1 = cy + R * Math.sin(startAngle);
  const x2 = cx + R * Math.cos(endAngle);
  const y2 = cy + R * Math.sin(endAngle);

  // For AnimatedCircle we use the stroke-dasharray trick on a full circle rotated
  // rotate so arc starts at 210° = rotate(-90+210) = rotate(120) around center
  const svgSize = 140;

  return (
    <Animated.View style={[pulseStyle, { marginHorizontal: 24, marginTop: 16 }]}>
      <TouchableOpacity activeOpacity={0.92} onPress={onManage} style={{ borderRadius: 12, overflow: 'hidden' }}>
        <LinearGradient
          colors={isDone ? ['#f0fdf4', '#dcfce7', '#f0fdf4'] : ['#f5f3ff', '#ede9fe', '#eef2ff']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: 12, padding: 24, borderWidth: 1, borderColor: isDone ? '#bbf7d0' : '#ddd6fe' }}
        >
          {/* Glow blob */}
          <View style={{ position: 'absolute', top: -20, right: -20, width: 140, height: 140, borderRadius: 70, backgroundColor: glowColor, opacity: 0.6 }} />
          <View style={{ position: 'absolute', bottom: -10, left: 10, width: 80, height: 80, borderRadius: 40, backgroundColor: glowColor, opacity: 0.4 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
            {/* Arc gauge */}
            <View style={{ width: svgSize, height: svgSize, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
                {/* Track arc */}
                <SvgCircle
                  cx={svgSize / 2} cy={svgSize / 2} r={R}
                  fill="none"
                  stroke={isDone ? '#bbf7d0' : '#ddd6fe'}
                  strokeWidth={10}
                  strokeDasharray={`${arcLength} ${circumference}`}
                  strokeDashoffset={0}
                  strokeLinecap="round"
                  transform={`rotate(120 ${svgSize / 2} ${svgSize / 2})`}
                />
                {/* Fill arc */}
                <AnimatedCircle
                  cx={svgSize / 2} cy={svgSize / 2} r={R}
                  fill="none"
                  stroke={arcColor}
                  strokeWidth={10}
                  strokeDasharray={arcLength}
                  animatedProps={arcProps}
                  strokeLinecap="round"
                  transform={`rotate(120 ${svgSize / 2} ${svgSize / 2})`}
                />
              </Svg>
              {/* Center content */}
              <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text style={{ fontSize: 28, fontWeight: '900', color: isDone ? '#064e3b' : '#1e1b4b', letterSpacing: -1, lineHeight: 30 }}>{completed}</Text>
                <View style={{ width: 20, height: 1.5, backgroundColor: isDone ? '#6ee7b7' : '#c4b5fd', marginVertical: 3 }} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: isDone ? '#6ee7b7' : '#a5b4fc', lineHeight: 14 }}>{total}</Text>
              </View>
            </View>

            {/* Right content */}
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: isDone ? '#059669' : '#6366f1', textTransform: 'uppercase', letterSpacing: 2 }}>Today&apos;s Tasks</Text>
              <Text style={{ fontSize: 32, fontWeight: '900', color: isDone ? '#064e3b' : '#1e1b4b', letterSpacing: -1.5, lineHeight: 34 }}>
                {Math.round(progress * 100)}<Text style={{ fontSize: 16, fontWeight: '700', color: isDone ? '#6ee7b7' : '#a5b4fc', marginLeft: 2 }}>%</Text>
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: isDone ? '#065f46' : '#4338ca', lineHeight: 16 }}>{motiv}</Text>

              {/* Progress bar */}
              <View style={{ height: 4, backgroundColor: isDone ? '#bbf7d0' : '#ddd6fe', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                <Animated.View style={[
                  useAnimatedStyle(() => ({ width: `${arcProgress.value * 100}%` })),
                  { height: 4, borderRadius: 2, backgroundColor: arcColor }
                ]} />
              </View>

              <Text style={{ fontSize: 10, fontWeight: '700', color: isDone ? '#6ee7b7' : '#a5b4fc', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 2 }}>Tap to manage →</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const DinnerPeek = ({ meal, emoji, onPress }: { meal: string, emoji: string, onPress: () => void }) => {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[GOLDEN_SHADOW, { borderRadius: 12, backgroundColor: '#fff' }]} className="mx-6 mt-6 border border-slate-100">
      <View className="p-6 flex-row items-center gap-5">
        <View className="w-16 h-16 bg-orange-50 rounded-2xl items-center justify-center"><Text style={{ fontSize: 32 }}>{emoji || '🥘'}</Text></View>
        <View className="flex-1">
          <Text className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-1">Tonight&apos;s Dinner</Text>
          <Text className="text-slate-900 font-black text-lg tracking-tight" numberOfLines={1}>{meal || 'Deciding...'}</Text>
          <Text className="text-slate-400 font-bold text-[11px] mt-0.5">Tap for details & recipes</Text>
        </View>
        <View className="bg-slate-50 p-2 rounded-full"><ArrowRightCircle size={20} color="#cbd5e1" /></View>
      </View>
    </TouchableOpacity>
  );
};

// Rounded-rect perimeter: 2*(W - 2r) + 2*(H - 2r) + 2πr  →  for 50×50 box, r=14: ≈172
const GAUGE_SIZE = 50;
const GAUGE_R = 13;
const GAUGE_PERIMETER = 2 * (GAUGE_SIZE - 2 * GAUGE_R) + 2 * (GAUGE_SIZE - 2 * GAUGE_R) + 2 * Math.PI * GAUGE_R;

const DeliveryCard = ({ delivery, onConfirm, currentUser }: { delivery: any, onConfirm: () => void, currentUser: string }) => {
  const confirmedByArr: string[] = Array.isArray(delivery.confirmedBy) ? delivery.confirmedBy : (delivery.confirmedBy ? [delivery.confirmedBy] : []);
  const isConfirmedByMe = confirmedByArr.includes(currentUser);
  const pressProgress = useSharedValue(0);

  const handlePressIn = () => {
    pressProgress.value = withTiming(1, { duration: 600, easing: Easing.linear }, (finished) => {
      if (finished) {
        runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
        runOnJS(onConfirm)();
      }
    });
  };
  const handlePressOut = () => { pressProgress.value = withTiming(0, { duration: 200 }); };

  const animatedRectProps = useAnimatedProps(() => {
    const offset = GAUGE_PERIMETER * (1 - pressProgress.value);
    return {
      strokeDashoffset: offset,
      strokeDasharray: `${GAUGE_PERIMETER} ${GAUGE_PERIMETER}`,
    };
  });

  // HAR-283: show name badges only (no avatar lookup required)
  const confirmers = confirmedByArr.filter(Boolean);

  const needsSign = !!delivery.signatureRequired;

  return (
    <TouchableOpacity activeOpacity={1} onPressIn={handlePressIn} onPressOut={handlePressOut}
      style={{ backgroundColor: needsSign ? '#faf5ff' : 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row' }}
    >
      {/* Left accent bar for signature-required */}
      {needsSign && <View style={{ width: 3, backgroundColor: '#7c3aed', borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }} />}

      <View style={{ flex: 1, padding: 16, flexDirection: 'row', alignItems: 'center' }}>
        {/* Truck icon with border gauge */}
        <View style={{ width: GAUGE_SIZE, height: GAUGE_SIZE, marginRight: 14, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: isConfirmedByMe ? '#ecfdf5' : needsSign ? '#f3e8ff' : '#eef2ff', padding: 13, borderRadius: 14 }}>
            <Truck size={24} color={isConfirmedByMe ? '#10b981' : needsSign ? '#7c3aed' : '#4f46e5'} strokeWidth={2.5} />
          </View>
          <View style={{ position: 'absolute', top: 0, left: 0 }}>
            <Svg width={GAUGE_SIZE} height={GAUGE_SIZE} viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE}`}>
              <SvgRect x="2" y="2" width={GAUGE_SIZE - 4} height={GAUGE_SIZE - 4} rx={GAUGE_R} ry={GAUGE_R} stroke="#e2e8f0" strokeWidth="2.5" fill="none" />
              <AnimatedRect x="2" y="2" width={GAUGE_SIZE - 4} height={GAUGE_SIZE - 4} rx={GAUGE_R} ry={GAUGE_R}
                stroke={isConfirmedByMe ? '#10b981' : needsSign ? '#7c3aed' : '#4f46e5'}
                strokeWidth="2.5" fill="none" strokeLinecap="round" animatedProps={animatedRectProps} />
            </Svg>
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#0f172a', letterSpacing: -0.3 }} numberOfLines={1}>{delivery.item}</Text>
            {confirmers.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                {confirmers.map((name: string) => (
                  <View key={name} style={{ backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 }}>
                    <Text style={{ color: '#15803d', fontWeight: '900', fontSize: 8 }}>{name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#94a3b8', marginBottom: 6 }}>{delivery.carrier} · {delivery.window}</Text>

          {/* Signature banner — prominent, not just a tag */}
          {needsSign && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#ede9fe', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, alignSelf: 'flex-start' }}>
              <HandMetal size={11} color="#6d28d9" strokeWidth={2.5} />
              <Text style={{ fontSize: 10, fontWeight: '900', color: '#6d28d9', textTransform: 'uppercase', letterSpacing: 0.5 }}>Signature required — be home</Text>
            </View>
          )}

          {/* Other tags (no sign tag since it's now prominent above) */}
          {!needsSign && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
              {delivery.isHeavy && <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}><Dumbbell size={9} color="#64748b" /><Text style={{ fontSize: 8, fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Heavy</Text></View>}
              {delivery.isFragile && <View style={{ backgroundColor: '#fffbeb', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#fde68a' }}><ShieldAlert size={9} color="#d97706" /><Text style={{ fontSize: 8, fontWeight: '900', color: '#d97706', textTransform: 'uppercase' }}>Fragile</Text></View>}
              {delivery.isPerishable && <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#bfdbfe' }}><Snowflake size={9} color="#2563eb" /><Text style={{ fontSize: 8, fontWeight: '900', color: '#2563eb', textTransform: 'uppercase' }}>Perishable</Text></View>}
            </View>
          )}
        </View>

        <View style={{ padding: 4, marginLeft: 8 }}>
          <CheckCircle2
            size={26}
            color={isConfirmedByMe ? '#16a34a' : needsSign ? '#a78bfa' : '#d1d5db'}
            fill={isConfirmedByMe ? '#dcfce7' : 'transparent'}
            strokeWidth={2}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const DELIVERY_FILTERS = ['Today', 'Tomorrow', 'All'] as const;
type DeliveryFilter = typeof DELIVERY_FILTERS[number];

const INITIAL_VISIBLE = 1;
const PAGE_SIZE = 3;

// helper: parse window string to sortable hour number
const windowToHour = (win: string) => {
  if (!win || typeof win !== 'string') return 99;
  let clean = win.split(' - ')[0]; // Handle "9 AM - 12 PM" -> "9 AM"
  const parts = clean.split(' ');
  let h = parseInt(parts[0]);
  const isPM = clean.includes('PM');
  if (isPM && h !== 12) h += 12;
  else if (!isPM && h === 12) h = 0;
  return h;
};

// helper: format a date label for "All" view
const formatDeliveryDateLabel = (isoDate: string | undefined) => {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

// Delivery Calendar Modal
const DeliveryCalendarModal = ({ visible, onClose, deliveries }: any) => {
  const scale = useSharedValue(0.88);
  const opacity = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));

  useEffect(() => {
    if (visible) {
      scale.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = 0.88;
      opacity.value = 0;
    }
  }, [visible]);

  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  // Build a map: "YYYY-M-D" -> { hasSig } — parse ISO date parts to avoid UTC off-by-one
  const isoToLocalKey = (iso: string) => {
    const [y, m, d] = iso.split('T')[0].split('-');
    return `${parseInt(y)}-${parseInt(m)}-${parseInt(d)}`;
  };
  const deliveryMap = useMemo(() => {
    const map: Record<string, { hasSig: boolean }> = {};
    (deliveries || []).forEach((d: any) => {
      if (!d?.date) return;
      const key = isoToLocalKey(d.date);
      if (!map[key]) map[key] = { hasSig: false };
      if (d.signatureRequired) map[key].hasSig = true;
    });
    return map;
  }, [deliveries]);

  const today = new Date(); today.setHours(0,0,0,0);
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DAY_NAMES = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={onClose}>
        <Animated.View style={[animStyle, { width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.18, shadowRadius: 40, elevation: 20 }]}>
          <Pressable onPress={e => e.stopPropagation()}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
              <Pressable onPress={prevMonth} style={{ padding: 6 }}><ChevronDown size={18} color="#64748b" style={{ transform: [{ rotate: '90deg' }] }} /></Pressable>
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a' }}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
              <Pressable onPress={nextMonth} style={{ padding: 6 }}><ChevronDown size={18} color="#64748b" style={{ transform: [{ rotate: '-90deg' }] }} /></Pressable>
            </View>
            {/* Day headers */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 4 }}>
              {DAY_NAMES.map(d => <Text key={d} style={{ flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>{d}</Text>)}
            </View>
            {/* Grid */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
              {Array.from({ length: cells.length / 7 }, (_, w) => (
                <View key={w} style={{ flexDirection: 'row', marginBottom: 4 }}>
                  {cells.slice(w * 7, w * 7 + 7).map((day, i) => {
                    if (!day) return <View key={i} style={{ flex: 1 }} />;
                    const cellDate = new Date(viewYear, viewMonth, day);
                    const key = `${viewYear}-${viewMonth + 1}-${day}`;
                    const info = deliveryMap[key];
                    const isToday = cellDate.getTime() === today.getTime();
                    const isPast = cellDate < today;
                    return (
                      <View key={i} style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
                        <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: isToday ? '#eef2ff' : 'transparent', borderWidth: isToday ? 1.5 : 0, borderColor: '#6366f1' }}>
                          <Text style={{ fontSize: 13, fontWeight: isToday ? '900' : '600', color: isPast && !isToday ? '#cbd5e1' : '#0f172a' }}>{day}</Text>
                        </View>
                        <View style={{ height: 14, marginTop: 2, alignItems: 'center', justifyContent: 'center' }}>
                          {info && !info.hasSig && (
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#6366f1' }} />
                          )}
                          {info?.hasSig && (
                            <View style={{ backgroundColor: '#fef3c7', borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1 }}>
                              <Text style={{ fontSize: 7, fontWeight: '900', color: '#d97706', letterSpacing: 0 }}>SIG</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
            {/* Legend */}
            <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'center', paddingBottom: 20, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366f1' }} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>Delivery</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ backgroundColor: '#fef3c7', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 }}>
                  <Text style={{ fontSize: 8, fontWeight: '900', color: '#d97706' }}>SIG</Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>Signature required</Text>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const DeliveryHistoryModal = ({ visible, onClose, deliveries }: any) => {
  const todayMidnight = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const past = useMemo(() => {
    return (deliveries || [])
      .filter((d: any) => {
        if (!d?.date) return false;
        const t = new Date(d.date); t.setHours(0,0,0,0);
        return t < todayMidnight;
      })
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [deliveries, todayMidnight]);

  // Group by month
  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    past.forEach((d: any) => {
      const key = d.date ? new Date(d.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown';
      if (!map[key]) map[key] = [];
      map[key].push(d);
    });
    return Object.entries(map);
  }, [past]);

  const slideY = useSharedValue(700);
  const panGesture = Gesture.Pan()
    .onUpdate((e) => { if (e.translationY > 0) slideY.value = e.translationY; })
    .onEnd((e) => {
      'worklet';
      if (e.translationY > 100 || e.velocityY > 400) runOnJS(onClose)();
      else slideY.value = withSpring(0, { damping: 30, stiffness: 300 });
    });

  useEffect(() => {
    slideY.value = visible
      ? withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) })
      : withTiming(700, { duration: 220, easing: Easing.in(Easing.cubic) });
  }, [visible]);
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: slideY.value }] }));

  const confirmedCount = past.filter((d: any) => (d.confirmedBy?.length ?? 0) > 0).length;

  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[{ backgroundColor: '#f8fafc', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' }, sheetStyle]}>
            {/* Handle */}
            <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 2 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#d1d5db' }} />
            </View>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <History size={16} color="#4f46e5" strokeWidth={2.5} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a', letterSpacing: -0.3 }} numberOfLines={1}>Delivery History</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#94a3b8' }} numberOfLines={1}>{confirmedCount}/{past.length} confirmed · {grouped.length} month{grouped.length !== 1 ? 's' : ''}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} color="#64748b" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            {/* List grouped by month */}
            <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
              {grouped.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                  <Package size={36} color="#e2e8f0" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#94a3b8', marginTop: 12 }}>No past deliveries yet</Text>
                </View>
              ) : grouped.map(([month, items]) => (
                <View key={month}>
                  <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: '900', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: 1 }}>{month}</Text>
                  </View>
                  <View style={{ paddingHorizontal: 16, gap: 8 }}>
                    {items.map((d: any) => (
                      <View key={d.id} style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }} numberOfLines={1}>{d.item ?? 'Package'}</Text>
                            {!!d.carrier && <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 1 }}>{d.carrier}{d.tracking ? ` · ${d.tracking}` : ''}</Text>}
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 3 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8' }}>
                              {d.date ? new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''}
                            </Text>
                            {d.signatureRequired && (
                              <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                <Text style={{ fontSize: 8, fontWeight: '900', color: '#92400e' }}>SIG REQ</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {!!d.window && <Text style={{ fontSize: 10, fontWeight: '600', color: '#94a3b8' }}>{d.window}</Text>}
                          {!!d.window && (d.confirmedBy?.length > 0) && <Text style={{ color: '#e2e8f0', fontSize: 10 }}>·</Text>}
                          {(d.confirmedBy?.length > 0) ? (
                            <View style={{ flexDirection: 'row', gap: 4 }}>
                              {d.confirmedBy.map((n: string) => (
                                <View key={n} style={{ backgroundColor: '#dcfce7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 9, fontWeight: '900', color: '#15803d' }}>{n} ✓</Text>
                                </View>
                              ))}
                            </View>
                          ) : (
                            <View style={{ backgroundColor: '#f8fafc', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ fontSize: 9, fontWeight: '700', color: '#94a3b8' }}>Missed</Text>
                            </View>
                          )}
                        </View>
                        {!!d.notes && <Text style={{ fontSize: 11, fontWeight: '500', color: '#94a3b8', marginTop: 6, fontStyle: 'italic' }}>{d.notes}</Text>}
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
};

const DeliveryTracker = ({ deliveries, onAddPress, onConfirmPresence, currentUser }: any) => {
  const [activeFilter, setActiveFilter] = useState<DeliveryFilter>('Today');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!deliveries) return [];
    const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0);
    const tomorrowMidnight = new Date(todayMidnight); tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1);
    const dayAfterMidnight = new Date(tomorrowMidnight); dayAfterMidnight.setDate(dayAfterMidnight.getDate() + 1);

    const getDynamicDay = (d: any): string => {
      if (!d.date) return d.day ?? 'Upcoming';
      const t = new Date(d.date); t.setHours(0,0,0,0);
      if (t < todayMidnight) return 'History';
      if (t.getTime() === todayMidnight.getTime()) return 'Today';
      if (t.getTime() === tomorrowMidnight.getTime()) return 'Tomorrow';
      return 'Upcoming';
    };

    const base = deliveries.filter((d: any) => {
      if (!d) return false;
      const dynDay = getDynamicDay(d);
      if (activeFilter === 'All') return dynDay !== 'History';
      return dynDay === activeFilter;
    });

    return [...base].sort((a, b) => {
      // 1. Signature required first
      if (a.signatureRequired !== b.signatureRequired) return a.signatureRequired ? -1 : 1;
      // 2. Date if in 'All' view (today ascending)
      if (activeFilter === 'All') {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        if (dateA !== dateB) return dateA - dateB;
      }
      // 4. Start time (window)
      return windowToHour(a.window) - windowToHour(b.window);
    });
  }, [deliveries, activeFilter]);

  const visibleItems = filtered.slice(0, visibleCount);
  const hiddenCount = filtered.length - visibleItems.length;
  const todayMidnightRef = new Date(); todayMidnightRef.setHours(0,0,0,0);
  const todayDeliveries = (deliveries || []).filter((d: any) => {
    if (!d?.date) return d?.day === 'Today';
    const t = new Date(d.date); t.setHours(0,0,0,0);
    return t.getTime() === todayMidnightRef.getTime();
  });
  const unconfirmedCount = todayDeliveries.filter((d: any) => !d?.confirmedBy?.length).length;
  const allConfirmedToday = todayDeliveries.length > 0 && unconfirmedCount === 0;

  const handleFilterPress = (f: DeliveryFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveFilter(f);
    setVisibleCount(INITIAL_VISIBLE);
  };

  return (
    <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 }}>Deliveries</Text>
          <View style={{ backgroundColor: '#f1f5f9', borderRadius: 999, flexDirection: 'row', padding: 3, borderWidth: 1, borderColor: '#e2e8f0', height: 34, alignItems: 'center' }}>
            {DELIVERY_FILTERS.map((f) => (
              <Pressable
                key={f}
                onPress={() => handleFilterPress(f)}
                style={{
                  paddingHorizontal: 9,
                  height: 28,
                  borderRadius: 999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: activeFilter === f ? '#ffffff' : 'transparent',
                  shadowColor: activeFilter === f ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: activeFilter === f ? 0.08 : 0,
                  shadowRadius: 2,
                  elevation: activeFilter === f ? 1 : 0,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '900', textTransform: 'uppercase', color: activeFilter === f ? '#4f46e5' : '#94a3b8' }}>{f === 'Tomorrow' ? 'Tmr' : f}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {/* Merged calendar+history — tap=calendar, hold=history */}
          <View style={{ position: 'relative' }}>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsCalendarOpen(true); }}
              onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setIsHistoryOpen(true); }}
              style={{ backgroundColor: '#f1f5f9', height: 34, paddingHorizontal: 12, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', gap: 6 }}
            >
              <CalendarDays size={13} color="#64748b" strokeWidth={2} />
              <View style={{ width: 1, height: 11, backgroundColor: '#d1d5db' }} />
              <History size={13} color="#64748b" strokeWidth={2} />
            </Pressable>
            <Text style={{ position: 'absolute', top: 36, alignSelf: 'center', fontSize: 7, fontWeight: '700', color: '#cbd5e1', letterSpacing: 0.3, width: 60, textAlign: 'center' }}>tap / hold</Text>
          </View>
          <Pressable
            onPress={onAddPress}
            style={{ backgroundColor: '#4f46e5', width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
          >
            <Plus size={18} color="#fff" strokeWidth={3} />
          </Pressable>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 20, marginBottom: 10 }}>
        {(unconfirmedCount > 0 || allConfirmedToday) && (
          <>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: allConfirmedToday ? '#22c55e' : '#f59e0b' }} />
            <Text style={{ fontSize: 11, fontWeight: '800', color: allConfirmedToday ? '#15803d' : '#92400e', letterSpacing: 0.2 }}>
              {allConfirmedToday ? "All today's deliveries confirmed!" : `${unconfirmedCount} awaiting confirmation today`}
            </Text>
          </>
        )}
      </View>
      {filtered.length === 0 ? (
        <View style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderStyle: 'dashed', borderColor: '#e2e8f0', borderRadius: 12, padding: 32, alignItems: 'center' }}>
          <Package size={32} color="#cbd5e1" />
          <Text style={{ color: '#94a3b8', fontWeight: '700', fontSize: 12, marginTop: 12, textTransform: 'uppercase', letterSpacing: 1.5 }}>No {activeFilter.toLowerCase()} deliveries</Text>
        </View>
      ) : (
        <View style={[GOLDEN_SHADOW, { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden' }]}>
          {visibleItems.map((d: any) => (
            <View key={d.id}>
              {activeFilter === 'All' && (
                <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 2 }}>
                  <Text style={{ fontSize: 9, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                    {formatDeliveryDateLabel(d.date)}
                  </Text>
                </View>
              )}
              <DeliveryCard delivery={d} currentUser={currentUser} onConfirm={() => onConfirmPresence(d.id)} />
            </View>
          ))}
          <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
            {visibleCount > INITIAL_VISIBLE && (
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setVisibleCount(INITIAL_VISIBLE); }}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44, borderRightWidth: hiddenCount > 0 ? 1 : 0, borderRightColor: '#f1f5f9', gap: 4 }}
              >
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Show less</Text>
                <ChevronDown size={13} color="#94a3b8" strokeWidth={2.5} style={{ transform: [{ rotate: '180deg' }] }} />
              </TouchableOpacity>
            )}
            {hiddenCount > 0 && (
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setVisibleCount(c => c + PAGE_SIZE); }}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44, gap: 4 }}
              >
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.5 }}>Show {Math.min(hiddenCount, PAGE_SIZE)} more</Text>
                <ChevronDown size={13} color="#6366f1" strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      <DeliveryHistoryModal visible={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} deliveries={deliveries} />
      <DeliveryCalendarModal visible={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} deliveries={deliveries} />
    </View>
  );
};

const ApprovalCardModal = ({ visible, onClose, pendingApprovals, onApprove, onReject }: any) => {
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const translateY = useSharedValue(0);
  const context = useSharedValue({ y: 0 });
  const insets = useSafeAreaInsets();
  const [currentIdx, setCurrentIdx] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, HEAVY_SPRING);
      setCurrentIdx(0);
      scrollRef.current?.scrollTo({ x: 0, animated: false });
    }
  }, [visible]);
  const handleClose = () => { translateY.value = withTiming(height, { duration: 250 }, (finished) => { if (finished) runOnJS(onClose)(); }); };
  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-10, 10])
    .onStart(() => { context.value = { y: translateY.value }; })
    .onUpdate((e) => { if (e.translationY > 0) translateY.value = e.translationY + context.value.y; })
    .onEnd((e) => { if (e.translationY > 120 || e.velocityY > 500) runOnJS(handleClose)(); else translateY.value = withSpring(0, HEAVY_SPRING); });

  const approvalSheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  if (pendingApprovals.length === 0 && !rejectId) return null;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.55)' }}>
        <Pressable style={{ flex: 1 }} onPress={handleClose} />
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[{ backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: insets.bottom + 24, maxHeight: '90%' }, approvalSheetStyle]}>
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}><View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0' }} /></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 }}>
              <View><Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a' }}>Inbox Review</Text><Text style={{ fontSize: 12, fontWeight: '600', color: '#94a3b8', marginTop: 2 }}>{pendingApprovals.length} pending</Text></View>
              <TouchableOpacity onPress={handleClose} style={{ backgroundColor: '#f1f5f9', padding: 10, borderRadius: 20 }}><X size={18} color="#64748b" /></TouchableOpacity>
            </View>
            <ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ height: 440 }} onMomentumScrollEnd={e => setCurrentIdx(Math.round(e.nativeEvent.contentOffset.x / width))}>
              {pendingApprovals.map((p: any) => (
                <View key={p.id} style={{ width, height: 440, paddingHorizontal: 20, justifyContent: 'space-between' }}>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}><View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20 }}>{p.avatar ?? '👤'}</Text></View><View><Text style={{ fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Submitted by</Text><Text style={{ fontSize: 15, fontWeight: '900', color: '#0f172a' }}>{p.kid}</Text></View><View style={{ marginLeft: 'auto', backgroundColor: '#eef2ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}><Text style={{ fontSize: 12, fontWeight: '900', color: '#6366f1' }}>+{p.points} pts</Text></View></View>
                    <View style={{ height: 68, justifyContent: 'center', marginBottom: 16 }}>
                      <Text style={{ fontSize: 24, fontWeight: '900', color: '#0f172a' }} numberOfLines={2}>{p.title}</Text>
                    </View>
                    <View style={{ height: 180, backgroundColor: '#f8fafc', borderRadius: 20, marginBottom: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' }}>{p.photos?.[0] ? <Image source={{ uri: p.photos[0] }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <ImageIcon size={36} color="#cbd5e1" />}</View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12 }}><TouchableOpacity onPress={() => setRejectId(p.id)} style={{ flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 16, borderRadius: 16, alignItems: 'center' }}><Text style={{ fontSize: 14, fontWeight: '800', color: '#64748b' }}>Needs Work</Text></TouchableOpacity><TouchableOpacity onPress={() => onApprove(p.id)} style={{ flex: 2, backgroundColor: '#4f46e5', paddingVertical: 16, borderRadius: 16, alignItems: 'center' }}><Text style={{ fontSize: 14, fontWeight: '800', color: 'white' }}>Well Done! ✓</Text></TouchableOpacity></View>
                </View>
              ))}
            </ScrollView>
            {pendingApprovals.length > 1 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 }}>
                {pendingApprovals.map((_: any, i: number) => (
                  <View key={i} style={{ height: 6, width: currentIdx === i ? 18 : 6, borderRadius: 3, backgroundColor: currentIdx === i ? '#6366f1' : '#e2e8f0' }} />
                ))}
              </View>
            )}
          </Animated.View>
        </GestureDetector>
      </View>
      <Modal visible={!!rejectId} transparent animationType="fade"><View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}><View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: insets.bottom + 24 }}><Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a' }}>Send feedback</Text><TextInput value={rejectReason} onChangeText={setRejectReason} placeholder="e.g. Please wipe the counters too!" multiline style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, minHeight: 100, fontSize: 14, color: '#0f172a', marginVertical: 20 }} /><View style={{ flexDirection: 'row', gap: 12 }}><TouchableOpacity onPress={() => setRejectId(null)} style={{ flex: 1, paddingVertical: 16, alignItems: 'center' }}><Text style={{ fontSize: 14, fontWeight: '700', color: '#94a3b8' }}>Cancel</Text></TouchableOpacity><TouchableOpacity onPress={() => { onReject(rejectId!, rejectReason); setRejectId(null); setRejectReason(''); }} style={{ flex: 2, backgroundColor: '#0f172a', paddingVertical: 16, borderRadius: 16, alignItems: 'center' }}><Text style={{ fontSize: 14, fontWeight: '800', color: 'white' }}>Send Feedback</Text></TouchableOpacity></View></View></View></Modal>
    </Modal>
  );
};

const CALENDAR_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CALENDAR_DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const HOURS = ['1','2','3','4','5','6','7','8','9','10','11','12'];

const MiniCalendar = ({ selectedDate, onSelect }: { selectedDate: Date; onSelect: (d: Date) => void }) => {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  const today = new Date(); today.setHours(0,0,0,0);
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({length: daysInMonth}, (_,i) => i+1)];

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); };

  return (
    <View style={{ backgroundColor: '#f8fafc', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Pressable onPress={prevMonth} style={{ padding: 6 }}><Text style={{ fontSize: 18, color: '#64748b' }}>‹</Text></Pressable>
        <Text style={{ fontWeight: '900', fontSize: 14, color: '#0f172a' }}>{CALENDAR_MONTHS[viewMonth]} {viewYear}</Text>
        <Pressable onPress={nextMonth} style={{ padding: 6 }}><Text style={{ fontSize: 18, color: '#64748b' }}>›</Text></Pressable>
      </View>
      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
        {CALENDAR_DAYS.map(d => (
          <View key={d} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>{d}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((day, i) => {
          if (!day) return <View key={`e${i}`} style={{ width: '14.28%' }} />;
          const thisDate = new Date(viewYear, viewMonth, day); thisDate.setHours(0,0,0,0);
          const isPast = thisDate < today;
          const isSelected = selectedDate.getFullYear() === viewYear && selectedDate.getMonth() === viewMonth && selectedDate.getDate() === day;
          const isToday = thisDate.getTime() === today.getTime();
          return (
            <Pressable
              key={day}
              onPress={() => !isPast && onSelect(new Date(viewYear, viewMonth, day))}
              style={{ width: '14.28%', alignItems: 'center', paddingVertical: 5 }}
            >
              <View style={{
                width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                backgroundColor: isSelected ? '#4f46e5' : isToday ? '#eef2ff' : 'transparent',
              }}>
                <Text style={{ fontSize: 13, fontWeight: isSelected || isToday ? '900' : '500', color: isSelected ? '#fff' : isPast ? '#cbd5e1' : isToday ? '#4f46e5' : '#0f172a' }}>{day}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const AddDeliveryModal = ({ visible, onClose, onAdd }: any) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const translateY = useSharedValue(600);
  const panCtx = useSharedValue(0);
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
    } else {
      translateY.value = 600;
    }
  }, [visible]);

  const dismiss = useCallback(() => { onClose(); }, [onClose]);

  const panGesture = Gesture.Pan()
    .onStart(() => { panCtx.value = translateY.value; })
    .onUpdate((e) => { if (e.translationY > 0) translateY.value = e.translationY + panCtx.value; })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 600) {
        translateY.value = withTiming(700, { duration: 250 }, () => { runOnJS(dismiss)(); });
      } else {
        translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
      }
    });

  const [carrier, setCarrier] = useState('');
  const [item, setItem] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [showCalendar, setShowCalendar] = useState(false);
  const [startH, setStartH] = useState('9');
  const [startA, setStartA] = useState<'AM'|'PM'>('AM');
  const [endH, setEndH] = useState('5');
  const [endA, setEndA] = useState<'AM'|'PM'>('PM');
  const [heavy, setHeavy] = useState(false);
  const [fragile, setFragile] = useState(false);
  const [perish, setPerish] = useState(false);
  const [sig, setSig] = useState(false);

  const reset = () => {
    const t = new Date(); t.setHours(0,0,0,0);
    setCarrier(''); setItem(''); setSelectedDate(t); setShowCalendar(false);
    setStartH('9'); setStartA('AM'); setEndH('5'); setEndA('PM');
    setHeavy(false); setFragile(false); setPerish(false); setSig(false);
  };

  const formatDate = (d: Date) => {
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getDay = (d: Date): string => {
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return 'Upcoming';
  };

  const handleClose = useCallback(() => { reset(); onClose(); }, [onClose]);

  const toMin = (h: string, ap: 'AM'|'PM') => {
    let n = parseInt(h) % 12;
    if (ap === 'PM') n += 12;
    return n * 60;
  };
  const timeValid = toMin(endH, endA) > toMin(startH, startA);

  const handleAdd = () => {
    if (!item || !carrier || !timeValid) return;
    onAdd({ carrier, item, window: `${startH} ${startA} - ${endH} ${endA}`, day: getDay(selectedDate), date: selectedDate.toISOString(), isHeavy: heavy, isFragile: fragile, isPerishable: perish, signatureRequired: sig });
    handleClose();
  };

  const HourPicker = ({ value, ampm, onHour, onAmPm }: any) => {
    const idx = HOURS.indexOf(value);
    const prev = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onHour(HOURS[(idx - 1 + HOURS.length) % HOURS.length]); };
    const next = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onHour(HOURS[(idx + 1) % HOURS.length]); };
    const handleTextChange = (t: string) => {
      const n = parseInt(t);
      if (t === '') { onHour('1'); return; }
      if (!isNaN(n) && n >= 1 && n <= 12) onHour(String(n));
    };
    return (
      <View style={{ flexDirection: 'row', alignItems: 'stretch', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, height: 50, overflow: 'hidden' }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={prev} style={{ paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Text style={{ fontSize: 18, color: '#64748b', fontWeight: '300' }}>‹</Text>
          </Pressable>
          <TextInput
            value={value}
            onChangeText={handleTextChange}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
            style={{ flex: 1, fontSize: 18, fontWeight: '900', color: '#0f172a', textAlign: 'center' }}
          />
          <Pressable onPress={next} style={{ paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Text style={{ fontSize: 18, color: '#64748b', fontWeight: '300' }}>›</Text>
          </Pressable>
        </View>
        <View style={{ borderLeftWidth: 1, borderLeftColor: '#e2e8f0', flexDirection: 'column', width: 48 }}>
          {(['AM', 'PM'] as const).map(a => (
            <Pressable key={a} onPress={() => onAmPm(a)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: ampm === a ? '#4f46e5' : 'transparent' }}>
              <Text style={{ fontSize: 10, fontWeight: '900', color: ampm === a ? '#fff' : '#94a3b8' }}>{a}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="none" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={handleClose} />
        <GestureDetector gesture={panGesture}>
        <Animated.View style={[sheetStyle, { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '92%' }]}>
          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0' }} />
          </View>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
            <View>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>New Entry</Text>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#0f172a' }}>Expected Delivery</Text>
            </View>
            <Pressable onPress={handleClose} style={{ backgroundColor: '#f1f5f9', padding: 8, borderRadius: 20 }}>
              <X size={20} color="#64748b" />
            </Pressable>
          </View>

          <ScrollView style={{ paddingHorizontal: 24 }} contentContainerStyle={{ paddingTop: 20, paddingBottom: 24, gap: 20 }} showsVerticalScrollIndicator={false}>

            {/* Item */}
            <View>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>What&apos;s arriving?</Text>
              <TextInput value={item} onChangeText={setItem} placeholder="e.g. Coffee Grinder, Couch..." placeholderTextColor="#cbd5e1" style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, fontSize: 15, fontWeight: '700', color: '#0f172a' }} />
            </View>

            {/* Carrier */}
            <View>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Carrier</Text>
              <TextInput value={carrier} onChangeText={setCarrier} placeholder="Amazon, FedEx, UPS..." placeholderTextColor="#cbd5e1" style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, fontSize: 15, fontWeight: '700', color: '#0f172a' }} />
            </View>

            {/* Date picker */}
            <View>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Delivery Date</Text>
              <Pressable onPress={() => setShowCalendar(!showCalendar)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: showCalendar ? '#4f46e5' : '#e2e8f0', borderRadius: 16, padding: 16 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>{formatDate(selectedDate)}</Text>
                <Text style={{ fontSize: 18, color: '#64748b' }}>{showCalendar ? '▲' : '▼'}</Text>
              </Pressable>
              {showCalendar && (
                <View style={{ marginTop: 8 }}>
                  <MiniCalendar selectedDate={selectedDate} onSelect={(d) => { setSelectedDate(d); setShowCalendar(false); }} />
                </View>
              )}
            </View>

            {/* Time window */}
            <View>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Time Window</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', marginBottom: 4, textAlign: 'center' }}>FROM</Text>
                  <HourPicker value={startH} ampm={startA} onHour={setStartH} onAmPm={setStartA} />
                </View>
                <View style={{ paddingTop: 30 }}><Text style={{ fontSize: 18, color: '#cbd5e1', fontWeight: '300' }}>→</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', marginBottom: 4, textAlign: 'center' }}>TO</Text>
                  <HourPicker value={endH} ampm={endA} onHour={setEndH} onAmPm={setEndA} />
                </View>
              </View>
              {!timeValid && (
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#ef4444', marginTop: 6, textAlign: 'center' }}>End time must be after start time</Text>
              )}
            </View>

            {/* Handling */}
            <View>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Handling Notes</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {([
                  { l: 'Heavy', s: heavy, f: setHeavy, icon: '🏋️', color: '#475569', bg: '#f1f5f9', activeBg: '#1e293b', activeColor: '#fff' },
                  { l: 'Fragile', s: fragile, f: setFragile, icon: '⚠️', color: '#d97706', bg: '#fffbeb', activeBg: '#d97706', activeColor: '#fff' },
                  { l: 'Perishable', s: perish, f: setPerish, icon: '❄️', color: '#2563eb', bg: '#eff6ff', activeBg: '#2563eb', activeColor: '#fff' },
                ] as any[]).map(opt => (
                  <Pressable key={opt.l} onPress={() => opt.f(!opt.s)} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 16, backgroundColor: opt.s ? opt.activeBg : opt.bg, borderWidth: 1.5, borderColor: opt.s ? opt.activeBg : 'transparent' }}>
                    <Text style={{ fontSize: 18, marginBottom: 4 }}>{opt.icon}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '900', textTransform: 'uppercase', color: opt.s ? opt.activeColor : opt.color }}>{opt.l}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Signature Required — separate section */}
            <View>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Signature Required?</Text>
              <Pressable
                onPress={() => setSig(!sig)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: sig ? '#faf5ff' : '#f8fafc', borderWidth: 2, borderColor: sig ? '#7c3aed' : '#e2e8f0', borderRadius: 16, padding: 16 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: sig ? '#7c3aed' : '#ede9fe', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 20 }}>✍️</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: sig ? '#5b21b6' : '#475569' }}>Someone must be home</Text>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: sig ? '#7c3aed' : '#94a3b8', marginTop: 1 }}>Carrier requires a signature</Text>
                  </View>
                </View>
                <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: sig ? '#7c3aed' : '#cbd5e1', backgroundColor: sig ? '#7c3aed' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {sig && <Check size={14} color="#fff" strokeWidth={3} />}
                </View>
              </Pressable>
            </View>

          </ScrollView>

          {/* Submit */}
          <View style={{ paddingHorizontal: 24, paddingBottom: 32, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
            <Pressable
              onPress={handleAdd}
              style={{ backgroundColor: item && carrier && timeValid ? '#0f172a' : '#e2e8f0', paddingVertical: 18, borderRadius: 20, alignItems: 'center' }}
            >
              <Text style={{ color: item && carrier && timeValid ? '#fff' : '#94a3b8', fontWeight: '900', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1.5 }}>Add to Family Schedule</Text>
            </Pressable>
          </View>
        </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
};

type MachineIconEntry = { key: string; label: string; component: any };
type MachineIconCategory = { category: string; items: MachineIconEntry[] };

const MACHINE_ICON_CATEGORIES: MachineIconCategory[] = [
  {
    category: 'Laundry',
    items: [
      { key: 'washer',       label: 'Washer',      component: WashingMachine },
      { key: 'dryer',        label: 'Dryer',       component: Wind },
      { key: 'iron',         label: 'Iron',        component: Shirt },
      { key: 'steamer',      label: 'Steamer',     component: Waves },
      { key: 'spray',        label: 'Spray',       component: SprayCan },
    ],
  },
  {
    category: 'Kitchen',
    items: [
      { key: 'dishwasher',   label: 'Dishwasher',  component: Droplets },
      { key: 'microwave',    label: 'Microwave',   component: Microwave },
      { key: 'oven',         label: 'Oven',        component: Flame },
      { key: 'fridge',       label: 'Fridge',      component: Refrigerator },
      { key: 'coffee',       label: 'Coffee',      component: Coffee },
      { key: 'cookpot',      label: 'Cook Pot',    component: CookingPot },
      { key: 'chef',         label: 'Chef',        component: ChefHat },
      { key: 'utensils',     label: 'Utensils',    component: Utensils },
      { key: 'wine',         label: 'Wine',        component: Wine },
    ],
  },
  {
    category: 'Cleaning',
    items: [
      { key: 'vacuum',       label: 'Vacuum',      component: Zap },
      { key: 'robot-vac',    label: 'Robot Vac',   component: Settings },
      { key: 'mop',          label: 'Mop',         component: Droplets },
      { key: 'spray-clean',  label: 'Spray',       component: SprayCan },
      { key: 'bath',         label: 'Bathroom',    component: Bath },
      { key: 'shower',       label: 'Shower',      component: ShowerHead },
      { key: 'toilet',       label: 'Toilet',      component: Toilet },
      { key: 'towel',        label: 'Towel',       component: TowelRack },
      { key: 'mirror',       label: 'Mirror',      component: MirrorRound },
    ],
  },
  {
    category: 'Climate',
    items: [
      { key: 'ac',           label: 'A/C',         component: AirVent },
      { key: 'fan',          label: 'Fan',         component: Fan },
      { key: 'heater',       label: 'Heater',      component: Heater },
      { key: 'thermometer',  label: 'Thermostat',  component: Thermometer },
      { key: 'humidifier',   label: 'Humidifier',  component: Droplets },
      { key: 'purifier',     label: 'Purifier',    component: WindIcon },
      { key: 'dehumid',      label: 'Dehumid',     component: Sun },
    ],
  },
  {
    category: 'Comfort',
    items: [
      { key: 'sofa',         label: 'Sofa',        component: Sofa },
      { key: 'armchair',     label: 'Armchair',    component: Armchair },
      { key: 'bed',          label: 'Bed',         component: BedDouble },
      { key: 'lamp',         label: 'Lamp',        component: Lamp },
      { key: 'light',        label: 'Lighting',    component: Lightbulb },
    ],
  },
  {
    category: 'Entertainment',
    items: [
      { key: 'tv',           label: 'TV',          component: Tv },
      { key: 'speaker',      label: 'Speaker',     component: Speaker },
      { key: 'gaming',       label: 'Gaming',      component: Gamepad2 },
      { key: 'laptop',       label: 'Laptop',      component: Laptop },
      { key: 'monitor',      label: 'Monitor',     component: Monitor },
    ],
  },
  {
    category: 'Fitness',
    items: [
      { key: 'treadmill',    label: 'Treadmill',   component: DumbbellIcon },
      { key: 'bike-fit',     label: 'Bike',        component: Bike },
      { key: 'weights',      label: 'Weights',     component: Weight },
      { key: 'scale-fit',    label: 'Scale',       component: ScaleIcon },
    ],
  },
  {
    category: 'Tools',
    items: [
      { key: 'drill',        label: 'Drill',       component: Drill },
      { key: 'hammer',       label: 'Hammer',      component: Hammer },
      { key: 'wrench',       label: 'Wrench',      component: Wrench },
      { key: 'plug',         label: 'Plug',        component: Plug },
      { key: 'power',        label: 'Power',       component: Power },
      { key: 'timer',        label: 'Timer',       component: Timer },
      { key: 'other',        label: 'Other',       component: Settings },
    ],
  },
];

const MACHINE_ICONS: MachineIconEntry[] = MACHINE_ICON_CATEGORIES.flatMap(c => c.items);

const getMachineIcon = (machine: Machine) => {
  const found = MACHINE_ICONS.find(i => i.key === machine.icon);
  if (found) return found.component;
  if (machine.name === 'Washer') return Shirt;
  if (machine.name === 'Dryer') return Wind;
  if (machine.name === 'Dishwasher') return DishwasherIcon;
  return Monitor;
};

// Quick-pick run time presets in minutes
const RUN_PRESETS = [
  { label: '30m', minutes: 30 },
  { label: '1h',  minutes: 60 },
  { label: '2h',  minutes: 120 },
  { label: '3h',  minutes: 180 },
];

const AddMachineModal = ({ visible, onClose, onAdd }: any) => {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [totalMinutes, setTotalMinutes] = useState(60);
  const [selectedIcon, setSelectedIcon] = useState('washer');
  const [iconCategory, setIconCategory] = useState('Laundry');
  const translateY = useSharedValue(700);

  useEffect(() => {
    if (visible) translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
    else translateY.value = 700;
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  const dismiss = useCallback(() => { onClose(); }, [onClose]);
  const panGesture = Gesture.Pan()
    .onStart(() => {})
    .onUpdate((e) => { if (e.translationY > 0) translateY.value = e.translationY; })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 600) {
        translateY.value = withTiming(700, { duration: 250 }, () => { runOnJS(dismiss)(); });
      } else {
        translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
      }
    });

  const reset = () => { setName(''); setLocation(''); setTotalMinutes(60); setSelectedIcon('washer'); setIconCategory('Laundry'); };

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({ id: `m${Date.now()}`, name: name.trim(), location: location.trim(), runMinutes: totalMinutes, icon: selectedIcon, status: 'Idle', since: null, startedBy: null, usesThisWeek: 0 });
    reset(); onClose();
  };

  const runH = Math.floor(totalMinutes / 60);
  const runM = totalMinutes % 60;

  return (
    <Modal visible={visible} animationType="none" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={() => { reset(); dismiss(); }} />
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[sheetStyle, { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '92%' }]}>
            {/* Drag handle */}
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0' }} />
            </View>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
              <View>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>New Appliance</Text>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#0f172a' }}>Appliance Watch</Text>
              </View>
              <Pressable onPress={() => { reset(); dismiss(); }} style={{ backgroundColor: '#f1f5f9', padding: 8, borderRadius: 20 }}>
                <X size={20} color="#64748b" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24, gap: 22 }} showsVerticalScrollIndicator={false}>

              {/* Icon selector — category tabs + icon row */}
              <View>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Choose Icon</Text>
                {/* Category tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 6, paddingRight: 4 }}>
                  {MACHINE_ICON_CATEGORIES.map(({ category }) => {
                    const active = iconCategory === category;
                    return (
                      <Pressable key={category} onPress={() => setIconCategory(category)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: active ? '#4f46e5' : '#f1f5f9', borderWidth: 1, borderColor: active ? '#4f46e5' : '#e2e8f0' }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: active ? '#fff' : '#64748b' }}>{category}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                {/* Icons for selected category */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
                  {(MACHINE_ICON_CATEGORIES.find(c => c.category === iconCategory)?.items ?? []).map(({ key, label, component: IconComp }) => {
                    const active = selectedIcon === key;
                    return (
                      <Pressable
                        key={key}
                        onPress={() => { setSelectedIcon(key); }}
                        style={{ alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: active ? '#eef2ff' : '#f8fafc', borderWidth: 1.5, borderColor: active ? '#4f46e5' : '#f1f5f9', minWidth: 68 }}
                      >
                        <IconComp size={22} color={active ? '#4f46e5' : '#94a3b8'} strokeWidth={2} />
                        <Text style={{ fontSize: 9, fontWeight: '800', color: active ? '#4f46e5' : '#94a3b8', marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Name */}
              <View>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Appliance Name</Text>
                <TextInput value={name} onChangeText={setName} placeholder="e.g. Main Floor Washer" placeholderTextColor="#cbd5e1" style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, fontSize: 15, fontWeight: '700', color: '#0f172a' }} />
              </View>

              {/* Location */}
              <View>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Location</Text>
                <TextInput value={location} onChangeText={setLocation} placeholder="e.g. Basement, Kitchen..." placeholderTextColor="#cbd5e1" style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, fontSize: 15, fontWeight: '700', color: '#0f172a' }} />
              </View>

              {/* Run time — presets + fine-tune */}
              <View>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Typical Run Time</Text>

                {/* Preset chips */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {RUN_PRESETS.map(({ label, minutes }) => {
                    const active = totalMinutes === minutes;
                    return (
                      <Pressable
                        key={label}
                        onPress={() => setTotalMinutes(minutes)}
                        style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: active ? '#4f46e5' : '#f1f5f9', borderWidth: 1, borderColor: active ? '#4f46e5' : '#e2e8f0' }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '800', color: active ? '#fff' : '#64748b' }}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Fine-tune display + stepper */}
                <View style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748b' }}>Custom</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    {/* Hours */}
                    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}>
                      <Pressable onPress={() => setTotalMinutes(m => Math.max(0, m - 60))} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 18, color: '#475569', fontWeight: '600', lineHeight: 20 }}>−</Text>
                      </Pressable>
                      <View style={{ alignItems: 'center', minWidth: 36 }}>
                        <Text style={{ fontSize: 22, fontWeight: '900', color: '#0f172a' }}>{runH}</Text>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>hr</Text>
                      </View>
                      <Pressable onPress={() => setTotalMinutes(m => Math.min(720, m + 60))} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 18, color: '#475569', fontWeight: '600', lineHeight: 20 }}>+</Text>
                      </Pressable>
                    </View>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: '#cbd5e1' }}>:</Text>
                    {/* Minutes */}
                    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}>
                      <Pressable onPress={() => setTotalMinutes(m => Math.max(0, m - 5))} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 18, color: '#475569', fontWeight: '600', lineHeight: 20 }}>−</Text>
                      </Pressable>
                      <View style={{ alignItems: 'center', minWidth: 36 }}>
                        <Text style={{ fontSize: 22, fontWeight: '900', color: '#0f172a' }}>{String(runM).padStart(2,'0')}</Text>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>min</Text>
                      </View>
                      <Pressable onPress={() => setTotalMinutes(m => Math.min(720, m + 5))} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 18, color: '#475569', fontWeight: '600', lineHeight: 20 }}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>

            </ScrollView>

            <View style={{ paddingHorizontal: 24, paddingBottom: 32, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
              <Pressable onPress={handleAdd} style={{ backgroundColor: name.trim() ? '#0f172a' : '#e2e8f0', paddingVertical: 18, borderRadius: 20, alignItems: 'center' }}>
                <Text style={{ color: name.trim() ? '#fff' : '#94a3b8', fontWeight: '900', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1.5 }}>Add to Appliance Watch</Text>
              </Pressable>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
};

const CONFIRM_DURATION = 1000;
const CARD_HEIGHT = 110;

const DraggableMachineList = ({ machines, toggleMachineStatus, onAdd, onEdit, onDelete, setMachines }: any) => {
  const handleReorder = useCallback((from: number, to: number) => {
    if (from === to) return;
    setMachines((prev: any[]) => {
      const next = [...prev];
      const [removed] = next.splice(from, 1);
      next.splice(to, 0, removed);
      return next;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [setMachines]);

  return (
    <View style={{ marginTop: 16, paddingHorizontal: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <View>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 }}>Appliance Watch</Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#94a3b8', marginTop: 2 }}>Long press to reorder · Swipe to edit</Text>
        </View>
        <Pressable onPress={onAdd} style={{ backgroundColor: '#4f46e5', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}>
          <Plus size={18} color="#fff" strokeWidth={3} />
        </Pressable>
      </View>

      <View style={{ height: Math.ceil(machines.length / 2) * (CARD_HEIGHT + 12), position: 'relative' }}>
        {machines.map((m: any, index: number) => (
          <DraggableMachineCard
            key={m.id}
            machine={m}
            index={index}
            totalCount={machines.length}
            onToggle={toggleMachineStatus}
            onEdit={onEdit}
            onDelete={onDelete}
            onReorder={handleReorder}
          />
        ))}
      </View>
    </View>
  );
};

const DraggableMachineCard = ({ machine, index, totalCount, onToggle, onEdit, onDelete, onReorder }: any) => {
  const COL_GAP = 12;
  const ROW_GAP = 12;
  const CARD_WIDTH = (width - 48 - COL_GAP) / 2;

  const getX = (i: number) => (i % 2) * (CARD_WIDTH + COL_GAP);
  const getY = (i: number) => Math.floor(i / 2) * (CARD_HEIGHT + ROW_GAP);

  // Track current index via ref so gesture callbacks don't capture stale closure value
  const currentIndexRef = useRef(index);
  useEffect(() => { currentIndexRef.current = index; }, [index]);

  const x = useSharedValue(getX(index));
  const y = useSharedValue(getY(index));
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const zIndex = useSharedValue(1);
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const activeIndex = useSharedValue(index);

  useEffect(() => {
    if (!isDragging.value) {
      x.value = withSpring(getX(index), { damping: 25, stiffness: 250 });
      y.value = withSpring(getY(index), { damping: 25, stiffness: 250 });
      activeIndex.value = index;
    }
  }, [index, isDragging.value]);

  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value }
    ],
    zIndex: zIndex.value,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: shadowOpacity.value,
    shadowRadius: 15,
    elevation: zIndex.value > 1 ? 5 : 0,
  }));

  const [isDraggingState, setIsDraggingState] = useState(false);
  const didDragRef = useRef(false);
  const setDidDrag = useCallback((v: boolean) => { didDragRef.current = v; }, []);

  const gesture2 = Gesture.Pan()
    .activateAfterLongPress(400)
    .onStart(() => {
      'worklet';
      isDragging.value = true;
      runOnJS(setIsDraggingState)(true);
      runOnJS(setDidDrag)(true);
      startX.value = x.value;
      startY.value = y.value;
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy);
      zIndex.value = 100;
      scale.value = withTiming(1.05, { duration: 150 });
      shadowOpacity.value = withTiming(0.22);
    })
    .onUpdate((e) => {
      'worklet';
      x.value = startX.value + e.translationX;
      y.value = startY.value + e.translationY;
      const col = Math.max(0, Math.min(1, Math.round(x.value / (CARD_WIDTH + COL_GAP))));
      const row = Math.max(0, Math.round(y.value / (CARD_HEIGHT + ROW_GAP)));
      const newIndex = Math.min(totalCount - 1, row * 2 + col);
      if (newIndex !== activeIndex.value) {
        activeIndex.value = newIndex;
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      }
    })
    .onEnd(() => {
      'worklet';
      isDragging.value = false;
      runOnJS(setIsDraggingState)(false);
      // Commit reorder once, then let useEffect([index]) animate to final grid position
      runOnJS(onReorder)(currentIndexRef.current, activeIndex.value);
      x.value = withSpring(startX.value, { damping: 25, stiffness: 250 });
      y.value = withSpring(startY.value, { damping: 25, stiffness: 250 }, () => {
        zIndex.value = 1;
      });
      scale.value = withTiming(1, { duration: 150 });
      shadowOpacity.value = withTiming(0);
    })
    .onFinalize(() => {
      'worklet';
      runOnJS(setDidDrag)(false);
    });

  return (
    <Animated.View style={animatedStyle}>
      <GestureDetector gesture={gesture2}>
        <View style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
          <MachineCard machine={machine} onToggle={(id: string) => { if (isDraggingState || didDragRef.current) return; onToggle(id); }} onEdit={onEdit} onDelete={onDelete} isDragging={isDraggingState} />
        </View>
      </GestureDetector>
    </Animated.View>
  );
};

const MachineCard = ({ machine, onToggle, onEdit, onDelete, isDragging }: { machine: Machine, onToggle: (id: string) => void, onEdit: (m: Machine) => void, onDelete: (id: string) => void, isDragging?: boolean }) => {
  const [confirming, setConfirming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [, forceUpdate] = useState(0);

  // HAR-257: refresh elapsed time every 30s while running
  useEffect(() => {
    if (machine.status !== 'Running' || !machine.since) return;
    const t = setInterval(() => forceUpdate(n => n + 1), 30000);
    return () => clearInterval(t);
  }, [machine.status, machine.since]);

  useEffect(() => {
    if (confirmDelete) {
      const t = setTimeout(() => setConfirmDelete(false), 1000);
      return () => clearTimeout(t);
    }
  }, [confirmDelete]);
  const swipeableRef = useRef<any>(null);
  const isRunning = machine.status === 'Running';
  const gaugeWidth = useSharedValue(0);
  const gaugeStyle = useAnimatedStyle(() => ({ width: `${gaugeWidth.value}%` }));

  useEffect(() => {
    if (confirming) {
      gaugeWidth.value = 100;
      gaugeWidth.value = withTiming(0, { duration: CONFIRM_DURATION, easing: Easing.linear }, (finished) => {
        if (finished) runOnJS(setConfirming)(false);
      });
    } else {
      gaugeWidth.value = 0;
    }
  }, [confirming]);

  const CARD_WIDTH = (width - 48 - 12) / 2; // matches 48% with space-between in 24px padding container

  const renderRightActions = () => (
    <View style={{ width: CARD_WIDTH, height: CARD_HEIGHT, flexDirection: 'row', marginBottom: 12, borderRadius: 12, overflow: 'hidden' }}>
      {/* Edit */}
      <Pressable
        onPress={() => { swipeableRef.current?.close(); onEdit(machine); }}
        style={{ flex: 1, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', gap: 4 }}
      >
        <Edit2 size={20} color="#fff" strokeWidth={2.5} />
        <Text style={{ fontSize: 10, fontWeight: '900', color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>Edit</Text>
      </Pressable>
      {/* Delete */}
      <Pressable
        onPress={() => {
          if (!confirmDelete) { setConfirmDelete(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); return; }
          swipeableRef.current?.close();
          onDelete(machine.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }}
        style={{ flex: 1, backgroundColor: confirmDelete ? '#b91c1c' : '#ef4444', alignItems: 'center', justifyContent: 'center', gap: 4 }}
      >
        <Trash2 size={20} color="#fff" strokeWidth={2.5} />
        <Text style={{ fontSize: 10, fontWeight: '900', color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>{confirmDelete ? 'Sure?' : 'Delete'}</Text>
      </Pressable>
    </View>
  );

  const Icon = getMachineIcon(machine);
  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
      onSwipeableOpen={() => setConfirmDelete(false)}
      containerStyle={{ width: CARD_WIDTH, marginBottom: 12 }}
      enabled={!isDragging}
    >
      <GHPressable
        onPress={() => {
          if (isDragging) return;
          if (isRunning && !confirming) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setConfirming(true); return; }
          onToggle(machine.id); setConfirming(false);
        }}
        style={[GOLDEN_SHADOW, { height: CARD_HEIGHT, borderRadius: 12, backgroundColor: confirming ? '#fef2f2' : 'white', borderWidth: 1, borderColor: confirming ? '#fecaca' : '#E2E8F0', overflow: 'hidden' }]}
      >
        <View style={{ flex: 1, padding: 12, justifyContent: 'space-between' }}>
          {/* Top: icon + name/location */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: isRunning ? '#eef2ff' : '#f8fafc' }}>
              <PulsingIcon isRunning={isRunning}><Icon size={20} color={isRunning ? '#4F46E5' : '#94A3B8'} strokeWidth={2.5} /></PulsingIcon>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: confirming ? '#ef4444' : '#0f172a', letterSpacing: -0.3 }} numberOfLines={1}>{confirming ? 'Stop?' : machine.name}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginTop: 2 }} numberOfLines={1}>at {machine.location || '—'}</Text>
            </View>
            {isRunning && !confirming && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' }} />}
          </View>
          {/* Bottom: status pill */}
          {(() => {
            if (confirming) {
              return (
                <View style={{ alignSelf: 'stretch', backgroundColor: '#fef2f2', borderRadius: 12, paddingVertical: 6, alignItems: 'center', borderWidth: 1, borderColor: '#fecaca' }}>
                  <Text style={{ fontSize: 11, fontWeight: '900', color: '#ef4444', textTransform: 'uppercase', letterSpacing: 1 }}>Tap to stop</Text>
                </View>
              );
            }
            if (isRunning && machine.since) {
              const elapsedMs = Date.now() - machine.since;
              const elapsedMin = elapsedMs / 60000;
              const typical = machine.runMinutes || 60;
              const pct = elapsedMin / typical;

              let colors: [string, string] = ['#eef2ff', '#e0e7ff']; // Default blue
              let dotColor = '#6366f1';
              let textColor = '#4338ca';
              let tierLabel = 'Running';

              if (pct > 1.1) {
                colors = ['#fef2f2', '#fee2e2']; dotColor = '#ef4444'; textColor = '#b91c1c'; tierLabel = 'Overdue';
              } else if (pct > 0.9) {
                colors = ['#fffbeb', '#fef3c7']; dotColor = '#f59e0b'; textColor = '#b45309'; tierLabel = 'Almost';
              } else if (pct > 0.7) {
                colors = ['#f0fdf4', '#dcfce7']; dotColor = '#22c55e'; textColor = '#15803d'; tierLabel = 'Almost';
              } else if (pct >= 1.0) {
                colors = ['#f0fdf4', '#dcfce7']; dotColor = '#22c55e'; textColor = '#15803d'; tierLabel = 'Done';
              }

              return (
                <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ alignSelf: 'stretch', borderRadius: 12, paddingVertical: 6, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
                  <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: dotColor, opacity: 0.7 }} />
                  <Text style={{ fontSize: 15, fontWeight: '900', color: textColor, letterSpacing: -0.5 }}>{formatElapsed(machine.since)}</Text>
                  <View style={{ backgroundColor: dotColor + '22', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 8, fontWeight: '900', color: textColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>{tierLabel}</Text>
                  </View>
                </LinearGradient>
              );
            }
            return (
              <View style={{ alignSelf: 'stretch', backgroundColor: '#f8fafc', borderRadius: 12, paddingVertical: 6, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: 1.5 }}>Idle</Text>
              </View>
            );
          })()}
        </View>
        {/* Drain gauge — absolute so it never shifts layout */}
        <Animated.View style={[gaugeStyle, { position: 'absolute', bottom: 0, left: 0, height: 3, backgroundColor: '#ef4444' }]} />
        {confirming && <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: '#fecaca', zIndex: -1 }} />}
      </GHPressable>
    </Swipeable>
  );
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEAL_TYPES: { key: DayMenu['type']; label: string; emoji: string }[] = [
  { key: 'home', label: 'Home Cook', emoji: '🍳' },
  { key: 'to_go', label: 'Takeout', emoji: '🥡' },
  { key: 'dining_out', label: 'Dine Out', emoji: '🍽️' },
  { key: 'leftovers', label: 'Leftovers', emoji: '📦' },
];

const WeeklyMenuModal = ({ visible, onClose, weekMenu, updateWeekMenu, recipes, currentUser, familyMembers }: {
  visible: boolean; onClose: () => void;
  weekMenu: WeekMenu; updateWeekMenu: (u: Partial<WeekMenu>) => void;
  recipes: any[]; currentUser: string; familyMembers: any[];
}) => {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<'votes' | 'nextWeek' | 'edit'>('votes');
  const translateY = useSharedValue(800);
  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const [editDay, setEditDay] = useState<string | null>(null);
  const [editData, setEditData] = useState<DayMenu>({ type: 'home' });

  useEffect(() => {
    if (visible) {
      setView('votes');
      translateY.value = withSpring(0, { damping: 28, stiffness: 280 });
    } else {
      translateY.value = withTiming(800, { duration: 250 });
    }
  }, [visible]);

  const close = () => {
    translateY.value = withTiming(800, { duration: 250 }, (done) => { if (done) runOnJS(onClose)(); });
  };

  const sortedRecipes = useMemo(() => [...recipes].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0)), [recipes]);

  const handleVote = (recipeId: string) => {
    // toggle vote for current user on recipe — handled via store callback
    Haptics.selectionAsync();
  };

  const startEdit = (day: string) => {
    setEditDay(day);
    setEditData(weekMenu[day] ?? { type: 'home' });
    setView('edit');
  };

  const saveEdit = () => {
    if (editDay) updateWeekMenu({ [editDay]: editData });
    setView('nextWeek');
    setEditDay(null);
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <View style={{ flex: 1 }}>
        <Pressable style={{ ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={close} />
        <Animated.View style={[panelStyle, { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: insets.bottom + 16, maxHeight: '88%' }]}>
          {/* Drag handle */}
          <View style={{ width: 36, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 }} />
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f1f5f9' }}>
            {view !== 'votes' && (
              <TouchableOpacity onPress={() => setView(view === 'edit' ? 'nextWeek' : 'votes')} style={{ marginRight: 12, padding: 4 }}>
                <ChevronDown size={20} color="#64748b" style={{ transform: [{ rotate: '90deg' }] }} />
              </TouchableOpacity>
            )}
            <Text style={{ flex: 1, fontSize: 18, fontWeight: '900', color: '#0f172a' }}>
              {view === 'votes' ? '🗳️ This Week Vote Results' : view === 'nextWeek' ? '📅 Next Week Menu' : `✏️ Edit ${editDay}`}
            </Text>
            {view === 'votes' && (
              <TouchableOpacity onPress={() => setView('nextWeek')} style={{ backgroundColor: '#6366f1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginRight: 8 }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>Next Week</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={close} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Vote results view */}
          {view === 'votes' && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 10 }}>
              {sortedRecipes.slice(0, 8).map((r, i) => (
                <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: i === 0 ? '#faf5ff' : '#f8fafc', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: i === 0 ? '#c4b5fd' : '#e2e8f0' }}>
                  <Text style={{ fontSize: 22 }}>{r.emoji ?? '🍽️'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>{r.name}</Text>
                    <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{r.cuisine ?? ''} · {r.prepTime ?? ''}</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: i === 0 ? '#7c3aed' : '#334155' }}>{r.votes ?? 0}</Text>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>votes</Text>
                  </View>
                  {i === 0 && <Text style={{ fontSize: 18 }}>🏆</Text>}
                </View>
              ))}
              {sortedRecipes.length === 0 && (
                <Text style={{ textAlign: 'center', color: '#94a3b8', fontWeight: '600', marginTop: 40 }}>No recipes yet — add some in the Recipes tab!</Text>
              )}
            </ScrollView>
          )}

          {/* Next week menu view */}
          {view === 'nextWeek' && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 10 }}>
              {DAYS.map(day => {
                const entry = weekMenu[day];
                const typeObj = MEAL_TYPES.find(t => t.key === (entry?.type ?? 'home'));
                return (
                  <View key={day} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' }}>
                    <View style={{ width: 36 }}>
                      <Text style={{ fontSize: 11, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{day}</Text>
                    </View>
                    <Text style={{ fontSize: 18 }}>{typeObj?.emoji ?? '🍳'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }} numberOfLines={1}>
                        {entry?.recipeName ?? typeObj?.label ?? 'Home Cook'}
                      </Text>
                      {entry?.cook && <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>Chef: {entry.cook}</Text>}
                    </View>
                    <TouchableOpacity onPress={() => startEdit(day)} style={{ backgroundColor: '#f1f5f9', width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                      <Edit2 size={14} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* Edit day view */}
          {view === 'edit' && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 }}>Meal type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {MEAL_TYPES.map(t => (
                  <TouchableOpacity key={t.key} onPress={() => { setEditData(p => ({ ...p, type: t.key, recipeName: t.key !== 'home' ? undefined : p.recipeName })); Haptics.selectionAsync(); }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: editData.type === t.key ? '#6366f1' : '#f1f5f9', borderWidth: 1, borderColor: editData.type === t.key ? '#6366f1' : '#e2e8f0' }}>
                    <Text style={{ fontSize: 16 }}>{t.emoji}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: editData.type === t.key ? '#fff' : '#334155' }}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {editData.type === 'home' && (
                <>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 }}>Recipe (optional)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {sortedRecipes.map(r => (
                      <TouchableOpacity key={r.id} onPress={() => { setEditData(p => ({ ...p, recipeName: r.name })); Haptics.selectionAsync(); }}
                        style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: editData.recipeName === r.name ? '#6366f1' : '#f1f5f9', borderWidth: 1, borderColor: editData.recipeName === r.name ? '#6366f1' : '#e2e8f0', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 14 }}>{r.emoji ?? '🍽️'}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: editData.recipeName === r.name ? '#fff' : '#334155' }}>{r.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              <Text style={{ fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 }}>Chef (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {familyMembers.map((m: any) => (
                  <TouchableOpacity key={m.name} onPress={() => { setEditData(p => ({ ...p, cook: p.cook === m.name ? undefined : m.name })); Haptics.selectionAsync(); }}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: editData.cook === m.name ? '#6366f1' : '#f1f5f9', borderWidth: 1, borderColor: editData.cook === m.name ? '#6366f1' : '#e2e8f0' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: editData.cook === m.name ? '#fff' : '#334155' }}>{m.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TextInput value={editData.note ?? ''} onChangeText={t => setEditData(p => ({ ...p, note: t }))}
                placeholder="Add a note (e.g. no garlic, use leftovers from Tuesday)…"
                placeholderTextColor="#94a3b8" multiline
                style={{ backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 14, fontSize: 14, color: '#0f172a', minHeight: 80 }} />

              <TouchableOpacity onPress={saveEdit} style={{ backgroundColor: '#0f172a', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Save</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const EditMachineModal = ({ visible, machine, onClose, onSave }: { visible: boolean, machine: Machine | null, onClose: () => void, onSave: (m: Machine) => void }) => {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [totalMinutes, setTotalMinutes] = useState(60);
  const [selectedIcon, setSelectedIcon] = useState('washer');
  const [iconCategory, setIconCategory] = useState('Laundry');
  const translateY = useSharedValue(700);

  useEffect(() => {
    if (visible && machine) {
      setName(machine.name);
      setLocation(machine.location || '');
      setTotalMinutes(machine.runMinutes ?? 60);
      setSelectedIcon(machine.icon ?? 'washer');
      const cat = MACHINE_ICON_CATEGORIES.find(c => c.items.some(i => i.key === machine.icon));
      setIconCategory(cat?.category ?? 'Laundry');
      translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
    } else {
      translateY.value = 700;
    }
  }, [visible, machine]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const dismiss = useCallback(() => onClose(), [onClose]);
  const panGesture = Gesture.Pan()
    .onUpdate((e) => { if (e.translationY > 0) translateY.value = e.translationY; })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 600) translateY.value = withTiming(700, { duration: 250 }, () => runOnJS(dismiss)());
      else translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
    });

  const handleSave = () => {
    if (!name.trim() || !machine) return;
    onSave({ ...machine, name: name.trim(), location: location.trim(), runMinutes: totalMinutes, icon: selectedIcon });
    onClose();
  };

  const runH = Math.floor(totalMinutes / 60);
  const runM = totalMinutes % 60;

  return (
    <Modal visible={visible} animationType="none" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={dismiss} />
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[sheetStyle, { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '92%' }]}>
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0' }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
              <View>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>Edit Appliance</Text>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#0f172a' }}>Appliance Watch</Text>
              </View>
              <Pressable onPress={dismiss} style={{ backgroundColor: '#f1f5f9', padding: 8, borderRadius: 20 }}>
                <X size={20} color="#64748b" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24, gap: 22 }} showsVerticalScrollIndicator={false}>
              {/* Icon selector */}
              <View>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Choose Icon</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 6, paddingRight: 4 }}>
                  {MACHINE_ICON_CATEGORIES.map(({ category }) => {
                    const active = iconCategory === category;
                    return (
                      <Pressable key={category} onPress={() => setIconCategory(category)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: active ? '#4f46e5' : '#f1f5f9', borderWidth: 1, borderColor: active ? '#4f46e5' : '#e2e8f0' }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: active ? '#fff' : '#64748b' }}>{category}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
                  {(MACHINE_ICON_CATEGORIES.find(c => c.category === iconCategory)?.items ?? []).map(({ key, label, component: IconComp }) => {
                    const active = selectedIcon === key;
                    return (
                      <Pressable key={key} onPress={() => setSelectedIcon(key)} style={{ alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: active ? '#eef2ff' : '#f8fafc', borderWidth: 1.5, borderColor: active ? '#4f46e5' : '#f1f5f9', minWidth: 68 }}>
                        <IconComp size={22} color={active ? '#4f46e5' : '#94a3b8'} strokeWidth={2} />
                        <Text style={{ fontSize: 9, fontWeight: '800', color: active ? '#4f46e5' : '#94a3b8', marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
              <View>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Appliance Name</Text>
                <TextInput value={name} onChangeText={setName} placeholder="e.g. Main Floor Washer" placeholderTextColor="#cbd5e1" style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, fontSize: 15, fontWeight: '700', color: '#0f172a' }} />
              </View>
              <View>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Location</Text>
                <TextInput value={location} onChangeText={setLocation} placeholder="e.g. Basement, Kitchen..." placeholderTextColor="#cbd5e1" style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, fontSize: 15, fontWeight: '700', color: '#0f172a' }} />
              </View>
              <View>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Typical Run Time</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {RUN_PRESETS.map(({ label, minutes }) => {
                    const active = totalMinutes === minutes;
                    return (
                      <Pressable key={label} onPress={() => setTotalMinutes(minutes)} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: active ? '#4f46e5' : '#f1f5f9', borderWidth: 1, borderColor: active ? '#4f46e5' : '#e2e8f0' }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: active ? '#fff' : '#64748b' }}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748b' }}>Custom</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}>
                      <Pressable onPress={() => setTotalMinutes(m => Math.max(0, m - 60))} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 18, color: '#475569', fontWeight: '600', lineHeight: 20 }}>−</Text></Pressable>
                      <View style={{ alignItems: 'center', minWidth: 36 }}><Text style={{ fontSize: 22, fontWeight: '900', color: '#0f172a' }}>{runH}</Text><Text style={{ fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>hr</Text></View>
                      <Pressable onPress={() => setTotalMinutes(m => Math.min(720, m + 60))} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 18, color: '#475569', fontWeight: '600', lineHeight: 20 }}>+</Text></Pressable>
                    </View>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: '#cbd5e1' }}>:</Text>
                    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}>
                      <Pressable onPress={() => setTotalMinutes(m => Math.max(0, m - 5))} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 18, color: '#475569', fontWeight: '600', lineHeight: 20 }}>−</Text></Pressable>
                      <View style={{ alignItems: 'center', minWidth: 36 }}><Text style={{ fontSize: 22, fontWeight: '900', color: '#0f172a' }}>{String(runM).padStart(2,'0')}</Text><Text style={{ fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>min</Text></View>
                      <Pressable onPress={() => setTotalMinutes(m => Math.min(720, m + 5))} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 18, color: '#475569', fontWeight: '600', lineHeight: 20 }}>+</Text></Pressable>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
            <View style={{ paddingHorizontal: 24, paddingBottom: 32, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
              <Pressable onPress={handleSave} style={{ backgroundColor: name.trim() ? '#0f172a' : '#e2e8f0', paddingVertical: 18, borderRadius: 20, alignItems: 'center' }}>
                <Text style={{ color: name.trim() ? '#fff' : '#94a3b8', fontWeight: '900', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1.5 }}>Save Changes</Text>
              </Pressable>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
};

export default function MissionControlScreen() {
  const insets = useSafeAreaInsets();
  const mainScrollRef = useRef<any>(null);
  const deliverySectionY = useRef(0);
  const [refreshing, setRefreshing] = useState(false);
  const [isAutomationModalOpen, setIsAutomationModalOpen] = useState(false);
  const [activeAutomationId, setActiveAutomationId] = useState<string | null>(null);
  const [automationsExpanded, setAutomationsExpanded] = useState(false);
  const [isApplianceModalOpen, setIsApplianceModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [isAnnouncementBoardOpen, setIsAnnouncementBoardOpen] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [undoItem, setUndoItem] = useState<any>(null);
  const undoTimerRef = useRef<any>(null);
  const [ptsNotify, setPtsNotify] = useState<any>(null);
  const [deferTarget, setDeferTarget] = useState<any>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isWeeklyMenuOpen, setIsWeeklyMenuOpen] = useState(false);
  // HAR-254: automation trigger toast (at screen level so it overlays everything)
  const [autoToast, setAutoToast] = useState<{ item: any; addedIds: string[] } | null>(null);
  const [autoToastDetail, setAutoToastDetail] = useState(false);
  const autoToastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dismissAutoToast = useCallback(() => {
    clearTimeout(autoToastTimerRef.current);
    setAutoToast(null);
  }, []);
  const handleAutomationTriggered = useCallback(({ item, addedIds }: { item: any; addedIds: string[] }) => {
    setAutoToast({ item, addedIds });
    clearTimeout(autoToastTimerRef.current);
    autoToastTimerRef.current = setTimeout(dismissAutoToast, 6000);
  }, [dismissAutoToast]);

  const { session, isDevBypass } = useAuthStore();
  const { familyMembers, currentUser: storeCurrentUser, updateChore, chores, deleteChore, addChore, sections, weekMenu, updateWeekMenu, deliveries, pendingApprovals, approveChore, rejectChore, addDelivery, announcements, goals, updateDelivery, machines: storeMachines, setMachines: setStoreMachines, automations: storeAutomations, setAutomations: setStoreAutomations, updateAutomation, restockItems, walletBag, addAnnouncement, updateAnnouncement, deleteAnnouncement, recipes } = useHuddleStore();

  const refreshHouseholdAfterReview = useCallback(async () => {
    if (!session?.user) return;
    const householdId = await householdApi.getMyHouseholdId(session.user.id);
    if (!householdId) return;
    applyHouseholdSnapshot(await householdData.load(householdId), session.user.id);
  }, [session?.user]);

  const handleApproveChore = useCallback(async (completionId: string) => {
    if (!session || isDevBypass) {
      approveChore(completionId);
      return;
    }

    try {
      await householdApi.approveCompletion(completionId);
      await refreshHouseholdAfterReview();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Unable to approve chore', error instanceof Error ? error.message : 'Please try again.');
    }
  }, [approveChore, isDevBypass, refreshHouseholdAfterReview, session]);

  const handleRejectChore = useCallback(async (completionId: string, reason: string) => {
    if (!session || isDevBypass) {
      rejectChore(completionId, reason);
      return;
    }

    try {
      await householdApi.rejectCompletion(completionId, reason);
      await refreshHouseholdAfterReview();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Unable to send feedback', error instanceof Error ? error.message : 'Please try again.');
    }
  }, [isDevBypass, refreshHouseholdAfterReview, rejectChore, session]);

  // Seed machines/automations from mock data only on first mount if store is empty
  useEffect(() => {
    if (storeMachines.length === 0) setStoreMachines(INITIAL_MACHINES as any);
  }, []);
  useEffect(() => {
    if (storeAutomations.length === 0) setStoreAutomations(MOCK_AUTOMATIONS as any);
  }, []);
  const machines = storeMachines as Machine[];
  const automations = storeAutomations as AutomationType[];
  // Functional-updater shim so child components that call setMachines(prev => ...) still work
  const setMachines = useCallback((updater: Machine[] | ((prev: Machine[]) => Machine[])) => {
    const next = typeof updater === 'function' ? updater(storeMachines as Machine[]) : updater;
    setStoreMachines(next as any);
  }, [storeMachines, setStoreMachines]);
  const setAutomations = useCallback((updater: AutomationType[] | ((prev: AutomationType[]) => AutomationType[])) => {
    const next = typeof updater === 'function' ? updater(storeAutomations as AutomationType[]) : updater;
    setStoreAutomations(next as any);
  }, [storeAutomations, setStoreAutomations]);

  // HAR-260: always use store currentUser (set in family/profile settings); email slug was unreliable
  const currentUser = storeCurrentUser;

  const myTodayChores = useMemo(() => {
    const today = getTodayStr();
    // Only match exact currentUser assignee — do NOT match by pool to avoid showing all Me-pool chores
    return chores.filter(c => c.dueDate === today && c.assignee === currentUser);
  }, [chores, currentUser]);
  const completedCount = useMemo(() => myTodayChores.filter(c => c.status === 'completed').length, [myTodayChores]);

  const digestData = useMemo(() => {
    const urgentRestock = (restockItems ?? []).filter((r: any) => r.isUrgent && !r.isCompleted);
    const todayStr = new Date().toDateString();
    const sigDeliveries = (deliveries ?? []).filter((d: any) => {
      if (!d.signatureRequired) return false;
      const dDate = d.date ? new Date(d.date).toDateString() : null;
      return (dDate === todayStr || d.day === 'Today');
    });
    // HAR-285: "Expiring" = wallet bag items (active) expiring within 48h (ISO expiresDate only)
    const now = Date.now();
    const expiringCount = (walletBag ?? []).filter((b: any) => {
      if (b.status !== 'active' || !b.expiresDate) return false;
      // Only count ISO date strings (starts with digit year) — skip legacy locale strings
      if (!/^\d{4}-/.test(b.expiresDate)) return false;
      try {
        const d = new Date(b.expiresDate);
        if (isNaN(d.getTime())) return false;
        const diff = d.getTime() - now;
        return diff > 0 && diff < 48 * 3600000;
      } catch { return false; }
    }).length;
    return { dueToday: expiringCount, urgentRestock: urgentRestock.length, sigDeliveries: sigDeliveries.length };
  }, [restockItems, deliveries, walletBag]);
  const dayKey = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
  const tonightMealObj = weekMenu[dayKey];
  const tonightMeal = tonightMealObj?.recipeName || tonightMealObj?.type?.replace('_', ' ') || 'Planning...';

  const handleUndo = useCallback(() => {
    if (!undoItem) return; clearTimeout(undoTimerRef.current);
    if (undoItem.action === 'complete') updateChore(undoItem.choreId, { status: 'pending', completedBy: null, completedAt: null });
    else if (undoItem.action === 'delete' && undoItem.originalChore) addChore(undoItem.originalChore);
    setUndoItem(null); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [undoItem, updateChore, addChore]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    // Re-evaluate overdue status on all pending chores
    const today = getTodayStr();
    chores.forEach(c => {
      if (c.status === 'pending' && c.dueDate && c.dueDate < today && !c.isOverdue) {
        updateChore(c.id, { isOverdue: true });
      }
    });
    setRefreshing(false);
  }, [chores, updateChore]);

  return (
    <SafeAreaView className="flex-1 bg-[#FDFCFB]" edges={['top']}>
      <AmbientHUD chores={chores} onProfilePress={() => router.push('/profile')} familyMembers={familyMembers} currentUser={currentUser} />
      <PrototypeNotice screen="Home" />
      <ScrollView ref={mainScrollRef} className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}>

        {announcements?.[0] && (
          <View style={{ paddingHorizontal: 24, marginTop: 12 }}>
            <TouchableOpacity onPress={() => setIsAnnouncementBoardOpen(true)} activeOpacity={0.75} style={{ height: 32, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 12, gap: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#6366f1', flexShrink: 0 }} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', flex: 1 }} numberOfLines={1}>{announcements[0].title}</Text>
              <Text style={{ fontSize: 10, fontWeight: '600', color: '#94a3b8', flexShrink: 0 }}>{announcements[0].author}</Text>
              <ChevronRight size={14} color="#cbd5e1" strokeWidth={2.5} style={{ flexShrink: 0 }} />
            </TouchableOpacity>
          </View>
        )}
        <AnnouncementBoardModal visible={isAnnouncementBoardOpen} onClose={() => setIsAnnouncementBoardOpen(false)} announcements={announcements} addAnnouncement={addAnnouncement} updateAnnouncement={updateAnnouncement} deleteAnnouncement={deleteAnnouncement} currentUser={currentUser} />

        {/* HAR-285: Today digest card — compact ~64px — order: Sig Needed / Restock / Due Today */}
        <View style={{ paddingHorizontal: 24, marginTop: 10, marginBottom: 2 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 }}>
            <TouchableOpacity onPress={() => mainScrollRef.current?.scrollTo({ y: deliverySectionY.current, animated: true })} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: '100%' }}>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: digestData.sigDeliveries > 0 ? '#eff6ff' : '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
                <Truck size={14} color={digestData.sigDeliveries > 0 ? '#3b82f6' : '#94a3b8'} strokeWidth={2.5} />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a', lineHeight: 18 }}>{digestData.sigDeliveries}</Text>
                <Text style={{ fontSize: 8, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, lineHeight: 11 }}>Sig Needed</Text>
              </View>
            </TouchableOpacity>
            <View style={{ width: 1, height: 32, backgroundColor: '#e2e8f0' }} />
            <TouchableOpacity onPress={() => router.push('/restock' as any)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: '100%' }}>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: digestData.urgentRestock > 0 ? '#fee2e2' : '#f0fdf4', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingCart size={14} color={digestData.urgentRestock > 0 ? '#ef4444' : '#16a34a'} strokeWidth={2.5} />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a', lineHeight: 18 }}>{digestData.urgentRestock}</Text>
                <Text style={{ fontSize: 8, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, lineHeight: 11 }}>Restock</Text>
              </View>
            </TouchableOpacity>
            <View style={{ width: 1, height: 32, backgroundColor: '#e2e8f0' }} />
            <TouchableOpacity onPress={() => router.push({ pathname: '/wallet', params: { tab: 'bag' } } as any)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: '100%' }}>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: digestData.dueToday > 0 ? '#fef3c7' : '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingBag size={14} color={digestData.dueToday > 0 ? '#d97706' : '#94a3b8'} strokeWidth={2.5} />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a', lineHeight: 18 }}>{digestData.dueToday}</Text>
                <Text style={{ fontSize: 8, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, lineHeight: 11 }}>Expiring</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <QAInbox isParent={true} count={pendingApprovals.length} onPress={() => setIsApprovalModalOpen(true)} />
        <ChoreSummaryGauge completed={completedCount} total={myTodayChores.length} onManage={() => router.push('/chores?filter=Me')} />
        <View onLayout={(e) => { deliverySectionY.current = e.nativeEvent.layout.y; }}>
          <DeliveryTracker deliveries={deliveries} onAddPress={() => setIsDeliveryModalOpen(true)} currentUser={currentUser} onConfirmPresence={(id: string) => { const d = deliveries.find((x: any) => x.id === id); const existing: string[] = Array.isArray(d?.confirmedBy) ? d.confirmedBy : (d?.confirmedBy ? [d.confirmedBy] : []); const isAlreadyMine = existing.includes(currentUser); const next = isAlreadyMine ? existing.filter(n => n !== currentUser) : [...existing, currentUser]; updateDelivery(id, { confirmedBy: next }); if (!isAlreadyMine) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }} />
        </View>
        <DinnerPeek meal={tonightMeal} emoji={tonightMealObj?.recipeName ? (recipes?.find((r: any) => r.name === tonightMealObj.recipeName)?.emoji ?? '🥘') : (MEAL_TYPES.find(t => t.key === tonightMealObj?.type)?.emoji ?? '🥘')} onPress={() => setIsWeeklyMenuOpen(true)} />
        <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 }}>Automations</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#94a3b8', marginTop: 2 }}>One tap to deploy a full chore set</Text>
            </View>
            <Pressable onPress={() => setIsAutomationModalOpen(true)} style={{ backgroundColor: '#4f46e5', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}>
              <Plus size={18} color="#fff" strokeWidth={3} />
            </Pressable>
          </View>
          <DraggableAutomationList
            automations={automations}
            activeAutomationId={activeAutomationId}
            setActiveAutomationId={setActiveAutomationId}
            addChore={addChore}
            deleteChore={deleteChore}
            setAutomations={setAutomations}
            updateAutomation={updateAutomation}
            currentUser={currentUser}
            automationsExpanded={automationsExpanded}
            setAutomationsExpanded={setAutomationsExpanded}
            onAutomationTriggered={handleAutomationTriggered}
          />
        </View>
        <DraggableMachineList
          machines={machines}
          toggleMachineStatus={(id: string) => { setMachines(prev => prev.map(m => m.id === id ? { ...m, status: m.status === 'Running' ? 'Idle' : 'Running', since: m.status === 'Running' ? null : Date.now() } : m)); }}
          onAdd={() => setIsApplianceModalOpen(true)}
          onEdit={(m: Machine) => setEditingMachine(m)}
          onDelete={(id: string) => setMachines(prev => prev.filter(m => m.id !== id))}
          setMachines={setMachines}
        />
      </ScrollView>
      <ApprovalCardModal visible={isApprovalModalOpen} onClose={() => setIsApprovalModalOpen(false)} pendingApprovals={pendingApprovals} onApprove={handleApproveChore} onReject={handleRejectChore} />
      <AddDeliveryModal visible={isDeliveryModalOpen} onClose={() => setIsDeliveryModalOpen(false)} onAdd={(d: any) => addDelivery(d)} />
      <AddMachineModal visible={isApplianceModalOpen} onClose={() => setIsApplianceModalOpen(false)} onAdd={(m: Machine) => setMachines(prev => [...prev, m])} />
      <EditMachineModal visible={!!editingMachine} machine={editingMachine} onClose={() => setEditingMachine(null)} onSave={(m: Machine) => { setMachines(prev => prev.map(x => x.id === m.id ? m : x)); setEditingMachine(null); }} />
      <AddAutomationModal visible={isAutomationModalOpen} onClose={() => setIsAutomationModalOpen(false)} onAdd={(a: AutomationType) => setAutomations(prev => [...prev, a])} sections={sections} />
      <WeeklyMenuModal visible={isWeeklyMenuOpen} onClose={() => setIsWeeklyMenuOpen(false)} weekMenu={weekMenu} updateWeekMenu={updateWeekMenu} recipes={recipes ?? []} currentUser={currentUser} familyMembers={familyMembers} />
      {deferTarget && <DeferDatePickerModal choreTitle={deferTarget.title} onClose={() => setDeferTarget(null)} onDefer={(d) => { updateChore(deferTarget.id, { dueDate: d, due: d }); setDeferTarget(null); }} />}
      {undoItem && <View style={{ position: 'absolute', bottom: 100, left: 20, right: 20, zIndex: 100 }}><Animated.View entering={FadeInDown.duration(200)} exiting={FadeOut} style={{ backgroundColor: '#1E293B', borderRadius: 18, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center' }}><Text style={{ color: '#E2E8F0', fontSize: 13, fontWeight: '700', flex: 1 }} numberOfLines={1}>&quot;{undoItem.title}&quot; {undoItem.action === 'complete' ? 'done!' : 'updated!'}</Text><TouchableOpacity onPress={handleUndo} style={{ paddingHorizontal: 14, paddingVertical: 6, backgroundColor: COLORS.primary, borderRadius: 10, marginLeft: 12 }}><Text style={{ color: 'white', fontSize: 12, fontWeight: '900' }}>Undo</Text></TouchableOpacity></Animated.View></View>}
      {autoToast && (
        <View style={{ position: 'absolute', bottom: 100, left: 20, right: 20, zIndex: 101 }}>
          <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOut} style={{ backgroundColor: '#1E293B', borderRadius: 18, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 20 }}>{autoToast.item?.emoji ?? '⚡'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#E2E8F0', fontSize: 13, fontWeight: '700' }} numberOfLines={1}>{autoToast.item?.name ?? 'Automation'} triggered</Text>
              <Text style={{ color: '#94A3B8', fontSize: 11 }}>{autoToast.addedIds.length} chore{autoToast.addedIds.length !== 1 ? 's' : ''} added</Text>
            </View>
            <TouchableOpacity onPress={dismissAutoToast} style={{ paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#334155', borderRadius: 10 }}>
              <Text style={{ color: '#E2E8F0', fontSize: 12, fontWeight: '700' }}>OK</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
      {ptsNotify && (
        <PointsEarnedNotification
          points={ptsNotify.points}
          prevTotal={ptsNotify.total - ptsNotify.points}
          newTotal={ptsNotify.total}
          onFinished={() => setPtsNotify(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  orbitOverlay: { position: 'absolute', top: 70, right: 24, width: 200, zIndex: 100 },
  sliderPill: { position: 'absolute', top: 6, left: 6, bottom: 6, width: (width - 48 - 12) / 2, borderRadius: 26 },
  goldenCard: { borderRadius: GOLDEN_RADIUS, padding: 20 },
  automationButton: { minHeight: 52 },
});
