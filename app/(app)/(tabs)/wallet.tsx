import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Dimensions, Alert, TextInput, PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeInDown, FadeOut, useSharedValue, withTiming, withSpring, withSequence, withDelay, useAnimatedProps, useAnimatedStyle, Easing } from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line } from 'react-native-svg';
import {
  ShoppingBag, Store, TrendingUp, ChevronRight, RefreshCcw, Send,
  CheckCircle2, History, Search, X, Plus, Target, Trash2,
} from 'lucide-react-native';
import { Modal, Pressable } from 'react-native';

const { width } = Dimensions.get('window');

// ─── DESIGN TOKENS ────────────────────────────────────────────────
const C = {
  bg:          '#F8FAFC',
  card:        '#FFFFFF',
  cardBorder:  '#E2E8F0',
  accent:      '#4F46E5',
  accentBg:    '#EEF2FF',
  green:       '#10B981',
  greenBg:     '#D1FAE5',
  red:         '#EF4444',
  redBg:       '#FEE2E2',
  gold:        '#F59E0B',
  goldBg:      '#FEF3C7',
  text:        '#0F172A',
  subtext:     '#64748B',
  muted:       '#F1F5F9',
  mutedBorder: '#E2E8F0',
  shadow: {
    shadowColor: '#000' as const,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
};

// ─── MOCK DATA ────────────────────────────────────────────────────
const FAMILY_MEMBERS = [
  { name: 'Dad',  avatar: '👨🏻', color: '#4F46E5' },
  { name: 'Mom',  avatar: '👩🏼', color: '#EC4899' },
  { name: 'Alex', avatar: '👦🏻', color: '#10B981' },
];

function genHistory(seed: number, base: number): number[] {
  const pts: number[] = [base];
  for (let i = 1; i < 30; i++) {
    const delta = Math.round(Math.sin(i * seed + 1) * 35 + Math.cos(i * 0.7 * seed) * 25 + 15);
    pts.push(Math.max(0, pts[i - 1] + delta));
  }
  return pts;
}
const HISTORIES: Record<string, number[]> = {
  Dad:  genHistory(0.8, 420),
  Mom:  genHistory(1.2, 380),
  Alex: genHistory(0.5, 210),
};

function getDates(n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }
  return out;
}
const ALL_DATES = getDates(30);

const TRANSACTIONS = [
  { id: 't1',  member: 'Dad',  label: 'Wash Bottles',             pts: +25,  date: 'Today',     icon: '🍼' },
  { id: 't2',  member: 'Mom',  label: 'Mix Formula',              pts: +25,  date: 'Today',     icon: '🥛' },
  { id: 't3',  member: 'Alex', label: 'Homework Check',           pts: +50,  date: 'Today',     icon: '📚' },
  { id: 't4',  member: 'Dad',  label: 'Take Out Trash',           pts: +15,  date: 'Yesterday', icon: '🗑️' },
  { id: 't5',  member: 'Mom',  label: 'Wipe Down Counters',       pts: +20,  date: 'Yesterday', icon: '🧹' },
  { id: 't6',  member: 'Alex', label: 'Redeemed: Ice Cream',      pts: -80,  date: 'Yesterday', icon: '🍦' },
  { id: 't7',  member: 'Dad',  label: 'Deep Clean Bathroom',      pts: +100, date: 'Mon',       icon: '🛁' },
  { id: 't8',  member: 'Mom',  label: 'Redeemed: Movie Night',    pts: -150, date: 'Mon',       icon: '🎬' },
  { id: 't9',  member: 'Alex', label: 'Vacuum Living Room',       pts: +30,  date: 'Mon',       icon: '🌀' },
  { id: 't10', member: 'Dad',  label: 'Mow the Lawn',             pts: +80,  date: 'Sun',       icon: '🌿' },
  { id: 't11', member: 'Mom',  label: 'Grocery Run',              pts: +40,  date: 'Sun',       icon: '🛒' },
  { id: 't12', member: 'Alex', label: 'Redeemed: Game Afternoon', pts: -120, date: 'Sun',       icon: '🎮' },
  { id: 't13', member: 'Dad',  label: 'Redeemed: Sleep In Day',   pts: -200, date: 'Sat',       icon: '😴' },
  { id: 't14', member: 'Mom',  label: 'Clean the Fridge',         pts: +35,  date: 'Sat',       icon: '🧊' },
  { id: 't15', member: 'Alex', label: 'Set the Table',            pts: +10,  date: 'Sat',       icon: '🍽️' },
  { id: 't16', member: 'Dad',  label: 'Fix Leaky Faucet',         pts: +60,  date: 'Fri',       icon: '🔧' },
  { id: 't17', member: 'Mom',  label: 'Redeemed: Candy Bag',      pts: -50,  date: 'Fri',       icon: '🍬' },
  { id: 't18', member: 'Alex', label: 'Weed the Garden',          pts: +45,  date: 'Thu',       icon: '🌱' },
  { id: 't19', member: 'Dad',  label: 'Cook Family Dinner',       pts: +55,  date: 'Thu',       icon: '👨‍🍳' },
  { id: 't20', member: 'Mom',  label: 'Do the Laundry',           pts: +30,  date: 'Wed',       icon: '👕' },
  { id: 't21', member: 'Alex', label: 'Redeemed: Extra Screen Time', pts: -100, date: 'Wed',    icon: '📱' },
  { id: 't22', member: 'Dad',  label: 'Paint Fence',              pts: +90,  date: 'Tue',       icon: '🎨' },
  { id: 't23', member: 'Mom',  label: 'Organize Pantry',          pts: +25,  date: 'Tue',       icon: '🥫' },
  { id: 't24', member: 'Alex', label: 'Walk the Dog',             pts: +20,  date: 'Tue',       icon: '🐕' },
  { id: 't25', member: 'Dad',  label: 'Redeemed: Pizza Night',    pts: -200, date: 'Mon',       icon: '🍕' },
  { id: 't26', member: 'Mom',  label: 'Scrub the Tub',            pts: +40,  date: 'Last week', icon: '🛁' },
  { id: 't27', member: 'Alex', label: 'Fold Laundry',             pts: +15,  date: 'Last week', icon: '👔' },
];

type Goal = {
  id: string;
  member: string;       // who created it
  name: string;
  emoji: string;
  targetPts: number;
  assignee: string;     // family member name or 'All'
  dueDate: string | null;
  contributions: Record<string, number>; // memberName → pts contributed
};

type BagStatus = 'active' | 'used' | 'expired';

type BagItem = {
  id: string;
  member: string;
  name: string;
  emoji: string;
  pts: number;
  claimedDate: string;
  usedDate: string | null;
  expiresDate: string | null;
  status: BagStatus;
  note: string | null;       // e.g. "Used on family movie night"
  gifted: boolean;           // true = received as gift, cannot be resold
};

