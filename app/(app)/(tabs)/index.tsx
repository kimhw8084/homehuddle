import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Image
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import {
  Home,
  Users,
  Settings,
  Plus,
  ShoppingBasket,
  UtensilsCrossed,
  Coffee,
  Zap,
  CheckCircle2,
  CheckCircle,
  Circle,
  Repeat2,
  UserCheck,
  Flame,
  ArrowRight,
  Clock,
  Shirt,
  Wind,
  Flame as DishwasherIcon,
  Monitor,
  Check,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Camera,
  Image as ImageIcon,
  Edit2,
  BellRing,
  UserPlus,
  LogOut,
  Shield,
  Bell,
  User
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
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
  FadeInRight,
  FadeOut,
  FadeOutUp,
  Layout,
  withDelay,
  useAnimatedScrollHandler,
  interpolateColor
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');

// --- GOLDEN STANDARD CONSTANTS ---
const GOLDEN_RADIUS = 24;
const GOLDEN_SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.04,
  shadowRadius: 12,
  elevation: 2,
};

const GOLDEN_CARD_BASE = "bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800";

// --- MOCK DATA ---
const MOCK_FAMILY = [
  { id: '1', name: 'Dad', status: 'available', streak: 12, avatar: '👨🏻' },
  { id: '2', name: 'Mom', status: 'away', streak: 8, avatar: '👩🏼' },
  { id: '3', name: 'Alex', status: 'available', streak: 4, avatar: '👦🏻' },
  { id: '4', name: 'Sarah', status: 'away', streak: 15, avatar: '👧🏻' },
];

const MOCK_AUTOMATIONS = [
  { id: 'a1', title: 'Weekend Grocery', emoji: '🛒' },
  { id: 'a2', title: 'School Morning', emoji: '🏫' },
  { id: 'a3', title: 'Deep Clean', emoji: '🧹' },
];

const MOCK_CHORES = [
  { id: 'c1', title: "Prep Declan's Bottles", avatar: '🍼', owner: 'Declan', assigner: 'Mom', dateAdded: 'Today', timeLeft: '2h', status: 'pending', assigned_to: 'me-id', photo_req: false, points: 250, estMinutes: 15 },
  { id: 'c2', title: 'Empty Main Trash', avatar: '🗑️', owner: 'Household', assigner: 'System', dateAdded: '1d ago', timeLeft: 'Overdue', status: 'pending', assigned_to: 'me-id', photo_req: true, points: 150, estMinutes: 5 },
  { id: 'c3', title: 'Evening Dog Walk', avatar: '🐕', owner: 'Rex', assigner: 'Dad', dateAdded: 'Today', timeLeft: '4h', status: 'pending', assigned_to: 'me-id', photo_req: true, points: 100, estMinutes: 30 },
  { id: 'c4', title: 'Kitchen Deep Clean', avatar: '🧹', owner: 'Kitchen', assigner: 'Self', dateAdded: 'Today', timeLeft: '8h', status: 'pending', assigned_to: 'me-id', photo_req: false, points: 500, estMinutes: 60 },
];

const MOCK_PENDING = [
  { id: 'p1', title: 'Clean Kitchen', kid: 'Alex', points: 150, submitted: '12m' },
  { id: 'p2', title: 'Mow Lawn', kid: 'Sarah', points: 300, submitted: '45m' },
];

type Machine = {
  id: string;
  name: string;
  status: string;
  since: string | null;
  startedBy: string | null;
  usesThisWeek: number;
};

const INITIAL_MACHINES: Machine[] = [
  { id: 'm1', name: 'Washer', status: 'Running', since: '10:45 AM', startedBy: 'Haewon', usesThisWeek: 4 },
  { id: 'm2', name: 'Dishwasher', status: 'Idle', since: null, startedBy: null, usesThisWeek: 7 },
  { id: 'm3', name: 'Dryer', status: 'Idle', since: null, startedBy: null, usesThisWeek: 3 },
  { id: 'm4', name: 'Robot Vac', status: 'Running', since: '11:15 AM', startedBy: 'Mom', usesThisWeek: 12 },
];

// --- SPRING CONFIGS ---
const HEAVY_SPRING = { damping: 20, stiffness: 90, mass: 1 };
const LIGHT_BOUNCE = { damping: 15, stiffness: 120 };