const INITIAL_BAG: BagItem[] = [
  // Active
  { id: 'b1',  member: 'Dad',  name: 'Sleep In Day',       emoji: '😴', pts: 200, claimedDate: 'Today',        usedDate: null,          expiresDate: 'Sun, Mar 14', status: 'active',  note: null, gifted: false },
  { id: 'b2',  member: 'Dad',  name: 'Pizza Night',        emoji: '🍕', pts: 200, claimedDate: 'Fri, Feb 28',  usedDate: null,          expiresDate: null,          status: 'active',  note: null, gifted: false },
  { id: 'b3',  member: 'Mom',  name: 'No-Chore Pass',      emoji: '🏖️', pts: 180, claimedDate: 'Wed, Mar 5',   usedDate: null,          expiresDate: 'Wed, Mar 12', status: 'active',  note: null, gifted: false },
  { id: 'b4',  member: 'Mom',  name: 'Spa Day',            emoji: '🧖', pts: 300, claimedDate: 'Mon, Mar 3',   usedDate: null,          expiresDate: null,          status: 'active',  note: null, gifted: false },
  { id: 'b5',  member: 'Alex', name: 'Game Afternoon',     emoji: '🎮', pts: 120, claimedDate: 'Mon, Mar 3',   usedDate: null,          expiresDate: null,          status: 'active',  note: null, gifted: false },
  { id: 'b6',  member: 'Alex', name: 'Late Night Pass',    emoji: '🌙', pts: 130, claimedDate: 'Tue, Mar 4',   usedDate: null,          expiresDate: 'Wed, Mar 5',  status: 'active',  note: null, gifted: false },
  // Used
  { id: 'b7',  member: 'Alex', name: 'Ice Cream',          emoji: '🍦', pts: 80,  claimedDate: 'Sun, Mar 2',   usedDate: 'Sun, Mar 3',  expiresDate: 'Sun, Mar 9',  status: 'used',    note: 'Enjoyed at Baskin Robbins', gifted: false },
  { id: 'b8',  member: 'Mom',  name: 'Movie Night',        emoji: '🎬', pts: 150, claimedDate: 'Fri, Feb 28',  usedDate: 'Sat, Mar 1',  expiresDate: null,          status: 'used',    note: 'Watched Dune Part 2 with everyone', gifted: false },
  { id: 'b9',  member: 'Dad',  name: 'Fancy Dinner',       emoji: '🍽️', pts: 350, claimedDate: 'Sat, Feb 22',  usedDate: 'Sun, Feb 23', expiresDate: null,          status: 'used',    note: 'Nobu — anniversary dinner', gifted: false },
  { id: 'b10', member: 'Alex', name: 'Extra Screen Time',  emoji: '📱', pts: 100, claimedDate: 'Wed, Feb 26',  usedDate: 'Wed, Feb 26', expiresDate: 'Thu, Feb 27', status: 'used',    note: null, gifted: false },
  { id: 'b11', member: 'Mom',  name: 'Candy Bag',          emoji: '🍬', pts: 50,  claimedDate: 'Tue, Feb 25',  usedDate: 'Tue, Feb 25', expiresDate: 'Sun, Mar 2',  status: 'used',    note: 'Sour patch kids 🎉', gifted: false },
  { id: 'b12', member: 'Dad',  name: 'Movie Night',        emoji: '🎬', pts: 150, claimedDate: 'Mon, Feb 17',  usedDate: 'Fri, Feb 21', expiresDate: null,          status: 'used',    note: 'Picked Interstellar', gifted: false },
  { id: 'b13', member: 'Alex', name: 'Bowling Trip',       emoji: '🎳', pts: 250, claimedDate: 'Sun, Feb 16',  usedDate: 'Sat, Feb 22', expiresDate: null,          status: 'used',    note: 'Beat Dad by 30 pins 😤', gifted: false },
  { id: 'b14', member: 'Mom',  name: 'Sleep In Day',       emoji: '😴', pts: 200, claimedDate: 'Wed, Feb 12',  usedDate: 'Sat, Feb 15', expiresDate: null,          status: 'used',    note: null, gifted: false },
  { id: 'b15', member: 'Dad',  name: 'No-Chore Pass',      emoji: '🏖️', pts: 180, claimedDate: 'Mon, Feb 10',  usedDate: 'Mon, Feb 10', expiresDate: 'Thu, Feb 13', status: 'used',    note: 'Watched football all day', gifted: false },
  { id: 'b16', member: 'Alex', name: 'Ice Cream',          emoji: '🍦', pts: 80,  claimedDate: 'Fri, Feb 7',   usedDate: 'Sat, Feb 8',  expiresDate: 'Fri, Feb 14', status: 'used',    note: 'Mint choc chip', gifted: false },
  // Expired
  { id: 'b17', member: 'Mom',  name: 'Extra Screen Time',  emoji: '📱', pts: 100, claimedDate: 'Mon, Jan 27',  usedDate: null,          expiresDate: 'Tue, Jan 28', status: 'expired', note: null, gifted: false },
  { id: 'b18', member: 'Alex', name: 'Late Night Pass',    emoji: '🌙', pts: 130, claimedDate: 'Thu, Jan 23',  usedDate: null,          expiresDate: 'Fri, Jan 24', status: 'expired', note: null, gifted: false },
  { id: 'b19', member: 'Dad',  name: 'Candy Bag',          emoji: '🍬', pts: 50,  claimedDate: 'Sun, Jan 19',  usedDate: null,          expiresDate: 'Fri, Jan 24', status: 'expired', note: null, gifted: false },
];

// ─── CHART ────────────────────────────────────────────────────────
// Chart width = screen width - 48px screen padding - 40px card padding
const CHART_W = width - 48 - 40;
const CHART_H = 140;
const PAD = { top: 10, bottom: 20 };

function getChartPts(data: number[]) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(max - min, 1);
  return data.map((v, i) => ({
    x: (i / (data.length - 1)) * CHART_W,
    y: PAD.top + (1 - (v - min) / range) * (CHART_H - PAD.top - PAD.bottom),
    v,
  }));
}

function buildLine(pts: ReturnType<typeof getChartPts>): string {
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i - 1].x + pts[i].x) / 2;
    d += ` C ${cx} ${pts[i - 1].y}, ${cx} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`;
  }
  return d;
}

function buildArea(pts: ReturnType<typeof getChartPts>, line: string): string {
  const b = CHART_H - PAD.bottom;
  return `${line} L ${pts[pts.length - 1].x} ${b} L ${pts[0].x} ${b} Z`;
}

// ─── ANIMATED SVG PATH ────────────────────────────────────────────
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Normalise any dataset to exactly N evenly-spaced samples via linear interp
function resample(data: number[], n: number): number[] {
  if (data.length === n) return data;
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const srcF = t * (data.length - 1);
    const lo = Math.floor(srcF);
    const hi = Math.min(lo + 1, data.length - 1);
    return data[lo] + (data[hi] - data[lo]) * (srcF - lo);
  });
}

const N_PTS = 30; // fixed point count for morphing
const MORPH_CFG = { duration: 420, easing: Easing.out(Easing.cubic) };

// ─── POINTS GRAPH ─────────────────────────────────────────────────
type Period = '7D' | '14D' | '30D';

function PointsGraph({ member, onScrollLock }: { member: string; onScrollLock: (locked: boolean) => void }) {
  const [period, setPeriod] = useState<Period>('30D');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const touching = useRef(false);

  const sliceN = ({ '7D': 7, '14D': 14, '30D': 30 } as const)[period];
  const data  = (HISTORIES[member] ?? HISTORIES.Dad).slice(-sliceN);
  const dates = ALL_DATES.slice(-sliceN);

  const idx   = hoverIdx ?? data.length - 1;
  const val   = data[idx];
  const delta = data[data.length - 1] - data[0];
  const pct   = data[0] > 0 ? ((delta / data[0]) * 100).toFixed(1) : '0.0';
  const isUp  = delta >= 0;
  const color = isUp ? C.green : C.red;
  const gradId = `g-${member}-${period}`;

  // Shared values — one per fixed point, x never changes (evenly spaced), y morphs
  const yVals = useSharedValue<number[]>(Array(N_PTS).fill(CHART_H / 2));

  // Derive current target y positions from data
  const targetPts = useMemo(() => {
    const resampled = resample(data, N_PTS);
    return getChartPts(resampled);
  }, [data]);

  // Animate y values whenever member or period changes
  useEffect(() => {
    yVals.value = withTiming(targetPts.map(pt => pt.y), MORPH_CFG);
  }, [targetPts, yVals]);

  // Animated line path
  const animatedLineProps = useAnimatedProps(() => {
    'worklet';
    const fixedX = Array.from({ length: N_PTS }, (_, i) => (i / (N_PTS - 1)) * CHART_W);
    let d = `M ${fixedX[0].toFixed(2)} ${yVals.value[0].toFixed(2)}`;
    for (let i = 1; i < N_PTS; i++) {
      const cx = (fixedX[i - 1] + fixedX[i]) / 2;
      d += ` C ${cx.toFixed(2)} ${yVals.value[i - 1].toFixed(2)}, ${cx.toFixed(2)} ${yVals.value[i].toFixed(2)}, ${fixedX[i].toFixed(2)} ${yVals.value[i].toFixed(2)}`;
    }
    return { d };
  });

  const animatedAreaProps = useAnimatedProps(() => {
    'worklet';
    const fixedX = Array.from({ length: N_PTS }, (_, i) => (i / (N_PTS - 1)) * CHART_W);
    let d = `M ${fixedX[0].toFixed(2)} ${yVals.value[0].toFixed(2)}`;
    for (let i = 1; i < N_PTS; i++) {
      const cx = (fixedX[i - 1] + fixedX[i]) / 2;
      d += ` C ${cx.toFixed(2)} ${yVals.value[i - 1].toFixed(2)}, ${cx.toFixed(2)} ${yVals.value[i].toFixed(2)}, ${fixedX[i].toFixed(2)} ${yVals.value[i].toFixed(2)}`;
    }
    const b = CHART_H - PAD.bottom;
    d += ` L ${fixedX[N_PTS - 1].toFixed(2)} ${b} L ${fixedX[0].toFixed(2)} ${b} Z`;
    return { d };
  });

  // Dot position for current hover/last point (non-animated — snaps; fine for cursor)
  const curPt = targetPts[Math.round((idx / (data.length - 1)) * (N_PTS - 1))];

  const resolveIdx = useCallback((locationX: number) => {
    const clamped = Math.max(0, Math.min(CHART_W, locationX));
    return Math.min(data.length - 1, Math.max(0, Math.round((clamped / CHART_W) * (data.length - 1))));
  }, [data.length]);

  return (
    <View>
      {/* Balance number */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 2 }}>
        <Text style={{ fontSize: 44, fontWeight: '800', color: C.text, letterSpacing: -1.5 }}>
          {val?.toLocaleString()}
        </Text>
        <Text style={{ fontSize: 14, fontWeight: '600', color: C.subtext, marginBottom: 9 }}>pts</Text>
      </View>

      {/* Delta + date label */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <View style={{ backgroundColor: isUp ? C.greenBg : C.redBg, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: isUp ? C.green : C.red }}>
            {isUp ? '+' : ''}{delta} pts  {isUp ? '▲' : '▼'} {Math.abs(Number(pct))}%
          </Text>
        </View>
        <Text style={{ fontSize: 12, color: C.subtext }}>
          {hoverIdx !== null ? dates[hoverIdx] : 'vs period start'}
        </Text>
      </View>

      {/* Period pills */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
        {(['7D', '14D', '30D'] as Period[]).map(p => (
          <TouchableOpacity
            key={p}
            onPress={() => { Haptics.selectionAsync(); setPeriod(p); setHoverIdx(null); }}
            style={{
              paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20,
              backgroundColor: period === p ? C.accent : C.muted,
              borderWidth: 1, borderColor: period === p ? C.accent : C.mutedBorder,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: period === p ? '#fff' : C.subtext }}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart — captures touch entirely; blocks vertical scroll while finger is down */}
      <View
        style={{ width: CHART_W, height: CHART_H }}
        // Claim the responder unconditionally so parent ScrollView never gets it
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onStartShouldSetResponderCapture={() => true}
        onMoveShouldSetResponderCapture={() => true}
        onResponderGrant={e => {
          touching.current = true;
          onScrollLock(true);
          setHoverIdx(resolveIdx(e.nativeEvent.locationX));
          Haptics.selectionAsync();
        }}
        onResponderMove={e => {
          const next = resolveIdx(e.nativeEvent.locationX);
          setHoverIdx(prev => {
            if (prev !== next) Haptics.selectionAsync();
            return next;
          });
        }}
        onResponderRelease={() => { touching.current = false; onScrollLock(false); setHoverIdx(null); }}
        onResponderTerminate={() => { touching.current = false; onScrollLock(false); setHoverIdx(null); }}
      >
        <Svg width={CHART_W} height={CHART_H}>
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <Stop offset="100%" stopColor={color} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <AnimatedPath animatedProps={animatedAreaProps} fill={`url(#${gradId})`} />
          <AnimatedPath animatedProps={animatedLineProps} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          <Line x1={0} y1={CHART_H - PAD.bottom} x2={CHART_W} y2={CHART_H - PAD.bottom} stroke={C.mutedBorder} strokeWidth={1} />
          {hoverIdx !== null && (
            <Line x1={curPt?.x} y1={PAD.top} x2={curPt?.x} y2={CHART_H - PAD.bottom} stroke={C.subtext} strokeWidth={1} strokeDasharray="4,3" />
          )}
          <Circle cx={curPt?.x} cy={curPt?.y} r={5} fill={color} />
          <Circle cx={curPt?.x} cy={curPt?.y} r={9} fill={color} opacity={0.2} />
        </Svg>

        {/* Floating tooltip */}
        {hoverIdx !== null && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: Math.min(Math.max(curPt.x - 44, 0), CHART_W - 90),
              top: Math.max(curPt.y - 46, 0),
              backgroundColor: C.text,
              borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>{data[hoverIdx].toLocaleString()} pts</Text>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>{dates[hoverIdx]}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── TX ROW ───────────────────────────────────────────────────────
function TxRow({ tx }: { tx: typeof TRANSACTIONS[0] }) {
  const pos = tx.pts > 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.mutedBorder }}>
      <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: C.muted, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 20 }}>{tx.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{tx.label}</Text>
        <Text style={{ fontSize: 12, color: C.subtext, marginTop: 2 }}>{tx.member} · {tx.date}</Text>
      </View>
      <Text style={{ fontSize: 16, fontWeight: '800', color: pos ? C.green : C.red }}>{pos ? '+' : ''}{tx.pts}</Text>
    </View>
  );
}

// ─── ACTIVE BAG ITEM — swipe right → gift, swipe left → resell ────
// Card inner height: emoji(54) + top/bottom padding(32) + use button(10+12+2) + gap(12) = ~122px
// Action buttons fill the full card height via alignSelf:'stretch'
function ActiveBagItemRow({
  item, onResell, onGift, onUse,
}: {
  item: BagItem;
  onResell: (item: BagItem) => void;
  onGift:   (item: BagItem) => void;
  onUse:    (item: BagItem) => void;
}) {
  const ref = useRef<Swipeable>(null);

  const renderRightActions = item.gifted ? undefined : () => (
    <View style={{ width: 80, paddingLeft: 8, marginBottom: 12 }}>
      <TouchableOpacity
        onPress={() => { ref.current?.close(); onResell(item); }}
        activeOpacity={0.8}
        style={{ flex: 1, backgroundColor: C.green, justifyContent: 'center', alignItems: 'center', borderRadius: 18 }}
      >
        <RefreshCcw size={20} color="#fff" />
        <Text style={{ fontSize: 8, fontWeight: '900', color: '#fff', textTransform: 'uppercase', marginTop: 4 }}>Resell</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLeftActions = () => (
    <View style={{ width: 80, paddingRight: 8, marginBottom: 12 }}>
      <TouchableOpacity
        onPress={() => { ref.current?.close(); onGift(item); }}
        activeOpacity={0.8}
        style={{ flex: 1, backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center', borderRadius: 18 }}
      >
        <Send size={20} color="#fff" />
        <Text style={{ fontSize: 8, fontWeight: '900', color: '#fff', textTransform: 'uppercase', marginTop: 4 }}>Gift</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Swipeable
      ref={ref}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      friction={2}
      leftThreshold={80}
      rightThreshold={80}
      onSwipeableOpen={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
    >
      <View style={[C.shadow, { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.cardBorder, padding: 16, marginBottom: 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: C.muted, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 28 }}>{item.emoji}</Text>
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: C.text }}>{item.name}</Text>
              {item.gifted && (
                <View style={{ backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#92400E' }}>🎁 Gifted</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 12, color: C.subtext }}>{item.pts} pts · Purchased {item.claimedDate}</Text>
            {!!item.expiresDate && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.gold }} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: C.gold }}>Expires {item.expiresDate}</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={() => onUse(item)}
          style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.accentBg, borderRadius: 14, paddingVertical: 10, borderWidth: 1, borderColor: C.accent + '30' }}
        >
          <CheckCircle2 size={15} color={C.accent} />
          <Text style={{ fontSize: 13, fontWeight: '800', color: C.accent }}>Use This Reward</Text>
        </TouchableOpacity>
      </View>
    </Swipeable>
  );
}

// ─── HISTORY ITEM ─────────────────────────────────────────────────
function HistoryItemRow({ item }: { item: BagItem }) {
  const isExpired = item.status === 'expired';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.mutedBorder }}>
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: isExpired ? C.muted : C.greenBg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 22, opacity: isExpired ? 0.4 : 1 }}>{item.emoji}</Text>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: isExpired ? C.subtext : C.text }}>{item.name}</Text>
          <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: isExpired ? C.muted : C.greenBg }}>
            <Text style={{ fontSize: 9, fontWeight: '900', color: isExpired ? C.subtext : C.green }}>
              {isExpired ? 'EXPIRED' : 'USED'}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 12, color: C.subtext }}>{item.pts} pts · Redeemed {item.claimedDate}</Text>
        {item.usedDate && (
          <Text style={{ fontSize: 12, color: C.green, fontWeight: '600' }}>✓ Used on {item.usedDate}</Text>
        )}
        {item.expiresDate && isExpired && (
          <Text style={{ fontSize: 12, color: C.red, fontWeight: '600' }}>✗ Expired {item.expiresDate}</Text>
        )}
        {item.note && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2, backgroundColor: C.muted, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, color: C.subtext, fontStyle: 'italic' }}>"{item.note}"</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── ACTIVITY FEED — paginated + search ───────────────────────────