// --- COMPONENTS ---

const NewsSummary = () => {
  const [index, setIndex] = useState(0);
  const items = [
    "Menu poll in progress • Ends in 2h",
    "Washer is running",
    "3 new market items"
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <TouchableOpacity
      onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      activeOpacity={0.7}
      className="flex-row items-center mt-0.5"
    >
      <View className="bg-indigo-600/10 px-2 py-0.5 rounded-md mr-2">
        <Text className="text-indigo-600 font-black text-[9px] uppercase tracking-wider">News</Text>
      </View>
      <Text className="text-slate-600 dark:text-slate-400 font-bold text-[14px] tracking-tight">
        {items[index]}
      </Text>
    </TouchableOpacity>
  );
};

const AmbientHUD = ({ onProfilePress }: { onProfilePress: () => void }) => {
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
          <NewsSummary />
        </View>

        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={toggleOrbit}
            activeOpacity={0.7}
            style={[GOLDEN_SHADOW, { width: 56, height: 56 }]}
            className="rounded-full bg-white dark:bg-zinc-900 items-center justify-center border border-gray-100 dark:border-zinc-800 mr-3"
          >
            <Users size={24} color="#4F46E5" strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onProfilePress}
            activeOpacity={0.7}
            style={{ width: 56, height: 56 }}
            className="rounded-full border-2 border-white dark:border-zinc-800 shadow-md overflow-hidden"
          >
            <View className="w-full h-full bg-indigo-500 items-center justify-center">
              <Text className="text-xl">👨🏻</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View style={[orbitStyle, styles.orbitOverlay]} className="overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-xl bg-white dark:bg-zinc-900">
        <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint="prominent" className="p-4">
          <Text className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Family Orbit</Text>
          {MOCK_FAMILY.map((member) => (
            <View key={member.id} className="flex-row items-center justify-between py-3 px-2 border-b border-slate-200/10 last:border-0">
              <View className="flex-row items-center">
                <Text className="text-2xl mr-3">{member.avatar}</Text>
                <View>
                  <Text className="text-slate-900 dark:white font-bold">{member.name}</Text>
                  <Text className={`text-[10px] font-black uppercase ${member.status === 'available' ? 'text-green-500' : 'text-slate-400'}`}>
                    {member.status}
                  </Text>
                </View>
              </View>
              <View className="bg-orange-500/10 px-2 py-1 rounded-full flex-row items-center">
                <Flame size={12} color="#F97316" fill="#F97316" />
                <Text className="text-orange-600 font-bold text-xs ml-1">{member.streak}</Text>
              </View>
            </View>
          ))}
        </BlurView>
      </Animated.View>
    </View>
  );
};

const ShiftSlider = () => {
  const [status, setStatus] = useState('available');
  const [isSyncing, setIsSyncing] = useState(false);
  const sliderX = useSharedValue(0);
  const statusIndex = useSharedValue(0);

  const executeUpdate = (newStatus: string, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSyncing(true);
    sliderX.value = withSpring(index * ((width - 48) / 2), HEAVY_SPRING);
    statusIndex.value = withTiming(index, { duration: 250 });

    setTimeout(() => {
      setStatus(newStatus);
      setIsSyncing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 800);
  };

  const updateStatus = (newStatus: string, index: number) => {
    if (isSyncing || status === newStatus) return;

    const label = newStatus === 'available' ? 'Available' : 'Away';
    Alert.alert(
      `Switch to ${label}?`,
      `Are you sure you want to change your status to ${label.toLowerCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Switch', style: 'default', onPress: () => executeUpdate(newStatus, index) }
      ]
    );
  };

  const sliderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sliderX.value }],
    backgroundColor: interpolateColor(
      statusIndex.value,
      [0, 1],
      ['#22c55e', '#64748b']
    )
  }));

  return (
    <View className="bg-slate-100 dark:bg-zinc-900 p-1.5 rounded-[32px] border border-gray-200 dark:border-zinc-800 flex-row h-16 relative">
      <Animated.View style={[sliderStyle, styles.sliderPill]} className="shadow-sm" />
      {['available', 'away'].map((s, i) => {
        const isTarget = status === s;
        const label = s === 'available' ? 'Available' : 'Away';
        return (
          <TouchableOpacity
            key={s}
            onPress={() => updateStatus(s, i)}
            activeOpacity={1}
            className="flex-1 items-center justify-center z-10"
          >
            <Text className={`font-bold tracking-tight ${isTarget && !isSyncing ? 'text-white' : 'text-slate-400'}`}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const QAInbox = () => {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExpanded(!isExpanded);
  };

  const expansionStyle = useAnimatedStyle(() => ({
    height: withSpring(isExpanded ? MOCK_PENDING.length * 76 + 12 : 0, HEAVY_SPRING),
    opacity: withTiming(isExpanded ? 1 : 0),
  }));

  return (
    <View className="px-6 mt-6">
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.85}
        style={[GOLDEN_SHADOW]}
        className="h-[80px] bg-indigo-600 rounded-[32px] px-6 flex-row items-center justify-between"
      >
        <View className="flex-row items-center">
          <View className="w-12 h-12 bg-white/20 rounded-2xl items-center justify-center mr-4">
            <BellRing size={24} color="#FFF" />
          </View>
          <View>
            <Text className="text-xl font-black text-white leading-tight">{MOCK_PENDING.length} Pending</Text>
            <Text className="text-[10px] font-bold text-indigo-100 uppercase tracking-tight">Requires your attention</Text>
          </View>
        </View>
        <View className={`w-8 h-8 rounded-full bg-white/10 items-center justify-center ${isExpanded ? 'rotate-180' : ''}`}>
          <ChevronDown size={20} color="#FFF" />
        </View>
      </TouchableOpacity>

      <Animated.View style={[expansionStyle, { overflow: 'hidden' }]} className="bg-white dark:bg-zinc-900 mt-3 rounded-[32px] border border-gray-100 dark:border-zinc-800 shadow-sm">
        <View className="p-1.5">
          {MOCK_PENDING.map((p) => (
            <TouchableOpacity
              key={p.id}
              className="flex-row items-center justify-between p-4 bg-slate-50/50 dark:bg-zinc-800/50 rounded-2xl mb-1.5 last:mb-0 border border-slate-100/50 dark:border-zinc-700/50"
              onPress={() => router.push('/chores')}
            >
              <View>
                <Text className="font-bold text-slate-900 dark:text-white">{p.title}</Text>
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{p.kid} submitted {p.submitted} ago</Text>
              </View>
              <View className="flex-row items-center">
                <View className="bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg mr-3">
                  <Text className="text-indigo-600 dark:text-indigo-400 font-black text-xs">+{p.points}</Text>
                </View>
                <CheckCircle2 size={22} color="#4F46E5" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </View>
  );
};

const AutomationPill = ({ item, isActive, onActivate, onConfirm, onCancel }: {
  item: any,
  isActive: boolean,
  onActivate: () => void,
  onConfirm: () => void,
  onCancel: () => void
}) => {
  const [fixedWidth, setFixedWidth] = useState<number | undefined>(undefined);

  return (
    <Animated.View>
      <TouchableOpacity
        onPress={isActive ? onConfirm : onActivate}
        onLayout={(e) => {
          if (!isActive && !fixedWidth) setFixedWidth(e.nativeEvent.layout.width);
        }}
        activeOpacity={0.7}
        style={[GOLDEN_SHADOW, { height: 52, minWidth: fixedWidth }]}
        className={`rounded-full border border-gray-100 dark:border-zinc-800 flex-row items-center justify-center px-6 mr-4 ${isActive ? 'bg-indigo-600 border-indigo-500' : 'bg-white dark:bg-zinc-900'}`}
      >
        <Text className="text-xl mr-2">{item.emoji}</Text>
        <Text
          numberOfLines={1}
          className={`font-black tracking-tight text-[13px] uppercase ${isActive ? 'text-white' : 'text-slate-900 dark:text-white'}`}
        >
          {isActive ? 'Confirm' : item.title}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const ChoreCard = ({ chore, currentUser }: { chore: any, currentUser: string }) => {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [completionStep, setCompletionStep] = useState<'idle' | 'confirming' | 'verifying'>('idle');
  const [proofs, setProofs] = useState({ before: false, after: false });

  const isMine = chore.assigned_to === 'me-id';

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExpanded(!isExpanded);
    if (isExpanded) {
      setCompletionStep('idle');
    }
  };

  const handleComplete = () => {
    if (completionStep === 'idle') {
      if (chore.photo_req) {
         setCompletionStep('verifying');
      } else {
         setCompletionStep('confirming');
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (completionStep === 'confirming') {
       Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
       setIsExpanded(false);
       setCompletionStep('idle');
    } else if (completionStep === 'verifying') {
       if (proofs.before && proofs.after) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setIsExpanded(false);
          setCompletionStep('idle');
       } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
       }
    }
  };

  const timeColor = chore.estMinutes > 30 ? '#F97316' : chore.estMinutes > 15 ? '#3B82F6' : '#22C55E';

  return (
    <View className="mr-6">
      <Pressable
        onPress={toggle}
        style={[
          GOLDEN_SHADOW,
          {
            borderColor: isExpanded ? '#4F46E5' : '#F1F5F9',
            borderWidth: isExpanded ? 2 : 1,
            width: 320,
            borderRadius: 32,
          }
        ]}
        className={`${GOLDEN_CARD_BASE} flex-col overflow-hidden p-6`}
      >
        <View className="flex-row items-center justify-between">
           <View className="flex-row items-center flex-1">
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); handleComplete(); }}
                className="mr-4"
              >
                 {completionStep === 'idle' ? (
                   <Circle size={32} color="#CBD5E1" strokeWidth={2} />
                 ) : completionStep === 'confirming' ? (
                   <CheckCircle size={32} color="#4F46E5" strokeWidth={2.5} />
                 ) : (
                   <View className="w-8 h-8 bg-orange-50 dark:bg-orange-900/30 rounded-full items-center justify-center border border-orange-200 dark:border-orange-800">
                      <Camera size={16} color="#F97316" />
                   </View>
                 )}
              </TouchableOpacity>
              <View className="flex-1">
                 <Text className="text-lg font-black text-slate-900 dark:text-white leading-tight" numberOfLines={1}>{chore.title}</Text>
                 <View className="flex-row items-center mt-1.5">
                    <View className="flex-row items-center mr-3">
                       <Clock size={12} color={timeColor} />
                       <Text style={{ color: timeColor }} className="text-[11px] font-black uppercase ml-1">{chore.estMinutes}m</Text>
                    </View>
                    <View className="bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-lg mr-3">
                       <Text className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{chore.points} pts</Text>
                    </View>
                    {chore.photo_req && (
                      <View className="bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-lg">
                        <Camera size={10} color="#F97316" />
                      </View>
                    )}
                 </View>
              </View>
           </View>
           <View className="flex-row items-center ml-2">
              <Text className="text-2xl mr-2">{chore.avatar}</Text>
              <View className={`w-6 h-6 rounded-full bg-slate-50 dark:bg-zinc-800 items-center justify-center ${isExpanded ? 'rotate-180' : ''}`}>
                <ChevronDown size={14} color="#94A3B8" />
              </View>
           </View>
        </View>

        {isExpanded && (
          <Animated.View entering={FadeInDown} className="mt-6 pt-6 border-t border-slate-100 dark:border-zinc-800">
             {completionStep === 'verifying' && (
               <View className="mb-6">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Photo Proof Required</Text>
                    <AlertTriangle size={14} color="#F97316" />
                  </View>
                  <View className="flex-row gap-3">
                     <TouchableOpacity
                       onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setProofs(p => ({...p, before: !p.before})); }}
                       className={`flex-1 h-24 rounded-3xl border-2 border-dashed items-center justify-center ${proofs.before ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-900/20' : 'bg-slate-50 border-slate-200 dark:bg-zinc-800'}`}
                     >
                        <Camera size={24} color={proofs.before ? '#4F46E5' : '#94A3B8'} />
                        <Text className={`text-[10px] font-black mt-2 tracking-widest ${proofs.before ? 'text-indigo-600' : 'text-slate-400'}`}>BEFORE</Text>
                        {proofs.before && <View className="absolute top-2 right-2 bg-indigo-500 rounded-full p-0.5"><Check size={10} color="white" /></View>}
                     </TouchableOpacity>
                     <TouchableOpacity
                       onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setProofs(p => ({...p, after: !p.after})); }}
                       className={`flex-1 h-24 rounded-3xl border-2 border-dashed items-center justify-center ${proofs.after ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-900/20' : 'bg-slate-50 border-slate-200 dark:bg-zinc-800'}`}
                     >
                        <Camera size={24} color={proofs.after ? '#4F46E5' : '#94A3B8'} />
                        <Text className={`text-[10px] font-black mt-2 tracking-widest ${proofs.after ? 'text-indigo-600' : 'text-slate-400'}`}>AFTER</Text>
                        {proofs.after && <View className="absolute top-2 right-2 bg-indigo-500 rounded-full p-0.5"><Check size={10} color="white" /></View>}
                     </TouchableOpacity>
                  </View>
               </View>
             )}

             {completionStep === 'confirming' && (
               <View className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-3xl mb-6 border border-indigo-100 dark:border-indigo-800">
                  <Text className="text-indigo-900 dark:text-indigo-200 font-bold text-center text-sm">Ready to submit? Tap Finish to claim your points! 🚀</Text>
               </View>
             )}

             <View className="flex-row gap-4">
                <TouchableOpacity
                  onPress={handleComplete}
                  activeOpacity={0.8}
                  style={[GOLDEN_SHADOW]}
                  className="flex-[2] bg-indigo-600 h-16 rounded-[24px] items-center justify-center"
                >
                   <Text className="text-white font-black uppercase tracking-[0.2em] text-[13px]">
                     {completionStep === 'verifying' ? 'Submit Proof' : completionStep === 'confirming' ? 'Finish' : 'Complete'}
                   </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push('/chores');
                  }}
                  activeOpacity={0.7}
                  className="flex-1 bg-white dark:bg-zinc-800 h-16 rounded-[24px] items-center justify-center border border-slate-200 dark:border-zinc-700"
                >
                   <Text className="text-slate-900 dark:text-white font-black uppercase tracking-[0.1em] text-[11px]">Go To</Text>
                </TouchableOpacity>
             </View>

             <View className="mt-8 flex-row justify-between items-center">
                <View>
                   <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">For {chore.owner}</Text>
                   <Text className="text-[10px] font-medium text-slate-400 mt-0.5">{chore.dateAdded} • {chore.timeLeft} left</Text>
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
                    className="w-10 h-10 bg-slate-50 dark:bg-zinc-800 rounded-2xl items-center justify-center border border-slate-100 dark:border-zinc-700"
                  >
                     <Repeat2 size={18} color="#94A3B8" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
                    className="w-10 h-10 bg-slate-50 dark:bg-zinc-800 rounded-2xl items-center justify-center border border-slate-100 dark:border-zinc-700"
                  >
                     <Settings size={18} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
             </View>
          </Animated.View>
        )}
      </Pressable>
    </View>
  );
};