const ACT_PAGE = 5;
const ACT_MORE = 10;

function ActivityFeed({ txns }: { txns: typeof TRANSACTIONS }) {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(ACT_PAGE);
  const [searching, setSearching] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? txns.filter(t => t.label.toLowerCase().includes(q) || t.date.toLowerCase().includes(q)) : txns;
  }, [txns, query]);

  const visible = filtered.slice(0, limit);
  const remaining = filtered.length - limit;

  return (
    <View style={[C.shadow, { backgroundColor: C.card, borderRadius: 24, borderWidth: 1, borderColor: C.cardBorder, padding: 20 }]}>
      {/* Header row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: '900', color: C.text, flex: 1 }}>Activity</Text>
        <TouchableOpacity
          onPress={() => { setSearching(s => !s); setQuery(''); setLimit(ACT_PAGE); Haptics.selectionAsync(); }}
          style={{ padding: 4 }}
        >
          {searching
            ? <X size={17} color={C.subtext} />
            : <Search size={17} color={C.subtext} />}
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      {searching && (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.muted, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, gap: 8 }}>
          <Search size={14} color={C.subtext} />
          <TextInput
            value={query}
            onChangeText={t => { setQuery(t); setLimit(ACT_PAGE); }}
            placeholder="Search activity…"
            placeholderTextColor={C.subtext}
            style={{ flex: 1, fontSize: 14, color: C.text }}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}><X size={13} color={C.subtext} /></TouchableOpacity>
          )}
        </View>
      )}

      {filtered.length === 0
        ? <Text style={{ color: C.subtext, marginTop: 4, marginBottom: 4 }}>No matching activity.</Text>
        : visible.map(tx => <TxRow key={tx.id} tx={tx} />)
      }

      {remaining > 0 && (
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); setLimit(l => l + ACT_MORE); }}
          style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.muted, borderRadius: 14, paddingVertical: 10 }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.subtext }}>
            Show {Math.min(remaining, ACT_MORE)} more  ·  {remaining} left
          </Text>
          <ChevronRight size={14} color={C.subtext} style={{ transform: [{ rotate: '90deg' }] }} />
        </TouchableOpacity>
      )}
      {limit > ACT_PAGE && remaining === 0 && (
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); setLimit(ACT_PAGE); }}
          style={{ marginTop: 12, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.subtext }}>Show less</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── REWARD HISTORY — paginated + search ──────────────────────────
const HIST_PAGE = 3;
const HIST_MORE = 10;

function RewardHistory({ items }: { items: BagItem[] }) {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(HIST_PAGE);
  const [searching, setSearching] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter(i => i.name.toLowerCase().includes(q) || (i.note ?? '').toLowerCase().includes(q)) : items;
  }, [items, query]);

  const visible = filtered.slice(0, limit);
  const remaining = filtered.length - limit;

  return (
    <View style={[C.shadow, { backgroundColor: C.card, borderRadius: 24, borderWidth: 1, borderColor: C.cardBorder, padding: 20 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
        <History size={16} color={C.subtext} />
        <Text style={{ fontSize: 16, fontWeight: '900', color: C.text, marginLeft: 8, flex: 1 }}>Reward History</Text>
        <TouchableOpacity
          onPress={() => { setSearching(s => !s); setQuery(''); setLimit(HIST_PAGE); Haptics.selectionAsync(); }}
          style={{ padding: 4 }}
        >
          {searching ? <X size={17} color={C.subtext} /> : <Search size={17} color={C.subtext} />}
        </TouchableOpacity>
      </View>
      <Text style={{ fontSize: 12, color: C.subtext, marginBottom: 10 }}>Used and expired rewards</Text>

      {searching && (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.muted, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, gap: 8 }}>
          <Search size={14} color={C.subtext} />
          <TextInput
            value={query}
            onChangeText={t => { setQuery(t); setLimit(HIST_PAGE); }}
            placeholder="Search rewards…"
            placeholderTextColor={C.subtext}
            style={{ flex: 1, fontSize: 14, color: C.text }}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}><X size={13} color={C.subtext} /></TouchableOpacity>
          )}
        </View>
      )}

      {filtered.length === 0
        ? <Text style={{ color: C.subtext, marginBottom: 4 }}>No matching rewards.</Text>
        : visible.map(item => <HistoryItemRow key={item.id} item={item} />)
      }

      {remaining > 0 && (
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); setLimit(l => l + HIST_MORE); }}
          style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.muted, borderRadius: 14, paddingVertical: 10 }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.subtext }}>
            Show {Math.min(remaining, HIST_MORE)} more  ·  {remaining} left
          </Text>
          <ChevronRight size={14} color={C.subtext} style={{ transform: [{ rotate: '90deg' }] }} />
        </TouchableOpacity>
      )}
      {limit > HIST_PAGE && remaining === 0 && (
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); setLimit(HIST_PAGE); }}
          style={{ marginTop: 12, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.subtext }}>Show less</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const DUE_OPTIONS = [
  { label: '1 week',   days: 7   },
  { label: '2 weeks',  days: 14  },
  { label: '1 month',  days: 30  },
  { label: '3 months', days: 90  },
  { label: '6 months', days: 180 },
  { label: 'No deadline', days: null },
];

// ─── GOAL FORM MODAL ──────────────────────────────────────────────
function GoalFormModal({ defaultAssignee, onSave, onClose }: {
  defaultAssignee: string;
  onSave: (goal: Omit<Goal, 'id' | 'member'>) => void;
  onClose: () => void;
}) {
  const [name, setName]         = useState('');
  const [emoji, setEmoji]       = useState('🎯');
  const [pts, setPts]           = useState('');
  const [assignee, setAssignee] = useState(defaultAssignee);
  const [dueDays, setDueDays]   = useState<number | null>(30);
  const emojiInputRef = useRef<TextInput>(null);

  const handleSave = () => {
    const target = parseInt(pts);
    if (!name.trim() || !target || target <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    let dueDate: string | null = null;
    if (dueDays !== null) {
      const d = new Date();
      d.setDate(d.getDate() + dueDays);
      dueDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    onSave({ name: name.trim(), emoji, targetPts: target, assignee, dueDate, contributions: {} });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const labelStyle = { fontSize: 11, fontWeight: '700' as const, color: C.subtext, textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 8 };
  const fieldStyle = { backgroundColor: C.muted, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 18 };

  const translateY = useSharedValue(600);
  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  useEffect(() => { translateY.value = withSpring(0, { damping: 28, stiffness: 280 }); }, []);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.value = g.dy; },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 80) { translateY.value = withTiming(700, { duration: 250 }); setTimeout(onClose, 260); }
      else { translateY.value = withSpring(0, { damping: 28, stiffness: 280 }); }
    },
  })).current;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <Animated.View style={[panelStyle, { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%' }]}>
          <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <View {...panResponder.panHandlers} style={{ alignItems: 'center', paddingBottom: 12 }}>
              <View style={{ width: 40, height: 4, backgroundColor: C.mutedBorder, borderRadius: 2 }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
              <Target size={20} color={C.accent} style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 20, fontWeight: '900', color: C.text, flex: 1 }}>New Savings Fund</Text>
              <TouchableOpacity onPress={onClose}><X size={22} color={C.subtext} /></TouchableOpacity>
            </View>

            {/* Emoji picker — opens native emoji keyboard */}
            <Text style={labelStyle}>Icon</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => { emojiInputRef.current?.focus(); Haptics.selectionAsync(); }}
              style={{ ...fieldStyle, flexDirection: 'row', alignItems: 'center', gap: 14 }}
            >
              <Text style={{ fontSize: 32 }}>{emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>Tap to pick emoji</Text>
                <Text style={{ fontSize: 11, color: C.subtext, marginTop: 2 }}>Switch to 😊 on your keyboard</Text>
              </View>
              {/* Invisible TextInput positioned over the row — captures keyboard focus */}
              <TextInput
                ref={emojiInputRef}
                value=""
                onChangeText={val => {
                  // grab the last character typed (emoji can be multi-codepoint)
                  const chars = [...val];
                  if (chars.length > 0) {
                    setEmoji(chars[chars.length - 1]);
                  }
                }}
                style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
                multiline={false}
                caretHidden
              />
            </TouchableOpacity>

            {/* Goal name */}
            <Text style={labelStyle}>Goal Name</Text>
            <View style={fieldStyle}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Nintendo Switch, Hawaii Trip…"
                placeholderTextColor={C.subtext}
                style={{ fontSize: 15, color: C.text }}
                autoFocus
              />
            </View>

            {/* Target points */}
            <Text style={labelStyle}>Target Points</Text>
            <View style={{ ...fieldStyle, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                value={pts}
                onChangeText={setPts}
                placeholder="e.g. 5000"
                placeholderTextColor={C.subtext}
                keyboardType="number-pad"
                style={{ flex: 1, fontSize: 15, color: C.text }}
              />
              <Text style={{ fontSize: 13, color: C.subtext, fontWeight: '700' }}>pts</Text>
            </View>

            {/* Assignee */}
            <Text style={labelStyle}>Who is saving?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
              {FAMILY_MEMBERS.map(m => {
                const active = assignee === m.name;
                return (
                  <TouchableOpacity
                    key={m.name}
                    onPress={() => { setAssignee(m.name); Haptics.selectionAsync(); }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: active ? m.color : C.muted, borderWidth: 1, borderColor: active ? m.color : C.mutedBorder }}
                  >
                    <Text style={{ fontSize: 16 }}>{m.avatar}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#fff' : C.subtext }}>{m.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {/* All / family goal */}
            <TouchableOpacity
              onPress={() => { setAssignee('All'); Haptics.selectionAsync(); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, marginBottom: 18,
                backgroundColor: assignee === 'All' ? '#4F46E5' : C.muted, borderWidth: 1, borderColor: assignee === 'All' ? '#4F46E5' : C.mutedBorder }}
            >
              <Text style={{ fontSize: 18 }}>👨‍👩‍👧</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: assignee === 'All' ? '#fff' : C.text }}>Everyone — Family Fund</Text>
                <Text style={{ fontSize: 11, color: assignee === 'All' ? 'rgba(255,255,255,0.7)' : C.subtext }}>e.g. Hawaii trip, new TV, trampoline</Text>
              </View>
              {assignee === 'All' && <CheckCircle2 size={16} color="#fff" />}
            </TouchableOpacity>

            {/* Due date */}
            <Text style={labelStyle}>Deadline</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
              {DUE_OPTIONS.map(opt => {
                const active = dueDays === opt.days;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    onPress={() => { setDueDays(opt.days); Haptics.selectionAsync(); }}
                    style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: active ? C.accentBg : C.muted, borderWidth: 1, borderColor: active ? C.accent : C.mutedBorder }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: active ? C.accent : C.subtext }}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={handleSave}
              style={{ backgroundColor: C.accent, borderRadius: 18, paddingVertical: 16, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 15, fontWeight: '900', color: '#fff' }}>Create Fund</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── CONFETTI OVERLAY ─────────────────────────────────────────────
const CONFETTI_COLORS = ['#6366F1','#10B981','#F59E0B','#EF4444','#EC4899','#3B82F6','#A855F7'];
const N_PIECES = 36;
type CPiece = { x: number; color: string; size: number; delay: number; rotDir: number };

const CONFETTI_PIECES: CPiece[] = Array.from({ length: N_PIECES }, (_, i) => ({
  x: (i / N_PIECES) * width + (Math.random() * (width / N_PIECES) - width / N_PIECES / 2),
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  size: 6 + Math.round(Math.random() * 6),
  delay: Math.round(Math.random() * 400),
  rotDir: Math.random() > 0.5 ? 1 : -1,
}));

const AnimatedRect = Animated.createAnimatedComponent(View);

function ConfettiPiece({ piece, screenHeight }: { piece: CPiece; screenHeight: number }) {
  const y    = useSharedValue(-20);
  const op   = useSharedValue(1);
  const rot  = useSharedValue(0);

  useEffect(() => {
    const dur = 1800 + piece.delay * 2;
    y.value   = withDelay(piece.delay, withTiming(screenHeight + 40, { duration: dur, easing: Easing.in(Easing.quad) }));
    rot.value = withDelay(piece.delay, withTiming(piece.rotDir * 720, { duration: dur }));
    op.value  = withDelay(piece.delay + dur - 400, withTiming(0, { duration: 400 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: piece.x,
    top: y.value,
    width: piece.size,
    height: piece.size,
    borderRadius: piece.size * 0.25,
    backgroundColor: piece.color,
    opacity: op.value,
    transform: [{ rotate: `${rot.value}deg` }],
  }));

  return <Animated.View style={style} />;
}

function ConfettiOverlay({ onDone }: { onDone: () => void }) {
  const { height: screenHeight } = Dimensions.get('window');
  useEffect(() => {
    const maxDelay = Math.max(...CONFETTI_PIECES.map(p => p.delay));
    const timer = setTimeout(onDone, maxDelay + 1800 * 2 + 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
      {CONFETTI_PIECES.map((p, i) => (
        <ConfettiPiece key={i} piece={p} screenHeight={screenHeight} />
      ))}
    </View>
  );
}

// ─── CONTRIBUTE MODAL ─────────────────────────────────────────────
function ContributeModal({ goal, contributorName, availablePts, onContribute, onClose }: {
  goal: Goal;
  contributorName: string;
  availablePts: number;
  onContribute: (id: string, amount: number, memberName: string) => void;
  onClose: () => void;
}) {
  const contributed = Object.values(goal.contributions).reduce((a, b) => a + b, 0);
  const remaining   = goal.targetPts - contributed;
  const [input, setInput] = useState('');
  const translateY = useSharedValue(400);
  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 28, stiffness: 300 });
  }, []);

  const amount = parseInt(input) || 0;
  const capped = Math.min(amount, remaining, availablePts);
  const canSubmit = capped > 0;

  const handleConfirm = () => {
    if (!canSubmit) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onContribute(goal.id, capped, contributorName);
    onClose();
  };

  const QUICK = [50, 100, 200, 500].filter(a => a <= Math.min(remaining, availablePts));

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <Animated.View style={[panelStyle, { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }]}>
          <View style={{ width: 40, height: 4, backgroundColor: C.mutedBorder, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Text style={{ fontSize: 24 }}>{goal.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: C.text }}>{goal.name}</Text>
              <Text style={{ fontSize: 12, color: C.subtext }}>{contributed.toLocaleString()} / {goal.targetPts.toLocaleString()} pts saved</Text>
            </View>
            <TouchableOpacity onPress={onClose}><X size={20} color={C.subtext} /></TouchableOpacity>
          </View>

          {/* Available balance */}
          <View style={{ backgroundColor: C.muted, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.subtext }}>Your available balance</Text>
            <Text style={{ fontSize: 15, fontWeight: '900', color: C.accent }}>{availablePts.toLocaleString()} pts</Text>
          </View>

          {/* Quick amounts */}
          {QUICK.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              {QUICK.map(q => (
                <TouchableOpacity
                  key={q}
                  onPress={() => { setInput(String(q)); Haptics.selectionAsync(); }}
                  style={{ flex: 1, paddingVertical: 8, borderRadius: 12, backgroundColor: input === String(q) ? C.accentBg : C.muted, borderWidth: 1, borderColor: input === String(q) ? C.accent : C.mutedBorder, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: input === String(q) ? C.accent : C.subtext }}>+{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Custom input */}
          <View style={{ backgroundColor: C.muted, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Enter amount"
              placeholderTextColor={C.subtext}
              keyboardType="number-pad"
              style={{ flex: 1, fontSize: 22, fontWeight: '800', color: C.text }}
              autoFocus
            />
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.subtext }}>pts</Text>
          </View>

          {/* Warnings */}
          {amount > availablePts && (
            <Text style={{ fontSize: 11, color: C.red, fontWeight: '700', marginBottom: 6 }}>Not enough balance — max {availablePts.toLocaleString()} pts</Text>
          )}
          {amount > remaining && amount <= availablePts && (
            <Text style={{ fontSize: 11, color: C.gold, fontWeight: '700', marginBottom: 6 }}>Only {remaining.toLocaleString()} pts needed to complete — capping to that</Text>
          )}

          <TouchableOpacity
            onPress={handleConfirm}
            disabled={!canSubmit}
            style={{ backgroundColor: canSubmit ? C.accent : C.muted, borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 10 }}
          >
            <Text style={{ fontSize: 15, fontWeight: '900', color: canSubmit ? '#fff' : C.subtext }}>
              {canSubmit ? `Contribute ${capped.toLocaleString()} pts` : 'Enter an amount'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── GOAL PROGRESS CARD ───────────────────────────────────────────
function GoalProgressCard({ goal, onDelete, onComplete, onContribute, contributorName, availablePts }: {
  goal: Goal;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onContribute: (id: string, amount: number, memberName: string) => void;
  contributorName: string;
  availablePts: number;
}) {
  const contributed = Object.values(goal.contributions).reduce((a, b) => a + b, 0);
  const pct  = Math.min(contributed / goal.targetPts, 1);
  const done = pct >= 1;
  const assigneeMember = FAMILY_MEMBERS.find(m => m.name === goal.assignee);
  const overdue = !done && goal.dueDate !== null && new Date() > new Date(goal.dueDate);
  const isFamily = goal.assignee === 'All';
  const [showContribute, setShowContribute] = useState(false);

  const handleComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete(goal.id);
  };

  return (
    <View style={[C.shadow, {
      backgroundColor: C.card, borderRadius: 20, borderWidth: 1.5,
      borderColor: done ? C.green + '80' : overdue ? C.red + '60' : C.cardBorder,
      padding: 18, marginBottom: 10, overflow: 'hidden',
    }]}>
      {/* Top color strip */}
      {(done || isFamily) && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: done ? C.green : '#818CF8' }} />
      )}

      {/* Header row */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14, marginTop: (done || isFamily) ? 6 : 0 }}>
        <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: done ? C.greenBg : isFamily ? '#EEF2FF' : C.accentBg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Text style={{ fontSize: 24 }}>{goal.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 3 }}>{goal.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {isFamily ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                {FAMILY_MEMBERS.map(m => <Text key={m.name} style={{ fontSize: 13 }}>{m.avatar}</Text>)}
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#818CF8', marginLeft: 2 }}>Family Fund</Text>
              </View>
            ) : assigneeMember ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 12 }}>{assigneeMember.avatar}</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: C.subtext }}>{assigneeMember.name}</Text>
              </View>
            ) : null}
            {goal.dueDate && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: overdue ? C.redBg : C.muted, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10 }}>📅</Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: overdue ? C.red : C.subtext }}>{goal.dueDate}</Text>
              </View>
            )}
            {overdue && <View style={{ backgroundColor: C.redBg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 10, fontWeight: '900', color: C.red }}>OVERDUE</Text></View>}
          </View>
        </View>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onDelete(goal.id); }} style={{ padding: 4 }}>
          <Trash2 size={15} color={C.subtext} />
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={{ height: 12, backgroundColor: C.muted, borderRadius: 12, overflow: 'hidden', marginBottom: 8 }}>
        <View style={{ width: `${Math.round(pct * 100)}%`, height: 12, borderRadius: 12, backgroundColor: done ? C.green : overdue ? C.red : isFamily ? '#818CF8' : C.accent }} />
        <View style={{ position: 'absolute', top: 0, left: 0, width: `${Math.round(pct * 100)}%`, height: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.25)' }} />
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <Text style={{ fontSize: 13, fontWeight: '900', color: done ? C.green : overdue ? C.red : isFamily ? '#818CF8' : C.accent }}>
          {Math.round(pct * 100)}%
        </Text>
        <Text style={{ fontSize: 12, fontWeight: '600', color: C.subtext }}>
          {contributed.toLocaleString()} / {goal.targetPts.toLocaleString()} pts
        </Text>
        <Text style={{ fontSize: 11, color: done ? C.green : C.subtext, fontWeight: '700' }}>
          {done ? '🎉 Goal reached!' : `${(goal.targetPts - contributed).toLocaleString()} to go`}
        </Text>
      </View>

      {/* Contribute button */}
      {!done && (
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowContribute(true); }}
          style={{ backgroundColor: isFamily ? '#EEF2FF' : C.accentBg, borderRadius: 14, paddingVertical: 11, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: isFamily ? '#C7D2FE' : C.accent + '30' }}
        >
          <Plus size={15} color={isFamily ? '#818CF8' : C.accent} />
          <Text style={{ fontSize: 13, fontWeight: '800', color: isFamily ? '#818CF8' : C.accent }}>Contribute Points</Text>
        </TouchableOpacity>
      )}

      {/* Complete button — shown when done */}
      {done && (
        <TouchableOpacity
          onPress={handleComplete}
          style={{ backgroundColor: C.green, borderRadius: 14, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
        >
          <CheckCircle2 size={16} color="#fff" />
          <Text style={{ fontSize: 14, fontWeight: '900', color: '#fff' }}>Complete Goal</Text>
        </TouchableOpacity>
      )}

      {showContribute && (
        <ContributeModal
          goal={goal}
          contributorName={contributorName}
          availablePts={availablePts}
          onContribute={onContribute}
          onClose={() => setShowContribute(false)}
        />
      )}
    </View>
  );
}