const PulsingIcon = ({ isRunning, children }: { isRunning: boolean, children: React.ReactNode }) => {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (isRunning) {
      scale.value = withRepeat(withTiming(1.15, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true);
    } else {
      scale.value = withTiming(1);
    }
  }, [isRunning]);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};

const MachineCard = ({ machine, onToggle }: { machine: Machine, onToggle: (id: string) => void }) => {
  const [confirming, setConfirming] = useState(false);
  const isRunning = machine.status === 'Running';

  useEffect(() => {
    let timeout: any;
    if (confirming) {
      timeout = setTimeout(() => setConfirming(false), 3000);
    }
    return () => clearTimeout(timeout);
  }, [confirming]);

  const handlePress = () => {
    try {
      if (isRunning && !confirming) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setConfirming(true);
        return;
      }
      onToggle(machine.id);
      setConfirming(false);
    } catch (e: any) {
      Alert.alert("Engine Error", e.message);
    }
  };

  const Icon = machine.name === 'Washer' ? Shirt : machine.name === 'Dryer' ? Wind : machine.name === 'Dishwasher' ? DishwasherIcon : Monitor;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      style={[styles.goldenCard, GOLDEN_SHADOW, { minHeight: 150 }]}
      className={`w-[48%] mb-4 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 flex-col justify-between ${confirming ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900' : ''}`}
    >
      <View className="flex-row justify-between items-center">
        <View className={`w-12 h-12 rounded-2xl items-center justify-center ${isRunning ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-slate-50 dark:bg-zinc-800'}`}>
          <PulsingIcon isRunning={isRunning}>
            <Icon size={24} color={isRunning ? '#4F46E5' : '#94A3B8'} strokeWidth={2.5} />
          </PulsingIcon>
        </View>
        <View className={`w-8 h-8 rounded-full border border-gray-100 dark:border-zinc-800 items-center justify-center ${isRunning ? 'bg-indigo-50' : 'bg-transparent'}`}>
           <Zap size={14} color={isRunning ? '#4F46E5' : '#CBD5E1'} fill={isRunning ? '#4F46E5' : 'transparent'} />
        </View>
      </View>

      <View>
        <View className="flex-row items-center">
          <Text className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-6 mr-2">
            {confirming ? `Stop?` : machine.name}
          </Text>
          {isRunning && !confirming && <View className="w-2 h-2 rounded-full bg-green-500 shadow-sm" />}
        </View>
        <Text className={`text-[10px] font-black uppercase mt-0.5 ${isRunning ? 'text-indigo-500' : 'text-slate-400'}`}>
          {confirming ? 'Tap to confirm' : isRunning ? `Since ${machine.since}` : 'Idle'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default function MissionControlScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [machines, setMachines] = useState<Machine[]>(INITIAL_MACHINES);
  const [activeAutomationId, setActiveAutomationId] = useState<string | null>(null);

  const toggleMachineStatus = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMachines(prev => prev.map(m => {
      if (m.id === id) {
        const isRunning = m.status === 'Running';
        return {
          ...m,
          status: isRunning ? 'Idle' : 'Running',
          since: isRunning ? null : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          startedBy: isRunning ? null : 'Haewon'
        };
      }
      return m;
    }));
  };

  const onRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => {
      setRefreshing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 2000);
  };

  const myChores = useMemo(() => {
    return MOCK_CHORES
      .filter(c => c.assigned_to === 'me-id')
      .sort((a, b) => (a.points || 0) - (b.points || 0));
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-black" edges={['top']}>
      <AmbientHUD
        onProfilePress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/profile');
        }}
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
      >
        {/* Bento Row 1: Shift Slider */}
        <View className="px-6 mt-6">
          <ShiftSlider />
        </View>

        {/* QA Inbox */}
        <QAInbox />

        {/* Automations Row */}
        <View className="mt-6">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 10, alignItems: 'center' }}>
            <View className="flex-row items-center">
              {MOCK_AUTOMATIONS.map((a) => (
                <AutomationPill
                  key={a.id}
                  item={a}
                  isActive={activeAutomationId === a.id}
                  onActivate={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveAutomationId(a.id);
                  }}
                  onConfirm={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setActiveAutomationId(null);
                  }}
                  onCancel={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveAutomationId(null);
                  }}
                />
              ))}
              <TouchableOpacity
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
                style={[GOLDEN_SHADOW, { height: 52 }]}
                className="bg-white dark:bg-zinc-900 rounded-full items-center justify-center border border-dashed border-slate-300 dark:border-zinc-700 flex-row px-6"
              >
                <Plus size={20} color="#64748B" />
                <Text className="ml-2 font-black text-slate-500 uppercase tracking-tight text-[13px]">New Automation</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* My Chores Today */}
        <View className="mt-6">
          <View className="px-6 mb-6">
            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">My Chores Today ({myChores.length})</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 10 }}>
            {myChores.map((c) => <ChoreCard key={c.id} chore={c} currentUser="me-id" />)}
          </ScrollView>
        </View>

        {/* Appliance Sync */}
        <View className="mt-6 px-6">
          <View className="flex-row justify-between items-end mb-6">
            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Appliance Sync</Text>
            <TouchableOpacity activeOpacity={0.7} className="mb-1">
              <Settings size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
          <View className="flex-row flex-wrap justify-between">
            {machines.map((m) => <MachineCard key={m.id} machine={m} onToggle={toggleMachineStatus} />)}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>

  );
}

const styles = StyleSheet.create({
  orbitOverlay: { position: 'absolute', top: 70, right: 24, width: 240, zIndex: 100 },
  sliderPill: { position: 'absolute', top: 6, left: 6, bottom: 6, width: (width - 48 - 12) / 2, borderRadius: 26 },
  goldenCard: { borderRadius: GOLDEN_RADIUS, padding: 20 },
  automationButton: { minHeight: 52 },
});