// ─── TAB SWITCHER — sliding pill ──────────────────────────────────
const TAB_W = (width - 48 - 8) / 2; // (screen - 24*2 margin - 4*2 padding) / 2

function TabSwitcher({ tab, onTabChange }: { tab: Tab; onTabChange: (t: Tab) => void }) {
  const slideX = useSharedValue(tab === 'wallet' ? 0 : TAB_W);

  useEffect(() => {
    slideX.value = withTiming(tab === 'wallet' ? 0 : TAB_W, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [tab]);

  const animPillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
  }));

  return (
    <View style={{
      marginHorizontal: 24, marginBottom: 14,
      backgroundColor: C.muted, borderRadius: 18,
      padding: 4, borderWidth: 1, borderColor: C.mutedBorder,
      flexDirection: 'row',
    }}>
      {/* Sliding pill */}
      <Animated.View style={[animPillStyle, {
        position: 'absolute',
        top: 4, left: 4,
        width: TAB_W,
        bottom: 4,
        backgroundColor: C.card,
        borderRadius: 14,
        ...C.shadow,
      }]} />

      {(['wallet', 'bag'] as Tab[]).map(t => {
        const active = tab === t;
        return (
          <TouchableOpacity
            key={t}
            onPress={() => onTabChange(t)}
            activeOpacity={0.85}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 14 }}
          >
            {t === 'wallet'
              ? <TrendingUp size={15} color={active ? C.accent : C.subtext} />
              : <ShoppingBag size={15} color={active ? C.accent : C.subtext} />}
            <Text style={{ fontSize: 14, fontWeight: '800', color: active ? C.accent : C.subtext }}>
              {t === 'bag' ? 'My Bag' : 'Wallet'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── MEMBER PILLS ─────────────────────────────────────────────────
function MemberPills({ selected, onSelect }: { selected: string; onSelect: (n: string) => void }) {
  return (
    // alignItems stretch so pills don't overflow; height is self-determined by content
    <View style={{ flexDirection: 'row', paddingHorizontal: 24, gap: 8, marginBottom: 16 }}>
      {FAMILY_MEMBERS.map(m => {
        const active = selected === m.name;
        return (
          <TouchableOpacity
            key={m.name}
            onPress={() => { Haptics.selectionAsync(); onSelect(m.name); }}
            style={[C.shadow, {
              flexDirection: 'row', alignItems: 'center', gap: 8,
              paddingHorizontal: 14, paddingVertical: 9, borderRadius: 50,
              backgroundColor: active ? m.color : C.card,
              borderWidth: 1, borderColor: active ? m.color : C.cardBorder,
              // shrink to content — no flex:1
            }]}
          >
            <Text style={{ fontSize: 20, lineHeight: 24 }}>{m.avatar}</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: active ? '#fff' : C.text, lineHeight: 20 }}>{m.name}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── UNDO COUNTDOWN RING ──────────────────────────────────────────
const RING_R = 10;
const RING_CIRC = 2 * Math.PI * RING_R;

function UndoCountdownRing({ duration = 4000 }: { duration?: number }) {
  const progress = useSharedValue(1);
  useEffect(() => {
    progress.value = 1;
    progress.value = withTiming(0, { duration, easing: Easing.linear });
  }, []);
  const animProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRC * (1 - progress.value),
  }));
  return (
    <Svg width={26} height={26} style={{ marginLeft: 10 }}>
      <Circle cx={13} cy={13} r={RING_R} stroke="rgba(255,255,255,0.2)" strokeWidth={2.5} fill="none" />
      <AnimatedCircle
        cx={13} cy={13} r={RING_R}
        stroke="#fff" strokeWidth={2.5} fill="none"
        strokeDasharray={RING_CIRC}
        animatedProps={animProps}
        strokeLinecap="round"
        transform="rotate(-90 13 13)"
      />
    </Svg>
  );
}

// ─── SCREEN ───────────────────────────────────────────────────────
type Tab = 'wallet' | 'bag';

export default function WalletScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('wallet');
  const [selectedMember, setSelectedMember] = useState('Dad');
  const [bag, setBag] = useState<BagItem[]>(INITIAL_BAG);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [undoItem, setUndoItem] = useState<{ item: BagItem; prev: BagItem } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const showUndo = useCallback((prev: BagItem, next: BagItem) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoItem({ item: next, prev });
    undoTimerRef.current = setTimeout(() => setUndoItem(null), 4000);
  }, []);

  const handleUndo = useCallback(() => {
    if (!undoItem) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setBag(prev => prev.map(b => b.id === undoItem.prev.id ? undoItem.prev : b));
    setUndoItem(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [undoItem]);

  const memberTxns    = useMemo(() => TRANSACTIONS.filter(t => t.member === selectedMember), [selectedMember]);
  const memberGoals   = useMemo(() => goals.filter(g => g.assignee === selectedMember || g.assignee === 'All'), [goals, selectedMember]);
  const currentBalance = useMemo(() => {
    const hist = HISTORIES[selectedMember] ?? [];
    return hist[hist.length - 1] ?? 0;
  }, [selectedMember]);

  const handleAddGoal = useCallback((data: Omit<Goal, 'id' | 'member'>) => {
    setGoals(prev => [...prev, { ...data, id: `g-${Date.now()}`, member: selectedMember }]);
  }, [selectedMember]);

  const handleCompleteGoal = useCallback((id: string) => {
    setShowConfetti(true);
    setTimeout(() => setGoals(prev => prev.filter(g => g.id !== id)), 600);
  }, []);

  const handleContributeGoal = useCallback((id: string, amount: number, memberName: string) => {
    if (amount <= 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setGoals(prev => prev.map(g => {
      if (g.id !== id) return g;
      const prev_contrib = g.contributions[memberName] ?? 0;
      return { ...g, contributions: { ...g.contributions, [memberName]: prev_contrib + amount } };
    }));
  }, []);

  const handleDeleteGoal = useCallback((id: string) => {
    Alert.alert('Remove Fund?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setGoals(prev => prev.filter(g => g.id !== id)) },
    ]);
  }, []);
  const activeBag = useMemo(() => {
    const FAR_FUTURE = new Date('9999-12-31').getTime();
    const parseDate = (s: string | null) => {
      if (!s) return FAR_FUTURE;
      if (s === 'Today') return new Date().getTime();
      const d = new Date(s);
      return isNaN(d.getTime()) ? FAR_FUTURE : d.getTime();
    };
    return bag
      .filter(b => b.member === selectedMember && b.status === 'active')
      .sort((a, b) => {
        const hasExpA = !!a.expiresDate;
        const hasExpB = !!b.expiresDate;
        // items with expiry come before items without
        if (hasExpA !== hasExpB) return hasExpA ? -1 : 1;
        if (hasExpA && hasExpB) return parseDate(a.expiresDate) - parseDate(b.expiresDate);
        // both have no expiry — sort by purchase date ascending (earlier purchase = higher up)
        return parseDate(a.claimedDate) - parseDate(b.claimedDate);
      });
  }, [bag, selectedMember]);
  const historyBag  = useMemo(() => bag.filter(b => b.member === selectedMember && b.status !== 'active'), [bag, selectedMember]);
  const member      = FAMILY_MEMBERS.find(m => m.name === selectedMember)!;

  const handleResell = useCallback((item: BagItem) => {
    Alert.alert(
      `Resell "${item.name}"?`,
      `You'll get back ${item.pts} pts and the item is removed from your bag.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: `Resell for ${item.pts} pts`, onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setBag(prev => prev.filter(b => b.id !== item.id));
        }},
      ],
    );
  }, []);

  const handleGift = useCallback((item: BagItem) => {
    const others = FAMILY_MEMBERS.filter(m => m.name !== item.member);
    Alert.alert(
      `Gift "${item.name}"?`,
      'Send this reward to another family member.',
      [
        { text: 'Cancel', style: 'cancel' },
        ...others.map(m => ({
          text: `${m.avatar} ${m.name}`,
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setBag(prev => prev.map(b => b.id === item.id ? { ...b, member: m.name, gifted: true } : b));
          },
        })),
      ],
    );
  }, []);

  const handleUse = useCallback((item: BagItem) => {
    Alert.alert(
      `Use "${item.name}"?`,
      'This marks the reward as used and moves it to history.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Use it!', onPress: () => {
          // Second step: optional note
          Alert.prompt(
            'Leave a note?',
            'Optional — add a memory about how you used it.',
            [
              { text: 'Skip', onPress: (_note?: string) => commitUse(item, null) },
              { text: 'Save note', onPress: (note?: string) => commitUse(item, note?.trim() || null) },
            ],
            'plain-text',
            '',
          );
        }},
      ],
    );
  }, []);

  const commitUse = useCallback((item: BagItem, note: string | null) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const next: BagItem = { ...item, status: 'used', usedDate: today, note: note ?? item.note };
    setBag(prev => prev.map(b => b.id === item.id ? next : b));
    showUndo(item, next);
  }, [showUndo]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView style={{ flex: 1 }}>

        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: C.subtext, textTransform: 'uppercase', letterSpacing: 1 }}>HomeHuddle</Text>
            <Text style={{ fontSize: 28, fontWeight: '900', color: C.text, marginTop: 1 }}>Wallet</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowGoalForm(true); }}
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}
            >
              <Plus size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/market'); }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accent + '40', borderRadius: 20, paddingHorizontal: 14, height: 38 }}
            >
              <Store size={15} color={C.accent} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: C.accent }}>Market</Text>
              <ChevronRight size={13} color={C.accent} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab switcher — sliding pill */}
        <TabSwitcher tab={tab} onTabChange={t => { Haptics.selectionAsync(); setTab(t); }} />

        {/* Member pills — fixed row, no horizontal scroll, no overflow */}
        <MemberPills selected={selectedMember} onSelect={setSelectedMember} />

        {/* Main scroll — scrollEnabled is always true; chart captures its own responder */}
        <ScrollView
          ref={scrollRef}
          scrollEnabled={scrollEnabled}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── WALLET TAB ── */}
          {tab === 'wallet' && (
            <>
              <View style={[C.shadow, { backgroundColor: C.card, borderRadius: 24, borderWidth: 1, borderColor: C.cardBorder, padding: 20, marginBottom: 16, overflow: 'hidden' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Text style={{ fontSize: 18 }}>{member.avatar}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: C.subtext }}>{member.name}'s Balance</Text>
                  <View style={{ marginLeft: 'auto', backgroundColor: C.accentBg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, fontWeight: '900', color: C.accent }}>LIVE</Text>
                  </View>
                </View>
                <PointsGraph member={selectedMember} onScrollLock={(locked) => setScrollEnabled(!locked)} />
              </View>

              {/* All-time mini banner — between graph and today */}
              {(() => {
                const allTimeEarned = (HISTORIES[selectedMember] ?? []).reduce((sum, v, i, arr) => {
                  if (i === 0) return 0;
                  const gain = v - arr[i - 1];
                  return gain > 0 ? sum + gain : sum;
                }, 0);
                const todayEarned = memberTxns.filter(t => t.pts > 0 && t.date === 'Today').reduce((s, t) => s + t.pts, 0);
                const todaySpent  = Math.abs(memberTxns.filter(t => t.pts < 0 && t.date === 'Today').reduce((s, t) => s + t.pts, 0));
                return (
                  <>
                    {/* All-time compact strip */}
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 8,
                      backgroundColor: C.accentBg, borderRadius: 14,
                      paddingHorizontal: 14, paddingVertical: 9,
                      marginBottom: 10, borderWidth: 1, borderColor: C.accent + '25',
                    }}>
                      <Text style={{ fontSize: 16 }}>🏆</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: C.subtext }}>All-time earned</Text>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: C.accent, marginLeft: 'auto' }}>
                        {allTimeEarned.toLocaleString()} pts
                      </Text>
                    </View>

                    {/* Today row */}
                    <View style={[C.shadow, { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 16, flexDirection: 'row', overflow: 'hidden' }]}>
                      <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14, borderRightWidth: 1, borderColor: C.mutedBorder }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: C.subtext, textTransform: 'uppercase', letterSpacing: 0.6 }}>Earned Today</Text>
                        <Text style={{ fontSize: 22, fontWeight: '900', color: C.green, marginTop: 4 }}>+{todayEarned}</Text>
                        <Text style={{ fontSize: 11, color: C.subtext }}>pts</Text>
                      </View>
                      <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: C.subtext, textTransform: 'uppercase', letterSpacing: 0.6 }}>Used Today</Text>
                        <Text style={{ fontSize: 22, fontWeight: '900', color: todaySpent > 0 ? C.red : C.subtext, marginTop: 4 }}>{todaySpent > 0 ? `-${todaySpent}` : '—'}</Text>
                        <Text style={{ fontSize: 11, color: C.subtext }}>pts</Text>
                      </View>
                    </View>
                  </>
                );
              })()}

              {/* Savings Funds */}
              {memberGoals.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <Target size={14} color={C.subtext} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: C.subtext, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      Savings Funds
                    </Text>
                  </View>
                  {memberGoals.map(goal => (
                    <GoalProgressCard
                      key={goal.id}
                      goal={goal}
                      onDelete={handleDeleteGoal}
                      onComplete={handleCompleteGoal}
                      onContribute={handleContributeGoal}
                      contributorName={selectedMember}
                      availablePts={currentBalance}
                    />
                  ))}
                </View>
              )}

              {/* Activity — collapsed to 5, expand on demand */}
              <ActivityFeed txns={memberTxns} />
            </>
          )}

          {/* ── BAG TAB ── */}
          {tab === 'bag' && (
            <>
              {/* Active rewards */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ fontSize: 17, fontWeight: '900', color: C.text }}>Active Rewards</Text>
                <Text style={{ fontSize: 11, color: C.subtext, fontWeight: '600' }}>← Gift   Resell →</Text>
              </View>

              {activeBag.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 48, gap: 12, marginBottom: 24 }}>
                  <Text style={{ fontSize: 48 }}>🛍️</Text>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: C.subtext }}>No active rewards</Text>
                  <TouchableOpacity
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/market'); }}
                    style={{ backgroundColor: C.accent, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Browse Market</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {activeBag.map(item => (
                    <ActiveBagItemRow key={item.id} item={item} onResell={handleResell} onGift={handleGift} onUse={handleUse} />
                  ))}
                  <TouchableOpacity
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/market'); }}
                    style={{ marginBottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.accentBg, borderRadius: 20, borderWidth: 1, borderColor: C.accent + '40', paddingVertical: 13 }}
                  >
                    <Store size={15} color={C.accent} />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: C.accent }}>Browse Market for More</Text>
                    <ChevronRight size={14} color={C.accent} />
                  </TouchableOpacity>
                </>
              )}

              {historyBag.length > 0 && <RewardHistory items={historyBag} />}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Goal form modal */}
      {showGoalForm && (
        <GoalFormModal
          defaultAssignee={selectedMember}
          onSave={handleAddGoal}
          onClose={() => setShowGoalForm(false)}
        />
      )}

      {/* Confetti */}
      {showConfetti && <ConfettiOverlay onDone={() => setShowConfetti(false)} />}

      {/* Undo toast */}
      {undoItem && (
        <Animated.View
          entering={FadeInDown.springify().damping(22)}
          exiting={FadeOut.duration(200)}
          style={{
            position: 'absolute', bottom: 108, left: 16, right: 16,
            backgroundColor: '#1E293B', borderRadius: 18,
            paddingVertical: 14, paddingHorizontal: 18,
            flexDirection: 'row', alignItems: 'center',
            shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 }, elevation: 10,
          }}
        >
          <Text style={{ color: '#E2E8F0', fontSize: 13, fontWeight: '700', flex: 1 }} numberOfLines={1}>
            "{undoItem.item.name}" marked as used
          </Text>
          <TouchableOpacity
            onPress={handleUndo}
            style={{ paddingHorizontal: 14, paddingVertical: 6, backgroundColor: C.accent, borderRadius: 10, marginLeft: 12 }}
          >
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>Undo</Text>
          </TouchableOpacity>
          <UndoCountdownRing key={undoItem.item.id + undoItem.prev.usedDate} />
        </Animated.View>
      )}
    </View>
  );
}
