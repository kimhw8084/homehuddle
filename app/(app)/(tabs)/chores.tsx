import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Pressable, StyleSheet, unstable_batchedUpdates, Animated as RNAnimated, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useAuthStore } from '../../../store/authStore';
import {
  Search, X, Circle, AlertTriangle, Trash2, Camera,
  CheckCircle2, Plus, GripVertical, ChevronDown, ChevronUp, RotateCcw,
  Clock, ChevronLeft, ChevronRight, CheckCircle, MoreHorizontal,
  BellRing, FolderPlus, ListPlus, Repeat2, UserCheck, Users,
  SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedProps, withSpring, withTiming, withSequence, withDelay, interpolateColor, Easing, FadeInDown, FadeOut,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { GestureHandlerRootView, Swipeable, Gesture, GestureDetector } from 'react-native-gesture-handler';
import DraggableFlatList, { ScaleDecorator, ShadowDecorator } from 'react-native-draggable-flatlist';

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

const SPRING_CONFIG = { damping: 25, stiffness: 200, mass: 0.5 };
const SNAPPY_TIMING = { duration: 150 };

const PLINKO_PEGS: Array<{ x: number; y: number }> = [
  { x: 37.5, y: 120 }, { x: 112.5, y: 120 }, { x: 187.5, y: 120 }, { x: 262.5, y: 120 },
  { x: 75,   y: 200 }, { x: 150,   y: 200 }, { x: 225,   y: 200 },
  { x: 37.5, y: 280 }, { x: 112.5, y: 280 }, { x: 187.5, y: 280 }, { x: 262.5, y: 280 },
];

function calcPlinkoPath(winnerIndex: number): Array<{ x: number; y: number }> {
  const binX = [50, 150, 250][winnerIndex];
  const row0 = [37.5, 112.5, 187.5, 262.5];
  const row1 = [75, 150, 225];
  const row2 = [37.5, 112.5, 187.5, 262.5];

  function nearest(pegs: number[], from: number, target: number) {
    const mid = (from + target) / 2;
    return pegs.reduce((b, p) => Math.abs(p - mid) < Math.abs(b - mid) ? p : b);
  }

  const p0 = nearest(row0, 150, binX);
  const p1 = nearest(row1, p0, binX);
  const p2 = nearest(row2, p1, binX);

  return [
    { x: 150,  y: 30  },
    { x: p0,   y: 120 },
    { x: p1,   y: 200 },
    { x: p2,   y: 280 },
    { x: binX, y: 360 },
  ];
}

const SECTION_COLORS = [
  '#FFFFFF', // white
  '#F43F5E', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#3B82F6', // blue
  '#1E40AF', // dark blue
  '#8B5CF6', // purple
  '#94A3B8', // gray
];

const FAMILY_MEMBERS = [
  { name: 'Dad', avatar: '👨🏻', pool: 'Parents' as const },
  { name: 'Mom', avatar: '👩🏼', pool: 'Parents' as const },
  { name: 'Alex', avatar: '👦🏻', pool: 'Kids' as const },
];

const QUICK_POINTS = [10, 25, 50, 100];
const QUICK_TIMES = [
  { label: '15m', value: 15, color: COLORS.green },
  { label: '30m', value: 30, color: COLORS.blue },
  { label: '1h', value: 60, color: COLORS.orange },
  { label: '2h', value: 120, color: COLORS.red },
];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// --- TYPES ---
type Chore = {
  id: string;
  title: string;
  assignee: string | null;
  avatar: string;
  pool: 'Me' | 'Kids' | 'Parents';
  points: number;
  estMinutes: number;
  dueDate: string;
  isOverdue: boolean;
  overdueDays?: number;
  missedStreak?: number;
  isRecurring?: boolean;
  status: 'pending' | 'completed' | 'sick_reassigned';
  photoRequired: boolean;
  photoMode?: 'after' | 'both';
  photoProvided: { before: boolean; after: boolean; beforeUri?: string; afterUri?: string };
  isNudged: boolean;
  priorityIndex: number;
  sectionId: string | null;
  nextRecurringDate?: string;
  recurrenceRule?: string; // e.g. "Every Week" | "FREQ=Weekly;INTERVAL=2;BYDAY=Mon,Wed"
  completedBy?: string | null;
  completedAt?: string | null;
  wasOverdue?: boolean;
};

type Section = {
  id: string;
  title: string;
  themeColor: string;
  isCollapsed: boolean;
  date: string;
  priorityIndex: number;
};

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
type SortDir   = 'asc' | 'desc';
type ActiveSort = { field: SortField; dir: SortDir } | null;

type FilterState = {
  assignees: string[];
  recurring: boolean;
  photoRequired: boolean;
  nudged: boolean;
};

const DEFAULT_FILTER: FilterState = { assignees: [], recurring: false, photoRequired: false, nudged: false };

const SORT_FIELDS: { field: SortField; label: string }[] = [
  { field: 'title',    label: 'Title' },
  { field: 'duration', label: 'Time'  },
  { field: 'points',   label: 'Points' },
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
    case 'title':    return c.sort((a, b) => mul * a.title.localeCompare(b.title));
    case 'duration': return c.sort((a, b) => mul * (a.estMinutes - b.estMinutes));
    case 'points':   return c.sort((a, b) => mul * (a.points - b.points));
  }
};

const applyFilter = (chores: Chore[], f: FilterState): Chore[] =>
  chores.filter(c => {
    if (f.assignees.length > 0 && !f.assignees.includes(c.assignee ?? '')) return false;
    if (f.recurring && !c.isRecurring) return false;
    if (f.photoRequired && !c.photoRequired) return false;
    if (f.nudged && !c.isNudged) return false;
    return true;
  });

const filterActiveCount = (f: FilterState): number =>
  f.assignees.length + (f.recurring ? 1 : 0) + (f.photoRequired ? 1 : 0) + (f.nudged ? 1 : 0);

// --- HELPERS ---
const getLocalFormattedDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseLocalDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const getTodayStr = () => getLocalFormattedDate(new Date());

// Bug #6 fixed: use parseLocalDate instead of new Date(string) to avoid UTC offset issues
const getDDay = (dateStr: string) => {
  const todayStr = getTodayStr();
  if (dateStr === todayStr) return 'Today';
  const today = parseLocalDate(todayStr).getTime();
  const target = parseLocalDate(dateStr).getTime();
  const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  if (diff === 1) return 'Tomorrow';
  if (diff < 0) return `${Math.abs(diff)}d ago`;
  return `in ${diff}d`;
};

const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

const isUSFederalHoliday = (date: Date) => {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if (month === 1 && day === 1) return "New Year's";
  if (month === 12 && day === 25) return 'Christmas';
  return null;
};

// --- RECURRENCE ENGINE ---
const ORDINALS: Record<string, number> = { First: 1, Second: 2, Third: 3, Fourth: 4, Last: -1 };
const ORDINAL_DAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/**
 * Compute the next occurrence date from `fromDateStr` given a recurrenceRule.
 * Rule formats:
 *   "Every Day" | "Every Week" | "Every 2 Weeks" | "Every Month" | "Every Year"
 *   "FREQ=Daily;INTERVAL=3"
 *   "FREQ=Weekly;INTERVAL=1;BYDAY=Mon,Wed,Fri"
 *   "FREQ=Monthly;INTERVAL=1;BYMONTHDAY=15,28"
 *   "FREQ=Monthly;INTERVAL=1;BYSETPOS=2;BYDAY=Mon"  (on the Nth weekday)
 *   "FREQ=Yearly;INTERVAL=1;BYMONTH=Jan,Jun"
 */
const computeNextDate = (fromDateStr: string, rule?: string): string | undefined => {
  if (!rule) return undefined;
  const from = parseLocalDate(fromDateStr);

  // ── Preset shortcuts ──
  if (rule === 'Every Day') {
    const d = new Date(from); d.setDate(d.getDate() + 1); return getLocalFormattedDate(d);
  }
  if (rule === 'Every Week') {
    const d = new Date(from); d.setDate(d.getDate() + 7); return getLocalFormattedDate(d);
  }
  if (rule === 'Every 2 Weeks') {
    const d = new Date(from); d.setDate(d.getDate() + 14); return getLocalFormattedDate(d);
  }
  if (rule === 'Every Month') {
    const d = new Date(from); d.setMonth(d.getMonth() + 1); return getLocalFormattedDate(d);
  }
  if (rule === 'Every Year') {
    const d = new Date(from); d.setFullYear(d.getFullYear() + 1); return getLocalFormattedDate(d);
  }

  // ── Custom iCal-style rules ──
  const params: Record<string, string> = {};
  rule.split(';').forEach(p => { const [k, v] = p.split('='); if (k && v) params[k] = v; });
  const freq = params['FREQ'] ?? 'Weekly';
  const interval = parseInt(params['INTERVAL'] ?? '1', 10);

  if (freq === 'Daily') {
    const d = new Date(from); d.setDate(d.getDate() + interval); return getLocalFormattedDate(d);
  }

  if (freq === 'Weekly') {
    const byday = params['BYDAY'] ? params['BYDAY'].split(',').map(s => s.trim()) : [];
    if (byday.length === 0) {
      const d = new Date(from); d.setDate(d.getDate() + 7 * interval); return getLocalFormattedDate(d);
    }
    // Find the next valid weekday after `from`
    const dayNums = byday.map(d => ORDINAL_DAYS[d] ?? -1).filter(n => n >= 0).sort((a, b) => a - b);
    let cursor = new Date(from); cursor.setDate(cursor.getDate() + 1);
    let weeksPassed = 0;
    for (let i = 0; i < 366; i++) {
      if (dayNums.includes(cursor.getDay())) {
        // Check if this is in a valid interval-week
        const weekDiff = Math.floor((cursor.getTime() - from.getTime()) / (7 * 86400000));
        if (weekDiff % interval === 0 || weeksPassed === 0) return getLocalFormattedDate(cursor);
      }
      if (cursor.getDay() === 6) weeksPassed++;
      cursor.setDate(cursor.getDate() + 1);
    }
    return undefined;
  }

  if (freq === 'Monthly') {
    if (params['BYMONTHDAY']) {
      const days = params['BYMONTHDAY'].split(',').map(Number).sort((a, b) => a - b);
      let cursor = new Date(from); cursor.setDate(cursor.getDate() + 1);
      for (let attempt = 0; attempt < interval * 35 + 5; attempt++) {
        if (days.includes(cursor.getDate())) {
          // Check it's interval months away
          const monthDiff = (cursor.getFullYear() - from.getFullYear()) * 12 + (cursor.getMonth() - from.getMonth());
          if (monthDiff % interval === 0) return getLocalFormattedDate(cursor);
          if (monthDiff > interval) {
            // Jump to next interval month
            const target = new Date(from); target.setMonth(target.getMonth() + interval * Math.ceil(monthDiff / interval));
            cursor = target; cursor.setDate(1); continue;
          }
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      return undefined;
    }
    if (params['BYSETPOS'] && params['BYDAY']) {
      const ordinal = parseInt(params['BYSETPOS'], 10);
      const dayNum = ORDINAL_DAYS[params['BYDAY'].trim()] ?? 0;
      // Find Nth weekday in next interval months
      let targetMonth = new Date(from.getFullYear(), from.getMonth() + interval, 1);
      for (let tries = 0; tries < 12; tries++) {
        const year = targetMonth.getFullYear();
        const month = targetMonth.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        let occurrences: Date[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const dt = new Date(year, month, d);
          if (dt.getDay() === dayNum) occurrences.push(dt);
        }
        const idx = ordinal === -1 ? occurrences.length - 1 : ordinal - 1;
        if (occurrences[idx]) return getLocalFormattedDate(occurrences[idx]);
        targetMonth.setMonth(targetMonth.getMonth() + interval);
      }
      return undefined;
    }
    // Simple: same day next interval months
    const d = new Date(from); d.setMonth(d.getMonth() + interval);
    return getLocalFormattedDate(d);
  }

  if (freq === 'Yearly') {
    if (params['BYMONTH']) {
      const months = params['BYMONTH'].split(',').map(m => MONTH_NAMES.indexOf(m.trim()));
      const validMonths = months.filter(m => m >= 0).sort((a, b) => a - b);
      // Find next valid month after `from`
      let cursor = new Date(from); cursor.setDate(cursor.getDate() + 1);
      for (let i = 0; i < 400; i++) {
        if (validMonths.includes(cursor.getMonth())) {
          const yearDiff = cursor.getFullYear() - from.getFullYear();
          if (yearDiff % interval === 0) return getLocalFormattedDate(cursor);
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      return undefined;
    }
    const d = new Date(from); d.setFullYear(d.getFullYear() + interval);
    return getLocalFormattedDate(d);
  }

  return undefined;
};

// --- MOCK DATA ---
const DAY = 86400000;
const IN3 = getLocalFormattedDate(new Date(Date.now() + DAY * 3));
const IN7 = getLocalFormattedDate(new Date(Date.now() + DAY * 7));

const MOCK_CHORES: Chore[] = [
  // ── TODAY: 10 chores across sections, all variations ──
  // Morning Prep section (s1)
  { id: 't1', title: 'Wash Bottles', assignee: 'Dad', avatar: '👨🏻', pool: 'Parents', points: 25, estMinutes: 10, dueDate: getTodayStr(), isOverdue: false, status: 'pending', photoRequired: false, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 0, sectionId: 's1' },
  { id: 't2', title: 'Mix Formula', assignee: 'Mom', avatar: '👩🏼', pool: 'Parents', points: 25, estMinutes: 5, dueDate: getTodayStr(), isOverdue: false, status: 'pending', photoRequired: false, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 1, sectionId: 's1' },
  { id: 't3', title: 'Pack School Lunch', assignee: 'Dad', avatar: '👨🏻', pool: 'Me', points: 30, estMinutes: 15, dueDate: getTodayStr(), isOverdue: false, status: 'pending', photoRequired: true, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 2, sectionId: 's1' },
  // After School section (s2)
  { id: 't4', title: 'Homework Check', assignee: 'Alex', avatar: '👦🏻', pool: 'Kids', points: 50, estMinutes: 30, dueDate: getTodayStr(), isOverdue: false, status: 'pending', photoRequired: false, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 0, sectionId: 's2' },
  { id: 't5', title: 'Practice Piano', assignee: 'Alex', avatar: '👦🏻', pool: 'Kids', points: 40, estMinutes: 20, dueDate: getTodayStr(), isOverdue: false, status: 'pending', photoRequired: false, photoProvided: { before: false, after: false }, isNudged: true, priorityIndex: 1, sectionId: 's2' },
  // Unsectioned today chores
  { id: 't6', title: 'Clean Kitchen Island', assignee: 'Alex', avatar: '👦🏻', pool: 'Kids', points: 100, estMinutes: 20, dueDate: getTodayStr(), isOverdue: false, status: 'pending', photoRequired: true, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 3, sectionId: null },
  { id: 't7', title: 'Take Out Trash', assignee: 'Dad', avatar: '👨🏻', pool: 'Me', points: 15, estMinutes: 5, dueDate: getTodayStr(), isOverdue: false, status: 'pending', photoRequired: false, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 4, sectionId: null },
  { id: 't8', title: 'Wipe Down Counters', assignee: 'Mom', avatar: '👩🏼', pool: 'Parents', points: 20, estMinutes: 8, dueDate: getTodayStr(), isOverdue: false, status: 'pending', photoRequired: false, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 5, sectionId: null },
  { id: 't9', title: 'Sort Recycling', assignee: 'Alex', avatar: '👦🏻', pool: 'Kids', points: 35, estMinutes: 10, dueDate: getTodayStr(), isOverdue: false, isRecurring: true, recurrenceRule: 'Every Week', status: 'pending', photoRequired: false, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 6, sectionId: null },
  { id: 't11', title: 'Empty Diaper Genie', assignee: 'Mom', avatar: '👩🏼', pool: 'Parents', points: 30, estMinutes: 5, dueDate: getTodayStr(), isOverdue: false, isRecurring: true, recurrenceRule: 'Every Day', status: 'pending', photoRequired: false, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 11, sectionId: null },
  { id: 't12', title: 'Water Plants', assignee: 'Dad', avatar: '👨🏻', pool: 'Parents', points: 25, estMinutes: 5, dueDate: getTodayStr(), isOverdue: false, isRecurring: true, recurrenceRule: 'Every 2 Weeks', status: 'pending', photoRequired: false, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 12, sectionId: null },
  { id: 't10', title: 'Fold Laundry', assignee: 'Mom', avatar: '👩🏼', pool: 'Parents', points: 50, estMinutes: 15, dueDate: getTodayStr(), isOverdue: false, status: 'completed', photoRequired: true, photoProvided: { before: true, after: true }, isNudged: false, priorityIndex: 7, sectionId: null },

  // ── OVERDUE (shows in banner) ──
  { id: 'od1', title: 'Empty Diaper Genie', assignee: 'Mom', avatar: '👩🏼', pool: 'Parents', points: 30, estMinutes: 5, dueDate: getLocalFormattedDate(new Date(Date.now() - DAY * 2)), isOverdue: true, overdueDays: 2, missedStreak: 3, isRecurring: true, recurrenceRule: 'Every Day', nextRecurringDate: getTodayStr(), status: 'pending', photoRequired: false, photoProvided: { before: false, after: false }, isNudged: true, priorityIndex: 0, sectionId: null },
  { id: 'od2', title: 'Water Plants', assignee: 'Dad', avatar: '👨🏻', pool: 'Parents', points: 25, estMinutes: 5, dueDate: getLocalFormattedDate(new Date(Date.now() - DAY)), isOverdue: true, overdueDays: 1, missedStreak: 1, isRecurring: true, recurrenceRule: 'Every 2 Weeks', nextRecurringDate: getTodayStr(), status: 'pending', photoRequired: false, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 1, sectionId: null },
  { id: 'od3', title: 'Fix Leaky Faucet', assignee: 'Dad', avatar: '👨🏻', pool: 'Me', points: 100, estMinutes: 45, dueDate: getLocalFormattedDate(new Date(Date.now() - DAY * 3)), isOverdue: true, overdueDays: 3, isRecurring: false, status: 'pending', photoRequired: true, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 2, sectionId: null },
  { id: 'od4', title: 'Monthly Budget', assignee: 'Mom', avatar: '👩🏼', pool: 'Parents', points: 50, estMinutes: 30, dueDate: getLocalFormattedDate(new Date(Date.now() - DAY * 10)), isOverdue: true, overdueDays: 10, isRecurring: true, recurrenceRule: 'Every Month', nextRecurringDate: IN7, status: 'pending', photoRequired: false, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 3, sectionId: null },

  // ── 3 DAYS LATER: 10 chores ──
  { id: 'd3_1', title: 'Deep Clean Bathroom', assignee: 'Dad', avatar: '👨🏻', pool: 'Me', points: 100, estMinutes: 45, dueDate: IN3, isOverdue: false, status: 'pending', photoRequired: true, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 0, sectionId: 's3' },
  { id: 'd3_2', title: 'Scrub Shower Tiles', assignee: 'Mom', avatar: '👩🏼', pool: 'Parents', points: 60, estMinutes: 25, dueDate: IN3, isOverdue: false, status: 'pending', photoRequired: true, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 1, sectionId: 's3' },
  { id: 'd3_3', title: 'Mop Kitchen Floor', assignee: 'Alex', avatar: '👦🏻', pool: 'Kids', points: 50, estMinutes: 20, dueDate: IN3, isOverdue: false, status: 'pending', photoRequired: false, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 2, sectionId: null },
  { id: 'd3_4', title: 'Organize Pantry', assignee: 'Mom', avatar: '👩🏼', pool: 'Parents', points: 75, estMinutes: 30, dueDate: IN3, isOverdue: false, status: 'pending', photoRequired: true, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 3, sectionId: null },
  { id: 'd3_5', title: 'Wash Car', assignee: 'Dad', avatar: '👨🏻', pool: 'Me', points: 80, estMinutes: 40, dueDate: IN3, isOverdue: false, status: 'pending', photoRequired: false, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 4, sectionId: null },
  { id: 'd3_6', title: 'Vacuum Living Room', assignee: 'Alex', avatar: '👦🏻', pool: 'Kids', points: 40, estMinutes: 15, dueDate: IN3, isOverdue: false, isRecurring: true, recurrenceRule: 'Every Week', status: 'pending', photoRequired: false, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 5, sectionId: null },
  { id: 'd3_7', title: 'Clean Windows', assignee: 'Dad', avatar: '👨🏻', pool: 'Me', points: 55, estMinutes: 25, dueDate: IN3, isOverdue: false, status: 'pending', photoRequired: false, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 6, sectionId: null },
  { id: 'd3_8', title: 'Dust Shelves', assignee: 'Alex', avatar: '👦🏻', pool: 'Kids', points: 30, estMinutes: 10, dueDate: IN3, isOverdue: false, status: 'pending', photoRequired: false, photoProvided: { before: false, after: false }, isNudged: true, priorityIndex: 7, sectionId: null },
  { id: 'd3_9', title: 'Change Bed Sheets', assignee: 'Mom', avatar: '👩🏼', pool: 'Parents', points: 45, estMinutes: 15, dueDate: IN3, isOverdue: false, status: 'pending', photoRequired: false, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 8, sectionId: null },
  { id: 'd3_10', title: 'Clean Garage Corner', assignee: 'Dad', avatar: '👨🏻', pool: 'Me', points: 90, estMinutes: 35, dueDate: IN3, isOverdue: false, status: 'pending', photoRequired: true, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 9, sectionId: null },

  // ── 1 WEEK LATER: 10 chores ──
  { id: 'w1_1', title: 'Vacuum Second Floor', assignee: 'Dad', avatar: '👨🏻', pool: 'Me', points: 50, estMinutes: 20, dueDate: IN7, isOverdue: false, status: 'pending', photoRequired: false, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 0, sectionId: 's4' },
  { id: 'w1_2', title: 'Steam Mop Hardwood', assignee: 'Mom', avatar: '👩🏼', pool: 'Parents', points: 60, estMinutes: 25, dueDate: IN7, isOverdue: false, status: 'pending', photoRequired: false, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 1, sectionId: 's4' },
  { id: 'w1_3', title: 'Meal Prep Sunday', assignee: 'Mom', avatar: '👩🏼', pool: 'Parents', points: 100, estMinutes: 60, dueDate: IN7, isOverdue: false, status: 'pending', photoRequired: true, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 2, sectionId: null },
  { id: 'w1_4', title: 'Mow the Lawn', assignee: 'Dad', avatar: '👨🏻', pool: 'Me', points: 80, estMinutes: 45, dueDate: IN7, isOverdue: false, status: 'pending', photoRequired: true, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 3, sectionId: null },
  { id: 'w1_5', title: 'Organize Toy Bins', assignee: 'Alex', avatar: '👦🏻', pool: 'Kids', points: 45, estMinutes: 20, dueDate: IN7, isOverdue: false, status: 'pending', photoRequired: false, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 4, sectionId: null },
  { id: 'w1_6', title: 'Weed Garden Bed', assignee: 'Alex', avatar: '👦🏻', pool: 'Kids', points: 60, estMinutes: 30, dueDate: IN7, isOverdue: false, status: 'pending', photoRequired: false, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 5, sectionId: null },
  { id: 'w1_7', title: 'Clean Out Fridge', assignee: 'Dad', avatar: '👨🏻', pool: 'Me', points: 55, estMinutes: 20, dueDate: IN7, isOverdue: false, status: 'pending', photoRequired: true, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 6, sectionId: null },
  { id: 'w1_8', title: 'Wash Dog', assignee: 'Alex', avatar: '👦🏻', pool: 'Kids', points: 70, estMinutes: 25, dueDate: IN7, isOverdue: false, status: 'pending', photoRequired: false, photoProvided: { before: false, after: false }, isNudged: true, priorityIndex: 7, sectionId: null },
  { id: 'w1_9', title: 'Iron Clothes', assignee: 'Mom', avatar: '👩🏼', pool: 'Parents', points: 35, estMinutes: 15, dueDate: IN7, isOverdue: false, isRecurring: true, recurrenceRule: 'Every Week', status: 'pending', photoRequired: false, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 8, sectionId: null },
  { id: 'mo1', title: 'Monthly Budget', assignee: 'Mom', avatar: '👩🏼', pool: 'Parents', points: 50, estMinutes: 30, dueDate: IN7, isOverdue: false, status: 'pending', photoRequired: false, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 9, sectionId: null },
  { id: 'w1_10', title: 'Polish Furniture', assignee: 'Dad', avatar: '👨🏻', pool: 'Me', points: 40, estMinutes: 15, dueDate: IN7, isOverdue: false, status: 'pending', photoRequired: false, photoProvided: { before: false, after: false }, isNudged: false, priorityIndex: 10, sectionId: null },
];

const MOCK_SECTIONS: Section[] = [
  { id: 's1', title: 'Morning Prep', themeColor: '#FF007A', isCollapsed: false, date: getTodayStr(), priorityIndex: 0 },
  { id: 's2', title: 'After School', themeColor: '#3B82F6', isCollapsed: false, date: getTodayStr(), priorityIndex: 1 },
  { id: 's3', title: 'Deep Clean Day', themeColor: '#10B981', isCollapsed: false, date: IN3, priorityIndex: 0 },
  { id: 's4', title: 'Weekly Reset', themeColor: '#8B5CF6', isCollapsed: false, date: IN7, priorityIndex: 0 },
];

// --- STYLESHEET (only used entries) ---
const styles = StyleSheet.create({
  dateBox: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  dateText: { fontSize: 15, fontWeight: '700' },
});

// --- CALENDAR HUD ---
const CalendarHUD = React.forwardRef(({
  selectedDate, setSelectedDate, choresByDate, isExpanded, setIsExpanded, calDate, setCalDate, calMode, setCalMode,
}: {
  selectedDate: string; setSelectedDate: (d: string) => void;
  choresByDate: Record<string, boolean>; isExpanded: boolean; setIsExpanded: (v: boolean) => void;
  calDate: Date; setCalDate: (d: Date) => void; calMode: 'Day' | 'Month' | 'Year'; setCalMode: (m: 'Day' | 'Month' | 'Year') => void;
}, ref: any) => {
  const todayStr = getTodayStr();
  const scrollRef = useRef<ScrollView>(null);
  const ITEM_WIDTH = 64;
  const GAP = 12;
  const STEP = ITEM_WIDTH + GAP;
  const GRID_SIDE_PADDING = 24;

  const stripDates = useMemo(() => {
    return Array.from({ length: 365 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return { str: getLocalFormattedDate(d), date: d };
    });
  }, []);

  const scrollToDate = useCallback((dateStr: string, animated = true) => {
    const idx = stripDates.findIndex(d => d.str === dateStr);
    if (idx !== -1 && scrollRef.current) {
      setTimeout(() => { scrollRef.current?.scrollTo({ x: idx * STEP, animated }); }, 200);
    }
  }, [stripDates, STEP]);

  React.useImperativeHandle(ref, () => ({
    scrollToDate: (dateStr: string, animated = true) => scrollToDate(dateStr, animated),
  }));

  const expansionStyle = useAnimatedStyle(() => ({
    height: withSpring(isExpanded ? 348 : 0, SPRING_CONFIG),
    opacity: withTiming(isExpanded ? 1 : 0, { duration: 200 }),
    overflow: 'hidden',
  }));

  const currentMonthLabel = useMemo(() => {
    const d = parseLocalDate(selectedDate);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [selectedDate]);

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
            const holiday = isUSFederalHoliday(curDate);
            return (
              <Pressable
                key={d}
                disabled={isPast}
                onPress={() => { Haptics.selectionAsync(); setSelectedDate(dStr); setIsExpanded(false); scrollToDate(dStr); }}
                style={{ width: '14.285%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', opacity: isPast ? 0.2 : 1 }}
              >
                <View style={[styles.dateBox, isSelected ? { backgroundColor: COLORS.primary } : isToday ? { backgroundColor: '#EEF2FF', borderColor: '#E0E7FF', borderWidth: 1 } : {}]}>
                  {holiday && <View style={{ position: 'absolute', top: -2, right: -2, width: 6, height: 6, backgroundColor: '#FBBF24', borderRadius: 3, borderWidth: 1, borderColor: '#fff' }} />}
                  <Text style={[styles.dateText, isSelected ? { color: '#fff' } : isPast ? { color: '#CBD5E1' } : choresByDate[dStr] ? { color: COLORS.primary } : isToday ? { color: COLORS.primary } : { color: '#334155' }]}>{d}</Text>
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
        return (
          <Pressable key={i} disabled={isPastMonth} onPress={() => { setCalDate(new Date(calDate.getFullYear(), i, 1)); setCalMode('Day'); Haptics.selectionAsync(); }} style={{ width: '33.33%', padding: 6, opacity: isPastMonth ? 0.3 : 1 }}>
            <View style={[{ width: '100%', paddingVertical: 16, alignItems: 'center', borderRadius: 16 }, isSelected ? { backgroundColor: COLORS.primary } : { backgroundColor: '#F8FAFC' }]}>
              <Text style={[{ fontSize: 16, fontWeight: '800' }, isSelected ? { color: '#fff' } : { color: isPastMonth ? '#CBD5E1' : '#334155' }]}>{d.toLocaleDateString('en-US', { month: 'short' })}</Text>
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
        return (
          <Pressable key={i} onPress={() => { setCalDate(new Date(year, calDate.getMonth(), 1)); setCalMode('Month'); Haptics.selectionAsync(); }} style={{ width: '33.33%', padding: 6 }}>
            <View style={[{ width: '100%', paddingVertical: 16, alignItems: 'center', borderRadius: 16 }, isSelected ? { backgroundColor: COLORS.primary } : { backgroundColor: '#F8FAFC' }]}>
              <Text style={[{ fontSize: 16, fontWeight: '800' }, isSelected ? { color: '#fff' } : { color: '#334155' }]}>{year}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View ref={ref} className="bg-white dark:bg-zinc-950 border-b border-gray-100 dark:border-zinc-900 z-30">
      <View className="items-center pt-2 pb-1">
        <Text className="text-xs font-black text-slate-500 uppercase tracking-widest">{currentMonthLabel}</Text>
      </View>
      <View style={{ height: 84 }}>
        <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16 }} decelerationRate="fast" snapToInterval={STEP} snapToAlignment="start">
          <View style={{ flexDirection: 'row', gap: GAP }}>
            {stripDates.map((d) => {
              const isSelected = selectedDate === d.str;
              const isPast = d.date < new Date(todayStr) && d.str !== todayStr;
              const hasChore = choresByDate[d.str];
              return (
                <Pressable key={d.str} disabled={isPast} onPress={() => { Haptics.selectionAsync(); setSelectedDate(d.str); }} style={[{ width: 64, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16, opacity: isPast ? 0.3 : 1 }, isSelected ? { backgroundColor: COLORS.primary, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 } : d.str === todayStr ? { backgroundColor: '#EEF2FF', borderColor: '#E0E7FF', borderWidth: 1 } : (hasChore && !isPast) ? { backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#E0E7FF' } : {}]}>
                  <Text style={[{ fontSize: 10, fontWeight: '700' }, isSelected ? { color: '#E0E7FF' } : { color: isPast ? '#CBD5E1' : '#94A3B8' }]}>{d.date.toLocaleDateString('en-US', { weekday: 'short' })}</Text>
                  <Text style={[{ fontSize: 18, fontWeight: '900' }, isSelected ? { color: '#fff' } : choresByDate[d.str] ? { color: COLORS.primary } : { color: isPast ? '#CBD5E1' : '#1E293B' }]}>{d.date.getDate()}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
      <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsExpanded(!isExpanded); }} className="items-center py-0.5 bg-white dark:bg-zinc-950 border-t border-slate-50 dark:border-zinc-900/50">
        <ChevronDown size={16} color="#CBD5E1" style={isExpanded ? { transform: [{ rotate: '180deg' }] } : {}} />
      </TouchableOpacity>
      <Animated.View style={expansionStyle} className="bg-white dark:bg-zinc-950">
        <View className="flex-row justify-between items-center mb-3 mt-2 px-6">
          <TouchableOpacity onPress={() => { const next = new Date(calDate); if (calMode === 'Day') next.setMonth(calDate.getMonth() - 1); else if (calMode === 'Month') next.setFullYear(calDate.getFullYear() - 1); else next.setFullYear(calDate.getFullYear() - 12); const today = new Date(); if (calMode === 'Day' && (next.getFullYear() < today.getFullYear() || (next.getFullYear() === today.getFullYear() && next.getMonth() < today.getMonth()))) return; if (calMode === 'Month' && next.getFullYear() < today.getFullYear()) return; setCalDate(next); }}>
            <ChevronLeft size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); if (calMode === 'Day') setCalMode('Month'); else if (calMode === 'Month') setCalMode('Year'); else setCalMode('Day'); }}>
            <Text className="text-slate-900 dark:text-white font-black text-base">{calMode === 'Day' ? calDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : calMode === 'Month' ? calDate.getFullYear() : `${calDate.getFullYear()} – ${calDate.getFullYear() + 11}`}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { const next = new Date(calDate); if (calMode === 'Day') next.setMonth(calDate.getMonth() + 1); else if (calMode === 'Month') next.setFullYear(calDate.getFullYear() + 1); else next.setFullYear(calDate.getFullYear() + 12); setCalDate(next); }}>
            <ChevronRight size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        {calMode === 'Day' ? renderDayGrid() : calMode === 'Month' ? renderMonthGrid() : renderYearGrid()}
        <View className="h-4" />
      </Animated.View>
    </View>
  );
});

// --- SECTION HEADER (full edit / delete / color / move) ---
const SectionHeader = React.memo(({
  section, onToggle, onRename, onDelete, onChangeColor,
  onMoveUp, onMoveDown, canMoveUp, canMoveDown,
  drag, isEditing, onStartEdit, onEndEdit, choreCount,
}: {
  section: Section; onToggle: () => void;
  onRename: (id: string, title: string) => void; onDelete: (id: string) => void;
  onChangeColor: (id: string, color: string) => void;
  onMoveUp: () => void; onMoveDown: () => void;
  canMoveUp: boolean; canMoveDown: boolean;
  drag?: () => void; isEditing: boolean;
  onStartEdit: () => void; onEndEdit: () => void;
  choreCount: number;
}) => {
  const [editTitle, setEditTitle] = useState(section.title);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isEditing) setEditTitle(section.title);
    else setConfirmDelete(false);
  }, [isEditing]);

  const panelStyle = useAnimatedStyle(() => ({
    height: withSpring(isEditing ? 228 : 0, SPRING_CONFIG),
    opacity: withTiming(isEditing ? 1 : 0, { duration: 150 }),
    overflow: 'hidden',
  }));

  return (
    <View collapsable={false}>
      <TouchableOpacity
        activeOpacity={1}
        onLongPress={drag}
        delayLongPress={350}
        onPress={onToggle}
        className="flex-row items-center justify-between py-3 px-6 border-t border-slate-100 dark:border-zinc-800"
      >
        <View className="flex-row items-center flex-1">
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: section.themeColor, marginRight: 10 }} />
          <Text className="text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em]">{section.title}</Text>
          {/* #16: chore count badge when collapsed */}
          {section.isCollapsed && choreCount > 0 && (
            <View style={{ backgroundColor: section.themeColor + '22', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, marginLeft: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: '900', color: section.themeColor }}>{choreCount}</Text>
            </View>
          )}
          <View className="ml-3 h-[1px] flex-1 bg-slate-100 dark:bg-zinc-800" />
        </View>
        <View className="flex-row items-center ml-3 gap-0.5">
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); isEditing ? onEndEdit() : onStartEdit(); }} className="p-1.5">
            {isEditing ? <X size={16} color={COLORS.primary} /> : <MoreHorizontal size={16} color="#CBD5E1" />}
          </TouchableOpacity>
          <View className="p-1">
            {section.isCollapsed ? <ChevronRight size={16} color="#CBD5E1" /> : <ChevronDown size={16} color="#CBD5E1" />}
          </View>
        </View>
      </TouchableOpacity>

      <Animated.View style={panelStyle}>
        <View className="mx-5 mb-3 bg-slate-50 dark:bg-zinc-900 rounded-[20px] border border-slate-100 dark:border-zinc-800 p-4">
          <TextInput
            value={editTitle}
            onChangeText={setEditTitle}
            placeholder="Section name"
            placeholderTextColor="#94A3B8"
            returnKeyType="done"
            onSubmitEditing={() => { onRename(section.id, editTitle); onEndEdit(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
            style={{ backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, fontSize: 14, fontWeight: '800', color: '#0F172A', borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 12 }}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {SECTION_COLORS.map(color => {
              const isWhite = color === '#FFFFFF';
              const isSelected = section.themeColor === color;
              return (
                <TouchableOpacity
                  key={color}
                  onPress={() => { onChangeColor(section.id, color); Haptics.selectionAsync(); }}
                  style={{
                    width: 28, height: 28, borderRadius: 14,
                    backgroundColor: color,
                    borderWidth: isSelected ? 3 : isWhite ? 1.5 : 0,
                    borderColor: isSelected ? (isWhite ? '#CBD5E1' : 'white') : '#CBD5E1',
                    shadowColor: isWhite ? '#000' : color,
                    shadowOpacity: isWhite ? 0.08 : 0.4,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 2 },
                  }}
                />
              );
            })}
          </View>
          <View className="flex-row" style={{ gap: 8 }}>
            <TouchableOpacity onPress={() => { if (canMoveUp) { onMoveUp(); Haptics.selectionAsync(); } }} disabled={!canMoveUp} className={`flex-1 py-2 rounded-2xl items-center flex-row justify-center ${canMoveUp ? 'bg-indigo-50' : 'bg-slate-100'}`} style={{ gap: 4 }}>
              <ChevronUp size={14} color={canMoveUp ? COLORS.primary : '#CBD5E1'} />
              <Text style={{ fontSize: 11, fontWeight: '900', color: canMoveUp ? COLORS.primary : '#CBD5E1' }}>Up</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { if (canMoveDown) { onMoveDown(); Haptics.selectionAsync(); } }} disabled={!canMoveDown} className={`flex-1 py-2 rounded-2xl items-center flex-row justify-center ${canMoveDown ? 'bg-indigo-50' : 'bg-slate-100'}`} style={{ gap: 4 }}>
              <ChevronDown size={14} color={canMoveDown ? COLORS.primary : '#CBD5E1'} />
              <Text style={{ fontSize: 11, fontWeight: '900', color: canMoveDown ? COLORS.primary : '#CBD5E1' }}>Down</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { if (!confirmDelete) { setConfirmDelete(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } else { onDelete(section.id); onEndEdit(); } }}
              className={`flex-1 py-2 rounded-2xl items-center flex-row justify-center ${confirmDelete ? 'bg-red-500' : 'bg-red-50'}`} style={{ gap: 4 }}
            >
              <Trash2 size={14} color={confirmDelete ? 'white' : COLORS.red} />
              <Text style={{ fontSize: 11, fontWeight: '900', color: confirmDelete ? 'white' : COLORS.red }}>{confirmDelete ? 'Confirm' : 'Delete'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => { onRename(section.id, editTitle); onEndEdit(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }} className="mt-2.5 bg-indigo-600 rounded-2xl items-center" style={{ paddingVertical: 11 }}>
            <Text style={{ color: 'white', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 }}>Save</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
});

// --- PHOTO SLOT BUTTON ---
const PhotoSlotButton = ({ slot, uri, provided, onPress }: {
  slot: 'before' | 'after';
  uri?: string;
  provided: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={{ flex: 1, borderRadius: 20, overflow: 'hidden', minHeight: 100, borderWidth: 1.5, borderStyle: uri ? 'solid' : 'dashed', borderColor: provided ? COLORS.green : '#CBD5E1' }}
  >
    {uri ? (
      <View style={{ flex: 1 }}>
        <Image source={{ uri }} style={{ width: '100%', height: 100 }} contentFit="cover" />
        {/* Overlay badge */}
        <View style={{ position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <CheckCircle2 size={10} color="white" />
          <Text style={{ fontSize: 9, fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: 0.5 }}>{slot}</Text>
        </View>
        {/* Tap to change hint */}
        <View style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
          <Text style={{ fontSize: 8, fontWeight: '900', color: 'white', textTransform: 'uppercase' }}>tap to change</Text>
        </View>
      </View>
    ) : (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 22, backgroundColor: '#F8FAFC', gap: 6 }}>
        <Camera size={22} color="#94A3B8" />
        <Text style={{ fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, color: '#94A3B8' }}>{slot}</Text>
      </View>
    )}
  </TouchableOpacity>
);

// --- CHORE EDIT PANEL ---
const ChoreEditPanel = ({
  chore, onClose, onSave, sections,
}: {
  chore: Chore;
  onClose: () => void;
  onSave: (updates: Partial<Chore>, scope: 'this' | 'all') => void;
  sections: Section[];
}) => {
  // Recurring scope — only relevant if chore is already recurring
  const [recurScope, setRecurScope] = useState<'this' | 'all'>('all');

  // Pre-fill from existing chore
  const initialAssignee = chore.assignee ? (FAMILY_MEMBERS.find(m => m.name === chore.assignee) ?? null) : null;
  const [title, setTitle] = useState(chore.title);
  const [assignee, setAssignee] = useState<typeof FAMILY_MEMBERS[0] | null>(initialAssignee);
  const [sectionId, setSectionId] = useState<string | null>(chore.sectionId);
  const [error, setError] = useState(false);

  const [estMinutes, setEstMinutes] = useState(chore.estMinutes);
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [customH, setCustomH] = useState(Math.floor(chore.estMinutes / 60));
  const [customM, setCustomM] = useState(chore.estMinutes % 60);

  const [pointsMode, setPointsMode] = useState<'time' | 'custom'>('custom');
  const [multiplier, setMultiplier] = useState(1);
  const [customPoints, setCustomPoints] = useState(String(chore.points));

  const [photoRequired, setPhotoRequired] = useState(chore.photoRequired);
  const [photoMode, setPhotoMode] = useState<'after' | 'both'>('both');

  const [isRecurring, setIsRecurring] = useState(!!chore.isRecurring);
  const isPreset = chore.recurrenceRule && ['Every Day','Every Week','Every 2 Weeks','Every Month','Every Year'].includes(chore.recurrenceRule);
  const [recurringPreset, setRecurringPreset] = useState(isPreset ? chore.recurrenceRule! : (chore.recurrenceRule ? 'Custom' : 'Every Week'));
  const initFreq = chore.recurrenceRule?.startsWith('FREQ=') ? (chore.recurrenceRule.match(/FREQ=([^;]+)/)?.[1] as any ?? 'Weekly') : 'Weekly';
  const initInterval = chore.recurrenceRule ? parseInt(chore.recurrenceRule.match(/INTERVAL=(\d+)/)?.[1] ?? '1', 10) : 1;
  const [customFreq, setCustomFreq] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly'>(initFreq);
  const [customInterval, setCustomInterval] = useState(initInterval);
  const [customDaysOfWeek, setCustomDaysOfWeek] = useState<string[]>([]);
  const [customMonthlyMode, setCustomMonthlyMode] = useState<'each' | 'on_the'>('each');
  const [customMonthlyDays, setCustomMonthlyDays] = useState<number[]>([]);
  const [customMonthlyOrdinal, setCustomMonthlyOrdinal] = useState('First');
  const [customMonthlyOrdinalDay, setCustomMonthlyOrdinalDay] = useState('Sun');
  const [customYearlyMonths, setCustomYearlyMonths] = useState<string[]>([]);
  const [customYearlyUsesOrdinal, setCustomYearlyUsesOrdinal] = useState(false);

  const [showWhoDropdown, setShowWhoDropdown] = useState(false);
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showRecurringDropdown, setShowRecurringDropdown] = useState(false);
  const translateY = useSharedValue(800);
  const shakeX = useSharedValue(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => { translateY.value = withSpring(0, { ...SPRING_CONFIG, damping: 30 }); }, []);
  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const titleStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));
  const daySections = sections.filter(s => s.date === chore.dueDate);

  const calculatedPoints = pointsMode === 'time'
    ? (isCustomTime ? (customH * 60 + customM) : estMinutes) * multiplier
    : parseInt(customPoints) || 0;

  const handleSave = () => {
    if (!title.trim()) {
      setError(true);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      shakeX.value = withSequence(
        withTiming(-10, { duration: 50 }), withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }), withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const member = assignee ?? FAMILY_MEMBERS[0];
    const effectiveScope = chore.isRecurring ? recurScope : 'this';

    // Build recurrenceRule
    let recurrenceRule: string | undefined;
    if (isRecurring) {
      if (recurringPreset === 'Custom') {
        let rule = `FREQ=${customFreq};INTERVAL=${customInterval}`;
        if (customFreq === 'Weekly' && customDaysOfWeek.length > 0) rule += `;BYDAY=${customDaysOfWeek.join(',')}`;
        if (customFreq === 'Monthly') {
          if (customMonthlyMode === 'each' && customMonthlyDays.length > 0) rule += `;BYMONTHDAY=${customMonthlyDays.join(',')}`;
          else if (customMonthlyMode === 'on_the') rule += `;BYSETPOS=${ORDINALS[customMonthlyOrdinal] ?? 1};BYDAY=${customMonthlyOrdinalDay}`;
        }
        if (customFreq === 'Yearly' && customYearlyMonths.length > 0) rule += `;BYMONTH=${customYearlyMonths.join(',')}`;
        recurrenceRule = rule;
      } else {
        recurrenceRule = recurringPreset;
      }
    }

    // "just this one" on a recurring chore breaks the recurring link for this instance
    const recurringUpdates = chore.isRecurring && effectiveScope === 'this'
      ? { isRecurring: false, nextRecurringDate: undefined, recurrenceRule: undefined }
      : { isRecurring, recurrenceRule, nextRecurringDate: isRecurring && recurrenceRule ? computeNextDate(chore.dueDate, recurrenceRule) : undefined };

    onSave({
      title: title.trim(),
      assignee: member.name,
      avatar: member.avatar,
      pool: member.pool,
      points: calculatedPoints,
      estMinutes: isCustomTime ? (customH * 60 + customM) : estMinutes,
      photoRequired,
      photoMode: photoRequired ? photoMode : undefined,
      sectionId,
      ...recurringUpdates,
    }, effectiveScope);
    onClose();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const toggleArrayItem = (setter: any, item: any) => {
    setter((prev: any[]) => prev.includes(item) ? prev.filter((i: any) => i !== item) : [...prev, item]);
    Haptics.selectionAsync();
  };

  return (
    <Modal visible animationType="none" transparent statusBarTranslucent>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,23,42,0.6)' }]} />
        <Animated.View style={[panelStyle, { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '90%' }]}>
          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingTop: 14, paddingBottom: 10 }}>
            <View style={{ width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 2.5 }} />
          </View>

          <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#0F172A' }}>Edit Chore</Text>
              <TouchableOpacity onPress={onClose} style={{ backgroundColor: '#F1F5F9', padding: 8, borderRadius: 20 }}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Recurring scope banner — shown only if this chore is already recurring */}
            {chore.isRecurring && (
              <View style={{ marginBottom: 20, backgroundColor: '#F0FDF4', borderRadius: 20, padding: 4, flexDirection: 'row', gap: 4, borderWidth: 1, borderColor: '#BBF7D0' }}>
                {(['all', 'this'] as const).map(s => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => { setRecurScope(s); Haptics.selectionAsync(); }}
                    style={{ flex: 1, paddingVertical: 11, borderRadius: 16, alignItems: 'center', backgroundColor: recurScope === s ? COLORS.green : 'transparent' }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '900', color: recurScope === s ? 'white' : COLORS.green }}>
                      {s === 'all' ? 'All Future Occurrences' : 'Just This One'}
                    </Text>
                    {s === 'this' && recurScope === 'this' && (
                      <Text style={{ fontSize: 9, fontWeight: '700', color: 'white', opacity: 0.85, marginTop: 2 }}>Breaks recurring link</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* 1. Title */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 10, fontWeight: '900', color: error ? COLORS.red : '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Task Description {error && '• Required'}</Text>
              <Animated.View style={titleStyle}>
                <TextInput
                  value={title}
                  onChangeText={(v) => { setTitle(v); if (v.trim()) setError(false); }}
                  placeholder="e.g. Clean the kitchen counter"
                  placeholderTextColor="#CBD5E1"
                  style={{ backgroundColor: '#F8FAFC', paddingHorizontal: 20, paddingVertical: 16, borderRadius: 20, fontSize: 17, fontWeight: '700', color: '#0F172A', borderWidth: 1.5, borderColor: error ? COLORS.red : '#F1F5F9' }}
                />
              </Animated.View>
            </View>

            {/* 2. Who + Section */}
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 24, zIndex: 50 }}>
              <View style={{ flex: 1, zIndex: 50 }}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Assignee</Text>
                <TouchableOpacity
                  onPress={() => { setShowWhoDropdown(!showWhoDropdown); setShowSectionDropdown(false); setShowRecurringDropdown(false); }}
                  style={{ height: 60, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9', paddingHorizontal: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 20 }}>{assignee?.avatar ?? '👤'}</Text>
                    <Text style={{ fontWeight: '700', color: '#334155' }}>{assignee?.name ?? 'Select'}</Text>
                  </View>
                  <ChevronDown size={16} color="#94A3B8" />
                </TouchableOpacity>
                {showWhoDropdown && (
                  <View style={{ position: 'absolute', top: 85, left: 0, right: 0, backgroundColor: 'white', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 10, zIndex: 1000 }}>
                    <ScrollView style={{ maxHeight: 200 }} bounces={false}>
                      {FAMILY_MEMBERS.map(m => (
                        <TouchableOpacity key={m.name} onPress={() => { setAssignee(m); setShowWhoDropdown(false); Haptics.selectionAsync(); }}
                          style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC', backgroundColor: assignee?.name === m.name ? '#EEF2FF' : 'white' }}>
                          <Text style={{ fontSize: 18 }}>{m.avatar}</Text>
                          <Text style={{ fontWeight: '700', color: assignee?.name === m.name ? COLORS.primary : '#475569' }}>{m.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={{ flex: 1, zIndex: 40 }}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Section</Text>
                <TouchableOpacity
                  onPress={() => { setShowSectionDropdown(!showSectionDropdown); setShowWhoDropdown(false); setShowRecurringDropdown(false); }}
                  style={{ height: 60, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9', paddingHorizontal: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sectionId ? sections.find(s => s.id === sectionId)?.themeColor : '#CBD5E1' }} />
                    <Text style={{ fontWeight: '700', color: '#334155' }} numberOfLines={1}>{sectionId ? sections.find(s => s.id === sectionId)?.title : 'None'}</Text>
                  </View>
                  <ChevronDown size={16} color="#94A3B8" />
                </TouchableOpacity>
                {showSectionDropdown && (
                  <View style={{ position: 'absolute', top: 85, left: 0, right: 0, backgroundColor: 'white', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 10, zIndex: 1000 }}>
                    <ScrollView style={{ maxHeight: 200 }} bounces={false}>
                      <TouchableOpacity onPress={() => { setSectionId(null); setShowSectionDropdown(false); Haptics.selectionAsync(); }}
                        style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC', backgroundColor: sectionId === null ? '#EEF2FF' : 'white' }}>
                        <Text style={{ fontWeight: '700', color: sectionId === null ? COLORS.primary : '#475569' }}>None</Text>
                      </TouchableOpacity>
                      {daySections.map(s => (
                        <TouchableOpacity key={s.id} onPress={() => { setSectionId(s.id); setShowSectionDropdown(false); Haptics.selectionAsync(); }}
                          style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC', backgroundColor: sectionId === s.id ? '#EEF2FF' : 'white' }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.themeColor }} />
                          <Text style={{ fontWeight: '700', color: sectionId === s.id ? COLORS.primary : '#475569' }}>{s.title}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>

            {/* 3. Time */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>Estimated Time</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {QUICK_TIMES.map(t => (
                  <TouchableOpacity key={t.label} onPress={() => { setEstMinutes(t.value); setIsCustomTime(false); setShowTimeDropdown(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={{ flex: 1, minWidth: 70, paddingVertical: 12, borderRadius: 20, alignItems: 'center', borderWidth: 2, backgroundColor: (!isCustomTime && estMinutes === t.value) ? t.color : '#F8FAFC', borderColor: (!isCustomTime && estMinutes === t.value) ? t.color : '#F1F5F9' }}>
                    <Text style={{ fontSize: 13, fontWeight: '900', color: (!isCustomTime && estMinutes === t.value) ? 'white' : '#64748B' }}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity onPress={() => { if (!isCustomTime) { setIsCustomTime(true); setShowTimeDropdown(true); } else { setShowTimeDropdown(!showTimeDropdown); } Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={{ flex: 1, minWidth: 70, paddingVertical: 12, borderRadius: 20, alignItems: 'center', borderWidth: 2, backgroundColor: isCustomTime ? '#0F172A' : '#F8FAFC', borderColor: isCustomTime ? '#0F172A' : '#F1F5F9' }}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: isCustomTime ? 'white' : '#64748B' }}>Custom</Text>
                </TouchableOpacity>
              </View>
              {isCustomTime && showTimeDropdown && (
                <View style={{ marginTop: 16, backgroundColor: '#F8FAFC', padding: 24, borderRadius: 28, borderWidth: 1, borderColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Hours</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <TouchableOpacity onPress={() => { setCustomH(Math.max(0, customH - 1)); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={{ width: 32, height: 32, backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}><ChevronDown size={14} color="#64748B" /></TouchableOpacity>
                      <TextInput keyboardType="numeric" value={String(customH)} onChangeText={v => setCustomH(Math.min(23, parseInt(v) || 0))} style={{ fontSize: 30, fontWeight: '900', color: '#0F172A', width: 40, textAlign: 'center' }} />
                      <TouchableOpacity onPress={() => { setCustomH(Math.min(23, customH + 1)); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={{ width: 32, height: 32, backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}><ChevronUp size={14} color="#64748B" /></TouchableOpacity>
                    </View>
                  </View>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: '#CBD5E1', marginTop: 16 }}>:</Text>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Mins</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <TouchableOpacity onPress={() => { setCustomM(Math.max(0, customM - 5)); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={{ width: 32, height: 32, backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}><ChevronDown size={14} color="#64748B" /></TouchableOpacity>
                      <TextInput keyboardType="numeric" value={String(customM).padStart(2, '0')} onChangeText={v => setCustomM(Math.min(59, parseInt(v) || 0))} style={{ fontSize: 30, fontWeight: '900', color: '#0F172A', width: 48, textAlign: 'center' }} />
                      <TouchableOpacity onPress={() => { setCustomM(Math.min(55, customM + 5)); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={{ width: 32, height: 32, backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}><ChevronUp size={14} color="#64748B" /></TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* 4. Points */}
            <View style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5 }}>Points Rewards</Text>
                <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 20, padding: 4 }}>
                  {(['time', 'custom'] as const).map(m => (
                    <Pressable key={m} onPress={() => requestAnimationFrame(() => setPointsMode(m))} style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, backgroundColor: pointsMode === m ? 'white' : 'transparent' }}>
                      <Text style={{ fontSize: 10, fontWeight: '900', color: pointsMode === m ? COLORS.primary : '#94A3B8' }}>{m === 'time' ? 'TIME BASED' : 'CUSTOM'}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 28, padding: 20 }}>
                {pointsMode === 'time' ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ fontSize: 30, fontWeight: '900', color: COLORS.primary }}>{calculatedPoints}<Text style={{ fontSize: 14, color: '#A5B4FC' }}> pts</Text></Text>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8', marginTop: 4 }}>BASED ON TIME</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {[1, 2, 3, 5].map(m => (
                        <TouchableOpacity key={m} onPress={() => { setMultiplier(m); Haptics.selectionAsync(); }} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: multiplier === m ? COLORS.primary : 'white', borderColor: multiplier === m ? COLORS.primary : '#E2E8F0' }}>
                          <Text style={{ fontSize: 12, fontWeight: '900', color: multiplier === m ? 'white' : '#64748B' }}>x{m}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <TextInput keyboardType="numeric" value={customPoints} onChangeText={setCustomPoints} style={{ fontSize: 30, fontWeight: '900', color: '#0F172A', flex: 1 }} placeholder="0" />
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#94A3B8', marginLeft: 16 }}>POINTS</Text>
                  </View>
                )}
              </View>
            </View>

            {/* 5. Photo Required */}
            <View style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Camera size={16} color={photoRequired ? COLORS.primary : '#94A3B8'} />
                  <Text style={{ fontSize: 10, fontWeight: '900', color: photoRequired ? COLORS.primary : '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5 }}>Photo Required</Text>
                </View>
                <Pressable onPress={() => { setPhotoRequired(!photoRequired); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={{ width: 48, height: 24, borderRadius: 12, paddingHorizontal: 4, justifyContent: 'center', backgroundColor: photoRequired ? COLORS.primary : '#E2E8F0' }}>
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: 'white', alignSelf: photoRequired ? 'flex-end' : 'flex-start' }} />
                </Pressable>
              </View>
              {photoRequired && (
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {(['after', 'both'] as const).map(mode => (
                    <TouchableOpacity key={mode} onPress={() => setPhotoMode(mode)} style={{ flex: 1, padding: 16, borderRadius: 20, borderWidth: 2, alignItems: 'center', backgroundColor: photoMode === mode ? '#EEF2FF' : 'white', borderColor: photoMode === mode ? COLORS.primary : '#F1F5F9' }}>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        {mode === 'both' && <Camera size={16} color={photoMode === mode ? COLORS.primary : '#94A3B8'} />}
                        <Camera size={mode === 'both' ? 16 : 20} color={photoMode === mode ? COLORS.primary : '#94A3B8'} />
                      </View>
                      <Text style={{ fontSize: 10, fontWeight: '900', marginTop: 8, color: photoMode === mode ? COLORS.primary : '#94A3B8' }}>{mode === 'after' ? 'ONLY AFTER' : 'BEFORE & AFTER'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* 6. Recurring — hidden if "just this one" chosen */}
            {!(chore.isRecurring && recurScope === 'this') && (
              <View style={{ marginBottom: 40 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <RotateCcw size={16} color={isRecurring ? COLORS.primary : '#94A3B8'} />
                    <Text style={{ fontSize: 10, fontWeight: '900', color: isRecurring ? COLORS.primary : '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5 }}>Recurring Task</Text>
                  </View>
                  <Pressable onPress={() => {
                    if (!isRecurring && !assignee) {
                      Alert.alert('Assignee Required', 'Please assign someone before enabling recurring. Recurring tasks must have an assignee.', [{ text: 'OK' }]);
                      return;
                    }
                    setIsRecurring(!isRecurring);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }} style={{ width: 48, height: 24, borderRadius: 12, paddingHorizontal: 4, justifyContent: 'center', backgroundColor: isRecurring ? COLORS.primary : '#E2E8F0' }}>
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: 'white', alignSelf: isRecurring ? 'flex-end' : 'flex-start' }} />
                  </Pressable>
                </View>
                {isRecurring && (
                  <View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {RECURRING_PRESETS.map(preset => (
                          <Pressable key={preset} onPress={() => requestAnimationFrame(() => { setRecurringPreset(preset); Haptics.selectionAsync(); })} style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, backgroundColor: recurringPreset === preset ? COLORS.primary : '#F8FAFC', borderColor: recurringPreset === preset ? COLORS.primary : '#F1F5F9' }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: recurringPreset === preset ? 'white' : '#64748B' }}>{preset}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>
                    {recurringPreset === 'Custom' && (
                      <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9', padding: 20, borderRadius: 28, gap: 24 }}>
                        <View style={{ flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 20, padding: 4 }}>
                          {RECURRING_FREQUENCIES.map(freq => (
                            <Pressable key={freq} onPress={() => requestAnimationFrame(() => { setCustomFreq(freq as any); Haptics.selectionAsync(); })} style={{ flex: 1, paddingVertical: 8, borderRadius: 16, alignItems: 'center', backgroundColor: customFreq === freq ? 'white' : 'transparent' }}>
                              <Text style={{ fontSize: 10, fontWeight: '900', color: customFreq === freq ? COLORS.primary : '#64748B' }}>{freq.toUpperCase()}</Text>
                            </Pressable>
                          ))}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={{ fontWeight: '700', color: '#475569' }}>Every</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Pressable onPress={() => setCustomInterval(Math.max(1, customInterval - 1))} style={{ width: 32, height: 32, backgroundColor: 'white', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}><ChevronDown size={14} color="#64748B" /></Pressable>
                            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A', width: 32, textAlign: 'center' }}>{customInterval}</Text>
                            <Pressable onPress={() => setCustomInterval(customInterval + 1)} style={{ width: 32, height: 32, backgroundColor: 'white', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}><ChevronUp size={14} color="#64748B" /></Pressable>
                            <Text style={{ fontWeight: '700', color: '#64748B', marginLeft: 4 }}>{customFreq === 'Daily' ? (customInterval > 1 ? 'days' : 'day') : customFreq.replace('ly', customInterval > 1 ? 's' : '')}</Text>
                          </View>
                        </View>
                        {customFreq === 'Weekly' && (
                          <View style={{ borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 16 }}>
                            <Text style={{ fontSize: 9, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 12 }}>On these days</Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              {DAYS_OF_WEEK.map(day => {
                                const active = customDaysOfWeek.includes(day);
                                return (
                                  <Pressable key={day} onPress={() => toggleArrayItem(setCustomDaysOfWeek, day)} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: active ? COLORS.primary : 'white', borderColor: active ? COLORS.primary : '#E2E8F0' }}>
                                    <Text style={{ fontSize: 10, fontWeight: '900', color: active ? 'white' : '#64748B' }}>{day.slice(0, 1)}</Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                          </View>
                        )}
                        {customFreq === 'Monthly' && (
                          <View style={{ borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 16 }}>
                            <View style={{ flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 20, padding: 4, marginBottom: 16 }}>
                              {(['each', 'on_the'] as const).map(mode => (
                                <Pressable key={mode} onPress={() => requestAnimationFrame(() => setCustomMonthlyMode(mode))} style={{ flex: 1, paddingVertical: 8, borderRadius: 16, alignItems: 'center', backgroundColor: customMonthlyMode === mode ? 'white' : 'transparent' }}>
                                  <Text style={{ fontSize: 10, fontWeight: '900', color: customMonthlyMode === mode ? '#0F172A' : '#64748B' }}>{mode === 'each' ? 'EACH' : 'ON THE'}</Text>
                                </Pressable>
                              ))}
                            </View>
                            {customMonthlyMode === 'each' ? (
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                                  const active = customMonthlyDays.includes(day);
                                  return (
                                    <View key={day} style={{ width: '14.28%', aspectRatio: 1, padding: 3 }}>
                                      <Pressable onPress={() => toggleArrayItem(setCustomMonthlyDays, day)} style={{ flex: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: active ? COLORS.primary : 'white', borderColor: active ? COLORS.primary : '#E2E8F0' }}>
                                        <Text style={{ fontSize: 11, fontWeight: '900', color: active ? 'white' : '#475569' }}>{day}</Text>
                                      </Pressable>
                                    </View>
                                  );
                                })}
                              </View>
                            ) : (
                              <View style={{ flexDirection: 'row', gap: 12 }}>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 8, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', textAlign: 'center', marginBottom: 8 }}>Week</Text>
                                  <ScrollView style={{ maxHeight: 120 }} nestedScrollEnabled>
                                    {WEEK_ORDINALS.map(ord => (
                                      <Pressable key={ord} onPress={() => requestAnimationFrame(() => { setCustomMonthlyOrdinal(ord); Haptics.selectionAsync(); })} style={{ padding: 8, borderRadius: 10, marginBottom: 4, alignItems: 'center', backgroundColor: customMonthlyOrdinal === ord ? '#EEF2FF' : 'white' }}>
                                        <Text style={{ fontSize: 10, fontWeight: '700', color: customMonthlyOrdinal === ord ? COLORS.primary : '#64748B' }}>{ord}</Text>
                                      </Pressable>
                                    ))}
                                  </ScrollView>
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 8, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', textAlign: 'center', marginBottom: 8 }}>Day</Text>
                                  <ScrollView style={{ maxHeight: 120 }} nestedScrollEnabled>
                                    {DAYS_OF_WEEK.map(day => (
                                      <Pressable key={day} onPress={() => requestAnimationFrame(() => { setCustomMonthlyOrdinalDay(day); Haptics.selectionAsync(); })} style={{ padding: 8, borderRadius: 10, marginBottom: 4, alignItems: 'center', backgroundColor: customMonthlyOrdinalDay === day ? '#EEF2FF' : 'white' }}>
                                        <Text style={{ fontSize: 10, fontWeight: '700', color: customMonthlyOrdinalDay === day ? COLORS.primary : '#64748B' }}>{day}</Text>
                                      </Pressable>
                                    ))}
                                  </ScrollView>
                                </View>
                              </View>
                            )}
                          </View>
                        )}
                        {customFreq === 'Yearly' && (
                          <View style={{ borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 16 }}>
                            <Text style={{ fontSize: 9, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 12, textAlign: 'center' }}>In these months</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
                              {MONTHS.map(month => {
                                const active = customYearlyMonths.includes(month);
                                return (
                                  <Pressable key={month} onPress={() => toggleArrayItem(setCustomYearlyMonths, month)} style={{ width: '22%', paddingVertical: 8, borderRadius: 12, alignItems: 'center', borderWidth: 1, backgroundColor: active ? COLORS.primary : 'white', borderColor: active ? COLORS.primary : '#E2E8F0' }}>
                                    <Text style={{ fontSize: 10, fontWeight: '900', color: active ? 'white' : '#64748B' }}>{month}</Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 12 }}>
                              <Text style={{ fontWeight: '700', color: '#475569', fontSize: 12 }}>On specific days of week</Text>
                              <Pressable onPress={() => { setCustomYearlyUsesOrdinal(!customYearlyUsesOrdinal); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={{ width: 40, height: 20, borderRadius: 10, paddingHorizontal: 3, justifyContent: 'center', backgroundColor: customYearlyUsesOrdinal ? COLORS.primary : '#E2E8F0' }}>
                                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: 'white', alignSelf: customYearlyUsesOrdinal ? 'flex-end' : 'flex-start' }} />
                              </Pressable>
                            </View>
                            {customYearlyUsesOrdinal && (
                              <View style={{ flexDirection: 'row', gap: 12 }}>
                                <View style={{ flex: 1 }}>
                                  <ScrollView style={{ maxHeight: 100 }} nestedScrollEnabled>
                                    {WEEK_ORDINALS.map(ord => (
                                      <Pressable key={ord} onPress={() => requestAnimationFrame(() => { setCustomMonthlyOrdinal(ord); Haptics.selectionAsync(); })} style={{ padding: 8, borderRadius: 10, marginBottom: 4, alignItems: 'center', backgroundColor: customMonthlyOrdinal === ord ? '#EEF2FF' : 'white' }}>
                                        <Text style={{ fontSize: 10, fontWeight: '700', color: customMonthlyOrdinal === ord ? COLORS.primary : '#64748B' }}>{ord}</Text>
                                      </Pressable>
                                    ))}
                                  </ScrollView>
                                </View>
                                <View style={{ flex: 1 }}>
                                  <ScrollView style={{ maxHeight: 100 }} nestedScrollEnabled>
                                    {DAYS_OF_WEEK.map(day => (
                                      <Pressable key={day} onPress={() => requestAnimationFrame(() => { setCustomMonthlyOrdinalDay(day); Haptics.selectionAsync(); })} style={{ padding: 8, borderRadius: 10, marginBottom: 4, alignItems: 'center', backgroundColor: customMonthlyOrdinalDay === day ? '#EEF2FF' : 'white' }}>
                                        <Text style={{ fontSize: 10, fontWeight: '700', color: customMonthlyOrdinalDay === day ? COLORS.primary : '#64748B' }}>{day}</Text>
                                      </Pressable>
                                    ))}
                                  </ScrollView>
                                </View>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Save */}
            <TouchableOpacity onPress={handleSave} style={{ backgroundColor: COLORS.primary, borderRadius: 28, alignItems: 'center', paddingVertical: 18, shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}>
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 }}>Save Changes</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// --- DEFER DATE PICKER MODAL ---
const DeferDatePickerModal = ({
  choreTitle, onClose, onDefer,
}: {
  choreTitle: string;
  onClose: () => void;
  onDefer: (date: string) => void;
}) => {
  const today = parseLocalDate(getTodayStr());
  const tomorrowDate = new Date(today); tomorrowDate.setDate(today.getDate() + 1);
  const tomorrow = getLocalFormattedDate(tomorrowDate);

  const [calMonth, setCalMonth] = useState(new Date(tomorrowDate.getFullYear(), tomorrowDate.getMonth(), 1));
  const [selected, setSelected] = useState<string | null>(null);

  const translateY = useSharedValue(600);
  useEffect(() => { translateY.value = withSpring(0, { ...SPRING_CONFIG, damping: 28 }); }, []);
  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const firstDay = getFirstDayOfMonth(year, month);
  const daysInMonth = getDaysInMonth(year, month);
  const monthLabel = calMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const isFuture = (d: number) => {
    const dt = getLocalFormattedDate(new Date(year, month, d));
    return dt > getTodayStr();
  };

  const handleSelect = (dateStr: string) => {
    setSelected(dateStr);
    Haptics.selectionAsync();
  };

  return (
    <Modal visible animationType="none" transparent statusBarTranslucent>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,23,42,0.55)' }]} />
        <Animated.View style={[panelStyle, { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: 40 }]}>
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: 14, paddingBottom: 10 }}>
            <View style={{ width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 2.5 }} />
          </View>

          <View style={{ paddingHorizontal: 24 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <View>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#0F172A' }}>Defer To</Text>
                <Text style={{ fontSize: 13, color: '#94A3B8', marginTop: 2 }} numberOfLines={1}>{choreTitle}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{ backgroundColor: '#F1F5F9', padding: 8, borderRadius: 20 }}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Quick: Tomorrow */}
            <TouchableOpacity
              onPress={() => handleSelect(tomorrow)}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: selected === tomorrow ? COLORS.primary : '#F8FAFC',
                borderRadius: 20, padding: 18, marginBottom: 20,
                borderWidth: 1.5, borderColor: selected === tomorrow ? COLORS.primary : '#E2E8F0',
              }}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: selected === tomorrow ? 'rgba(255,255,255,0.2)' : '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={20} color={selected === tomorrow ? 'white' : COLORS.primary} />
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: selected === tomorrow ? 'white' : '#0F172A' }}>Tomorrow</Text>
                  <Text style={{ fontSize: 12, color: selected === tomorrow ? 'rgba(255,255,255,0.7)' : '#94A3B8', marginTop: 1 }}>
                    {parseLocalDate(tomorrow).toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              </View>
              {selected === tomorrow && <CheckCircle2 size={22} color="white" />}
            </TouchableOpacity>

            {/* Calendar */}
            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#F1F5F9' }}>
              {/* Month nav */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <TouchableOpacity
                  onPress={() => {
                    const prev = new Date(calMonth); prev.setMonth(prev.getMonth() - 1);
                    // Don't go before current month
                    const nowMonth = new Date(); nowMonth.setDate(1); nowMonth.setHours(0,0,0,0);
                    if (prev >= nowMonth) setCalMonth(prev);
                  }}
                  style={{ padding: 8, borderRadius: 12, backgroundColor: 'white' }}
                >
                  <ChevronLeft size={18} color="#64748B" />
                </TouchableOpacity>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>{monthLabel}</Text>
                <TouchableOpacity
                  onPress={() => { const next = new Date(calMonth); next.setMonth(next.getMonth() + 1); setCalMonth(next); }}
                  style={{ padding: 8, borderRadius: 12, backgroundColor: 'white' }}
                >
                  <ChevronRight size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Day headers */}
              <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d, i) => (
                  <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8' }}>{d}</Text>
                  </View>
                ))}
              </View>

              {/* Day grid — 7 equal columns via rows of 7 */}
              {Array.from({ length: Math.ceil(cells.length / 7) }, (_, rowIdx) => (
                <View key={rowIdx} style={{ flexDirection: 'row', marginBottom: 2 }}>
                  {cells.slice(rowIdx * 7, rowIdx * 7 + 7).map((day, colIdx) => {
                    if (!day) return <View key={`e${rowIdx}-${colIdx}`} style={{ flex: 1, aspectRatio: 1 }} />;
                    const dateStr = getLocalFormattedDate(new Date(year, month, day));
                    const future = isFuture(day);
                    const isSelected = selected === dateStr;
                    return (
                      <View key={day} style={{ flex: 1, aspectRatio: 1, padding: 2 }}>
                        <TouchableOpacity
                          disabled={!future}
                          onPress={() => handleSelect(dateStr)}
                          style={{
                            flex: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
                            backgroundColor: isSelected ? COLORS.primary : 'transparent',
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={{
                            fontSize: 13, fontWeight: isSelected ? '900' : '600',
                            color: isSelected ? 'white' : future ? '#0F172A' : '#CBD5E1',
                          }}>{day}</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                  {/* Pad remaining cells in last row so columns align */}
                  {cells.slice(rowIdx * 7, rowIdx * 7 + 7).length < 7 &&
                    Array.from({ length: 7 - cells.slice(rowIdx * 7, rowIdx * 7 + 7).length }, (_, k) => (
                      <View key={`pad${k}`} style={{ flex: 1, aspectRatio: 1 }} />
                    ))
                  }
                </View>
              ))}
            </View>

            {/* Confirm button */}
            <TouchableOpacity
              onPress={() => { if (selected) { onDefer(selected); onClose(); } }}
              disabled={!selected}
              style={{
                marginTop: 20, backgroundColor: selected ? COLORS.primary : '#E2E8F0',
                borderRadius: 20, paddingVertical: 18, alignItems: 'center',
              }}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 16, fontWeight: '900', color: selected ? 'white' : '#94A3B8' }}>
                {selected ? `Defer to ${parseLocalDate(selected).toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })}` : 'Pick a Date'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// --- PLINKO BOARD MODAL ---
type PlinkoBoardModalProps = {
  chore: Chore;
  onClose: () => void;
  onAssign: (id: string, member: typeof FAMILY_MEMBERS[0], isMe: boolean) => void;
  currentUser: string;
  familyMembers: typeof FAMILY_MEMBERS;
};

const PlinkoBoardModal = ({ chore, onClose, onAssign, currentUser, familyMembers }: PlinkoBoardModalProps) => {
  const translateY = useSharedValue(600);
  const puckX = useSharedValue(150);
  const puckY = useSharedValue(30);
  const puckScale = useSharedValue(1);
  const [phase, setPhase] = useState<'idle' | 'dropping' | 'done'>('idle');
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);

  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const puckAnimStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    transform: [
      { translateX: puckX.value - 20 },
      { translateY: puckY.value - 20 },
      { scale: puckScale.value },
    ],
  }));

  useEffect(() => { translateY.value = withSpring(0, { ...SPRING_CONFIG, damping: 30 }); }, []);

  useEffect(() => {
    puckX.value = 150; puckY.value = 30; puckScale.value = 1;
    setPhase('idle'); setWinnerIndex(null);
  }, [chore.id]);

  const handleDrop = useCallback(() => {
    const winner = Math.floor(Math.random() * familyMembers.length);
    setWinnerIndex(winner);
    setPhase('dropping');
    const path = calcPlinkoPath(winner);
    const SEGS = [280, 320, 360, 400];

    puckX.value = withSequence(
      withTiming(path[1].x, { duration: SEGS[0], easing: Easing.inOut(Easing.quad) }),
      withTiming(path[2].x, { duration: SEGS[1], easing: Easing.inOut(Easing.quad) }),
      withTiming(path[3].x, { duration: SEGS[2], easing: Easing.inOut(Easing.quad) }),
      withTiming(path[4].x, { duration: SEGS[3], easing: Easing.inOut(Easing.quad) }),
    );
    puckY.value = withSequence(
      withTiming(path[1].y, { duration: SEGS[0], easing: Easing.in(Easing.quad) }),
      withTiming(path[2].y, { duration: SEGS[1], easing: Easing.in(Easing.quad) }),
      withTiming(path[3].y, { duration: SEGS[2], easing: Easing.in(Easing.quad) }),
      withTiming(path[4].y, { duration: SEGS[3], easing: Easing.in(Easing.quad) }),
    );

    const pegTimes = [SEGS[0], SEGS[0] + SEGS[1], SEGS[0] + SEGS[1] + SEGS[2]];
    pegTimes.forEach(t => {
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        puckScale.value = withSequence(
          withSpring(1.5, { damping: 4, stiffness: 600 }),
          withSpring(1,   { damping: 12, stiffness: 400 }),
        );
      }, t);
    });

    const total = SEGS.reduce((a, b) => a + b, 0);
    setTimeout(() => {
      setPhase('done');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      puckScale.value = withSequence(
        withSpring(1.6, { damping: 3, stiffness: 500 }),
        withSpring(1,   { damping: 15, stiffness: 300 }),
      );
    }, total + 40);
  }, [familyMembers]);

  const handleConfirm = useCallback(() => {
    if (winnerIndex === null) return;
    const member = familyMembers[winnerIndex];
    onAssign(chore.id, member, member.name === currentUser);
    onClose();
  }, [winnerIndex, familyMembers, chore.id, currentUser, onAssign, onClose]);

  const handleReroll = () => {
    puckX.value = 150; puckY.value = 30; puckScale.value = 1;
    setPhase('idle'); setWinnerIndex(null);
  };

  const winner = winnerIndex !== null ? familyMembers[winnerIndex] : null;

  return (
    <Modal visible animationType="none" transparent statusBarTranslucent>
      <View style={{ flex: 1 }} pointerEvents="box-none">
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)' }}
          onPress={() => { if (phase !== 'dropping') onClose(); }}
        />
        <Animated.View style={[panelStyle, {
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32,
          paddingBottom: 40, paddingHorizontal: 20, paddingTop: 12,
        }]}>
          {/* Drag handle */}
          <View style={{ width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 16 }} />
          {/* Header */}
          <Text style={{ fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 20, color: '#0F172A' }}>
            {'🎲 Who gets \'' + chore.title + '\'?'}
          </Text>

          {/* Board */}
          <View style={{ width: 300, height: 420, alignSelf: 'center', position: 'relative', backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' }}>
            {/* Pegs */}
            {PLINKO_PEGS.map((peg, i) => (
              <Text key={i} style={{ position: 'absolute', left: peg.x - 10, top: peg.y - 10, fontSize: 14 }}>⚪</Text>
            ))}
            {/* Bins */}
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row' }}>
              {familyMembers.map((m, i) => (
                <View key={m.name} style={{
                  flex: 1, alignItems: 'center', paddingVertical: 10,
                  backgroundColor: winnerIndex === i ? '#EDE9FE' : '#F1F5F9',
                  borderTopWidth: 1, borderColor: winnerIndex === i ? '#8B5CF6' : '#E2E8F0',
                }}>
                  <Text style={{ fontSize: 22 }}>{m.avatar}</Text>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: winnerIndex === i ? COLORS.primary : '#64748B', marginTop: 2 }}>{m.name}</Text>
                </View>
              ))}
            </View>
            {/* Puck */}
            <Animated.View style={puckAnimStyle}>
              <Text style={{ fontSize: 32 }}>🎲</Text>
            </Animated.View>
          </View>

          {/* Controls */}
          <View style={{ marginTop: 20, gap: 10 }}>
            {phase === 'idle' && (
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleDrop(); }}
                style={{ backgroundColor: COLORS.primary, borderRadius: 20, paddingVertical: 18, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 16, fontWeight: '900', color: 'white' }}>Drop! 🎲</Text>
              </TouchableOpacity>
            )}
            {phase === 'dropping' && (
              <View style={{ backgroundColor: '#F1F5F9', borderRadius: 20, paddingVertical: 18, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#94A3B8' }}>Dropping...</Text>
              </View>
            )}
            {phase === 'done' && winner && (
              <>
                <View style={{ backgroundColor: '#EDE9FE', borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#DDD6FE' }}>
                  <Text style={{ fontSize: 24 }}>{winner.avatar}</Text>
                  <Text style={{ fontSize: 15, fontWeight: '900', color: COLORS.primary, marginTop: 4 }}>{winner.name} gets it!</Text>
                </View>
                <TouchableOpacity
                  onPress={handleConfirm}
                  style={{ backgroundColor: COLORS.primary, borderRadius: 20, paddingVertical: 18, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '900', color: 'white' }}>Assign to {winner.name} ✓</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleReroll} style={{ alignItems: 'center', paddingVertical: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B' }}>Try again</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// --- CHORE CARD ---
const ChoreCard = React.memo(({
  chore, isExpanded, onToggleExpand, onComplete, onDelete, onNudge, onDefer,
  drag, isActive, onAddToToday, canAddToday, onGoToTodayInstance,
  isHighlighted, sectionColor, onOpenEdit, onCompleteOnBehalf, onAssignToMe, onAssignTo, onPhotoUpload, currentUser, onPlinko,
}: {
  chore: Chore; isExpanded: boolean; onToggleExpand: () => void;
  onComplete: (id: string) => void; onDelete: (id: string) => void;
  onNudge?: (id: string) => void; onDefer?: (id: string) => void;
  drag?: () => void; isActive?: boolean;
  onAddToToday?: (id: string) => void; canAddToday?: boolean;
  onGoToTodayInstance?: () => void; isHighlighted?: boolean;
  sectionColor?: string;
  onOpenEdit?: (chore: Chore) => void;
  onCompleteOnBehalf?: (id: string) => void;
  onAssignToMe?: (id: string) => void;
  onAssignTo?: (id: string, member: typeof FAMILY_MEMBERS[0], isMe: boolean) => void;
  onPhotoUpload?: (id: string, slot: 'before' | 'after', uri: string | null) => void;
  currentUser?: string;
  onPlinko?: (chore: Chore) => void;
}) => {
  const [completionStep, setCompletionState] = useState<'idle' | 'confirming'>('idle');
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // auto-reset confirmation after 3s
  useEffect(() => {
    if (completionStep === 'confirming') {
      confirmTimerRef.current = setTimeout(() => setCompletionState('idle'), 3000);
    }
    return () => { if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current); };
  }, [completionStep]);

  const glowProgress = useSharedValue(0);
  useEffect(() => {
    if (isHighlighted) {
      glowProgress.value = withSequence(
        withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }),
        withDelay(1800, withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) }))
      );
    } else {
      glowProgress.value = withTiming(0, { duration: 300 });
    }
  }, [isHighlighted]);

  // Completion animations
  const circleScale = useSharedValue(1);
  const cardFlash = useSharedValue(0);
  const circleAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));
  const cardFlashStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(cardFlash.value, [0, 1], ['#FFFFFF', '#F0FDF4']),
  }));

  const animatedRowStyle = useAnimatedStyle(() => ({
    zIndex: isActive ? 1000 : 1,
  }));

  const glowShadowStyle = useAnimatedStyle(() => ({}));

  const glowContentStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(glowProgress.value, [0, 1], ['#F1F5F9', '#818CF8']),
  }));

  // Bug #1 fixed: timeColor now applied to Clock icon and time text
  const timeColor = chore.estMinutes > 30 ? COLORS.orange : chore.estMinutes > 15 ? COLORS.blue : COLORS.green;

  const isOthersChore = chore.pool !== 'Me';
  const photosMissing = chore.photoRequired && (
    !chore.photoProvided.after ||
    (chore.photoMode !== 'after' && !chore.photoProvided.before)
  );

  const handleCirclePress = () => {
    if (chore.isOverdue) return;
    if (chore.status === 'completed') return;

    // Others' chore: prompt action choice
    if (isOthersChore && completionStep === 'idle') {
      Alert.alert(
        `Complete "${chore.title}"?`,
        `This is assigned to ${chore.assignee}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Assign to Me', onPress: () => { onAssignToMe?.(chore.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } },
          { text: `Complete on Behalf`, onPress: () => {
            if (photosMissing) { setCompletionState('confirming'); return; }
            circleScale.value = withSequence(withSpring(1.4, { damping: 5, stiffness: 500 }), withSpring(1, { damping: 10, stiffness: 300 }));
            cardFlash.value = withSequence(withTiming(1, { duration: 120, easing: Easing.out(Easing.ease) }), withTiming(0, { duration: 500, easing: Easing.inOut(Easing.ease) }));
            onCompleteOnBehalf?.(chore.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }},
        ]
      );
      return;
    }

    // Photo check before confirming
    if (completionStep === 'idle') {
      if (photosMissing) {
        setCompletionState('confirming'); // show photo warning in confirming state
        circleScale.value = withSequence(withSpring(1.2, { damping: 6, stiffness: 400 }), withSpring(1, { damping: 12, stiffness: 300 }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }
      setCompletionState('confirming');
      circleScale.value = withSequence(withSpring(1.25, { damping: 6, stiffness: 400 }), withSpring(1, { damping: 12, stiffness: 300 }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }

    // Second tap — block if photos still missing, and auto-expand to show photo section
    if (photosMissing) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (!isExpanded) onToggleExpand();
      return;
    }

    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    // Completion burst then card flash
    circleScale.value = withSequence(
      withSpring(1.4, { damping: 5, stiffness: 500 }),
      withSpring(1, { damping: 10, stiffness: 300 })
    );
    cardFlash.value = withSequence(
      withTiming(1, { duration: 120, easing: Easing.out(Easing.ease) }),
      withTiming(0, { duration: 500, easing: Easing.inOut(Easing.ease) })
    );
    onComplete(chore.id);
    setCompletionState('idle');
  };

  const handlePhotoPress = useCallback(async (slot: 'before' | 'after') => {
    const existing = slot === 'before' ? chore.photoProvided.beforeUri : chore.photoProvided.afterUri;

    // If photo already exists, offer replace or delete
    if (existing) {
      Alert.alert('Photo', 'What would you like to do?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', onPress: () => pickPhoto(slot) },
        { text: 'Remove', style: 'destructive', onPress: () => { onPhotoUpload?.(chore.id, slot, null); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } },
      ]);
      return;
    }
    pickPhoto(slot);
  }, [chore]);

  const pickPhoto = useCallback(async (slot: 'before' | 'after') => {
    Alert.alert('Add Photo', 'Choose a source', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: '📷  Camera',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Required', 'Camera access is needed to take photos. Please enable it in Settings.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.85,
          });
          if (!result.canceled && result.assets[0]) {
            onPhotoUpload?.(chore.id, slot, result.assets[0].uri);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        },
      },
      {
        text: '🖼️  Photo Library',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Required', 'Photo library access is needed. Please enable it in Settings.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.85,
          });
          if (!result.canceled && result.assets[0]) {
            onPhotoUpload?.(chore.id, slot, result.assets[0].uri);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        },
      },
    ]);
  }, [chore.id, onPhotoUpload]);

  const swipeableRef = useRef<Swipeable>(null);

  const renderLeftActions = (progress: any, dragX: any) => {
    const trans = dragX.interpolate({
      inputRange: [0, 50, 100],
      outputRange: [-20, 0, 0],
    });
    return (
      <View style={{ width: 80, paddingRight: 8, marginBottom: 16 }}>
        <TouchableOpacity
          onPress={() => { onDefer?.(chore.id); swipeableRef.current?.close(); }}
          activeOpacity={0.8}
          style={{ flex: 1, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', borderRadius: 16 }}
        >
          <RNAnimated.View style={{ transform: [{ translateX: trans }], alignItems: 'center' }}>
            <Clock size={20} color="white" />
            <Text className="text-white font-black text-[8px] mt-1 uppercase">Defer</Text>
          </RNAnimated.View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderRightActions = (progress: any, dragX: any) => {
    const trans = dragX.interpolate({
      inputRange: [-100, -50, 0],
      outputRange: [0, 0, 20],
    });
    return (
      <View style={{ width: 80, paddingLeft: 8, marginBottom: 16 }}>
        <TouchableOpacity
          onPress={() => { onDelete(chore.id); swipeableRef.current?.close(); }}
          activeOpacity={0.8}
          style={{ flex: 1, backgroundColor: COLORS.red, justifyContent: 'center', alignItems: 'center', borderRadius: 16 }}
        >
          <RNAnimated.View style={{ transform: [{ translateX: trans }], alignItems: 'center' }}>
            <Trash2 size={20} color="white" />
            <Text className="text-white font-black text-[8px] mt-1 uppercase">Delete</Text>
          </RNAnimated.View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View collapsable={false} style={{ zIndex: isHighlighted ? 10 : 1, elevation: isHighlighted ? 10 : undefined, marginBottom: 16 }}>
      <Swipeable
        ref={swipeableRef}
        enabled={!isActive}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        friction={2}
        leftThreshold={80}
        rightThreshold={80}
        onSwipeableOpen={(direction) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }}
        containerStyle={{ marginBottom: 0, marginHorizontal: 24 }}
      >
        <View style={{ backgroundColor: 'white', borderRadius: GOLDEN_RADIUS }}>
          <Animated.View
            style={[
              animatedRowStyle,
              glowContentStyle,
              cardFlashStyle,
              GOLDEN_SHADOW,
              {
                borderRadius: GOLDEN_RADIUS,
                opacity: isActive ? 0.9 : 1,
                overflow: 'hidden',
                borderWidth: 2,
                zIndex: isHighlighted ? 10 : 1,
                elevation: isHighlighted ? 10 : undefined,
              }
            ]}
          >
          {/* Section theme color left-border accent */}
          {sectionColor && (
            <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: sectionColor }} />
          )}
          {/* Previously overdue amber top strip */}
          {chore.wasOverdue && !chore.isOverdue && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 4 }}>
              <AlertTriangle size={10} color="#D97706" />
              <Text style={{ fontSize: 9, fontWeight: '900', color: '#D97706', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {chore.isRecurring ? 'Was overdue — recurring' : 'Added from overdue'}
              </Text>
            </View>
          )}
          <TouchableOpacity
            activeOpacity={1}
            onPress={onToggleExpand}
            onLongPress={drag}
            delayLongPress={350}
            style={{ paddingHorizontal: 16, paddingTop: chore.wasOverdue && !chore.isOverdue ? 6 : 16, paddingBottom: 16 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* Left: checkbox + title/meta */}
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                {!chore.isOverdue && (
                  <Animated.View style={[circleAnimStyle, { marginRight: 14, alignItems: 'center', width: 44 }]}>
                    <TouchableOpacity onPress={handleCirclePress} style={{ alignItems: 'center', width: 44 }}>
                      {chore.status === 'completed' ? (
                        <View style={{ alignItems: 'center', gap: 3 }}>
                          <CheckCircle2 size={28} color={COLORS.green} />
                          <Text style={{ fontSize: 8, fontWeight: '900', color: 'transparent', textTransform: 'uppercase' }}>·</Text>
                        </View>
                      ) : completionStep === 'confirming' ? (
                        <View style={{ alignItems: 'center', gap: 3 }}>
                          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: photosMissing ? '#FFF7ED' : '#EEF2FF', borderWidth: 2, borderColor: photosMissing ? '#F97316' : COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
                            {photosMissing ? <Camera size={14} color="#F97316" /> : <CheckCircle size={16} color={COLORS.primary} />}
                          </View>
                          <Text style={{ fontSize: 8, fontWeight: '900', color: photosMissing ? '#F97316' : COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center' }}>
                            {photosMissing ? 'Photo!' : 'Confirm?'}
                          </Text>
                        </View>
                      ) : (
                        <View style={{ alignItems: 'center', gap: 3 }}>
                          <Circle size={28} color={COLORS.subtext} />
                          <Text style={{ fontSize: 8, fontWeight: '900', color: 'transparent', textTransform: 'uppercase' }}>·</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: '900', letterSpacing: -0.3, color: chore.status === 'completed' ? '#CBD5E1' : '#0F172A', textDecorationLine: chore.status === 'completed' ? 'line-through' : 'none' }} numberOfLines={1}>{chore.title}</Text>
                  {/* Meta row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 4, flexWrap: 'wrap' }}>
                    {/* Time estimate */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Clock size={11} color={timeColor} />
                      <Text style={{ fontSize: 11, fontWeight: '900', color: timeColor, textTransform: 'uppercase' }}>{chore.estMinutes}m</Text>
                    </View>
                    <Text style={{ color: '#CBD5E1', fontSize: 11 }}>·</Text>
                    {/* Points */}
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8' }}>{chore.points} pts</Text>
                    <Text style={{ color: '#CBD5E1', fontSize: 11 }}>·</Text>
                    {/* Assignee pill — unassigned / me / others */}
                    {!chore.assignee ? (
                      <TouchableOpacity
                        onPress={() => {
                          const me = FAMILY_MEMBERS.find(m => m.name === currentUser) ?? FAMILY_MEMBERS[0];
                          Alert.alert('Assign To', 'Who should take this chore?', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: `${me.avatar} Me (${me.name})`, onPress: () => onAssignTo?.(chore.id, me, true) },
                            ...FAMILY_MEMBERS.filter(m => m.name !== me.name).map(m => ({
                              text: `${m.avatar} ${m.name}`,
                              onPress: () => onAssignTo?.(chore.id, m, false),
                            })),
                          ]);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#FDE68A' }}
                      >
                        <Users size={9} color="#D97706" />
                        <Text style={{ fontSize: 9, fontWeight: '900', color: '#D97706', textTransform: 'uppercase', letterSpacing: 0.5 }}>Assign</Text>
                      </TouchableOpacity>
                    ) : chore.pool === 'Me' ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#EEF2FF', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <UserCheck size={9} color={COLORS.primary} />
                        <Text style={{ fontSize: 9, fontWeight: '900', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Me</Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F8FAFC', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#E2E8F0' }}>
                        <Users size={9} color="#64748B" />
                        <Text style={{ fontSize: 9, fontWeight: '900', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>{chore.assignee}</Text>
                      </View>
                    )}
                    {/* Recurring badge */}
                    {chore.isRecurring && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F0FDF4', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#BBF7D0' }}>
                        <Repeat2 size={9} color={COLORS.green} />
                        <Text style={{ fontSize: 9, fontWeight: '900', color: COLORS.green, textTransform: 'uppercase', letterSpacing: 0.5 }}>Recurring</Text>
                      </View>
                    )}
                    {/* Photo required badge */}
                    {chore.photoRequired && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FFF7ED', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#FED7AA' }}>
                        <Camera size={9} color="#EA580C" />
                        <Text style={{ fontSize: 9, fontWeight: '900', color: '#EA580C', textTransform: 'uppercase', letterSpacing: 0.5 }}>Photo</Text>
                      </View>
                    )}
                    {/* Nudged badge */}
                    {chore.isNudged && <BellRing size={12} color={COLORS.orange} />}
                  </View>
                </View>
              </View>
              {/* Right: avatar + chevron */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12, gap: 8 }}>
                <Text style={{ fontSize: 24 }}>{chore.avatar}</Text>
                <ChevronDown size={16} color="#CBD5E1" style={isExpanded ? { transform: [{ rotate: '180deg' }] } : {}} />
              </View>
            </View>

              {/* Overdue expanded panel */}
              {chore.isOverdue && isExpanded && (
                <View>
                  <Animated.View entering={FadeInDown} exiting={FadeOut} className="mt-4 pt-4 border-t border-slate-50 dark:border-zinc-800">
                    <View className="bg-slate-50 dark:bg-zinc-900/50 p-5 rounded-[24px] border border-slate-100 dark:border-zinc-800">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1 mr-4">
                          <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{chore.isRecurring ? 'Recurring Misstep' : 'Overdue Task'}</Text>
                          <Text className="text-slate-900 dark:text-white font-black text-sm leading-tight">
                            {chore.isRecurring
                              ? (chore.nextRecurringDate === getTodayStr() ? `Missed ${chore.missedStreak}x • Recurring Today` : `Missed ${chore.missedStreak}x • Next: ${getDDay(chore.nextRecurringDate!)}`)
                              : `Missed ${chore.overdueDays} days ago`}
                          </Text>
                        </View>
                        <View className="gap-2 items-end">
                          {chore.isRecurring && (
                            <TouchableOpacity onPress={onGoToTodayInstance} className="bg-indigo-600 px-5 py-2.5 rounded-xl min-w-[100px] items-center">
                              <Text className="text-white font-black text-xs uppercase">Go to</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity onPress={() => onAddToToday?.(chore.id)} disabled={!canAddToday} className={`px-5 py-2.5 rounded-xl min-w-[100px] items-center ${canAddToday ? 'bg-indigo-50 border border-indigo-100' : 'bg-slate-200'}`}>
                            <Text className={`text-xs font-black uppercase ${canAddToday ? 'text-indigo-600' : 'text-slate-400'}`}>Add Today</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </Animated.View>
                </View>
              )}

              {/* Non-overdue expanded panel */}
              {!chore.isOverdue && isExpanded && (
                <View>
                  <Animated.View entering={FadeInDown} exiting={FadeOut} style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 10 }}>

                    {/* Photo required section */}
                    {chore.photoRequired && (
                      <View style={{ gap: 8 }}>
                        {photosMissing && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF7ED', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#FED7AA' }}>
                            <AlertTriangle size={13} color="#EA580C" />
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#EA580C', flex: 1 }}>Upload required photos before marking complete</Text>
                          </View>
                        )}
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          {chore.photoMode !== 'after' && (
                            <PhotoSlotButton
                              slot="before"
                              uri={chore.photoProvided.beforeUri}
                              provided={chore.photoProvided.before}
                              onPress={() => handlePhotoPress('before')}
                            />
                          )}
                          <PhotoSlotButton
                            slot="after"
                            uri={chore.photoProvided.afterUri}
                            provided={chore.photoProvided.after}
                            onPress={() => handlePhotoPress('after')}
                          />
                        </View>
                      </View>
                    )}

                    {/* Action row: Edit + Nudge + Plinko */}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {/* Edit button */}
                      <TouchableOpacity
                        onPress={() => { onOpenEdit?.(chore); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingVertical: 11, gap: 6 }}
                      >
                        <MoreHorizontal size={14} color="#64748B" />
                        <Text style={{ fontSize: 12, fontWeight: '900', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>Edit</Text>
                      </TouchableOpacity>
                      {/* Nudge — only for others' chores */}
                      {chore.assignee && isOthersChore && onNudge && (
                        <TouchableOpacity
                          onPress={() => { onNudge(chore.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 16, paddingVertical: 11, gap: 6 }}
                        >
                          <BellRing size={14} color="#F59E0B" />
                          <Text style={{ fontSize: 12, fontWeight: '900', color: '#D97706', textTransform: 'uppercase', letterSpacing: 0.5 }}>Nudge</Text>
                        </TouchableOpacity>
                      )}
                      {/* Plinko — only for unassigned chores */}
                      {!chore.assignee && onPlinko && (
                        <TouchableOpacity
                          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPlinko(chore); }}
                          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#DDD6FE', borderRadius: 16, paddingVertical: 11, gap: 6 }}
                        >
                          <Text style={{ fontSize: 14 }}>🎲</Text>
                          <Text style={{ fontSize: 12, fontWeight: '900', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Random</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                  </Animated.View>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Swipeable>
    </View>
  );
});

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
  count: number;       // how many times this title appears in history
  completedCount: number;
  lastUsed: string;
};

const buildSuggestions = (chores: Chore[]): ChoreSuggestion[] => {
  // Group all chores by normalized title
  const groups: Record<string, Chore[]> = {};
  chores.forEach(c => {
    const key = c.title.trim().toLowerCase();
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  });

  return Object.values(groups)
    .map(group => {
      // Most frequent assignee
      const assigneeCounts: Record<string, number> = {};
      group.forEach(c => { if (c.assignee) assigneeCounts[c.assignee] = (assigneeCounts[c.assignee] ?? 0) + 1; });
      const topAssigneeName = Object.keys(assigneeCounts).sort((a, b) => assigneeCounts[b] - assigneeCounts[a])[0] ?? null;
      const topAssignee = topAssigneeName ? group.find(c => c.assignee === topAssigneeName) : null;

      // Mode points and time
      const pointsCounts: Record<number, number> = {};
      const timeCounts: Record<number, number> = {};
      group.forEach(c => {
        pointsCounts[c.points] = (pointsCounts[c.points] ?? 0) + 1;
        timeCounts[c.estMinutes] = (timeCounts[c.estMinutes] ?? 0) + 1;
      });
      const points = parseInt(Object.keys(pointsCounts).sort((a, b) => pointsCounts[+b] - pointsCounts[+a])[0] ?? '25');
      const estMinutes = parseInt(Object.keys(timeCounts).sort((a, b) => timeCounts[+b] - timeCounts[+a])[0] ?? '15');

      // Most recent chore in group
      const sorted = [...group].sort((a, b) => (b.dueDate > a.dueDate ? 1 : -1));
      const latest = sorted[0];

      return {
        title: latest.title,
        assigneeName: topAssigneeName,
        avatar: topAssignee?.avatar ?? '👤',
        pool: topAssignee?.pool ?? 'Parents',
        points,
        estMinutes,
        photoRequired: group.filter(c => c.photoRequired).length > group.length / 2,
        photoMode: group.find(c => c.photoMode)?.photoMode,
        isRecurring: group.filter(c => c.isRecurring).length > group.length / 2,
        recurrenceRule: group.find(c => c.recurrenceRule)?.recurrenceRule,
        count: group.length,
        completedCount: group.filter(c => c.status === 'completed').length,
        lastUsed: latest.dueDate,
      } as ChoreSuggestion;
    })
    .sort((a, b) => {
      // Primary: frequency, secondary: recency
      if (b.count !== a.count) return b.count - a.count;
      return b.lastUsed > a.lastUsed ? 1 : -1;
    })
    .slice(0, 10);
};

// --- QUICK ADD CHORE PANEL (#21) ---
// --- RECURRING DATA STRUCTURES ---
const RECURRING_PRESETS = ['Every Day', 'Every Week', 'Every 2 Weeks', 'Every Month', 'Every Year', 'Custom'];
const RECURRING_FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Yearly'];
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEK_ORDINALS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Next to Last', 'Last'];

// --- QUICK ADD CHORE PANEL (#21) ---
const QuickAddChorePanel = ({
  onClose, onAdd, sections, selectedDate, history,
}: {
  onClose: () => void;
  onAdd: (chore: Omit<Chore, 'id'>) => void;
  sections: Section[];
  selectedDate: string;
  history: Chore[];
}) => {
  // 1. Basic Info
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState<typeof FAMILY_MEMBERS[0] | null>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  // 2. Time & Points
  const [estMinutes, setEstMinutes] = useState(15);
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [customH, setCustomH] = useState(0);
  const [customM, setCustomM] = useState(45);

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
  const [customDaysOfWeek, setCustomDaysOfWeek] = useState<string[]>([]);
  const [customMonthlyMode, setCustomMonthlyMode] = useState<'each' | 'on_the'>('each');
  const [customMonthlyDays, setCustomMonthlyDays] = useState<number[]>([]);
  const [customMonthlyOrdinal, setCustomMonthlyOrdinal] = useState('First');
  const [customMonthlyOrdinalDay, setCustomMonthlyOrdinalDay] = useState('Sun');
  const [customYearlyMonths, setCustomYearlyMonths] = useState<string[]>([]);
  const [customYearlyUsesOrdinal, setCustomYearlyUsesOrdinal] = useState(false);

  // UI State
  const [showWhoDropdown, setShowWhoDropdown] = useState(false);
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showRecurringDropdown, setShowRecurringDropdown] = useState(false);
  const translateY = useSharedValue(800);
  const shakeX = useSharedValue(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => { translateY.value = withSpring(0, { ...SPRING_CONFIG, damping: 30 }); }, []);

  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const titleStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));
  const daySections = sections.filter(s => s.date === selectedDate);

  const calculatedPoints = pointsMode === 'time'
    ? (isCustomTime ? (customH * 60 + customM) : estMinutes) * multiplier
    : parseInt(customPoints) || 0;

  // Suggestion engine
  const allSuggestions = useMemo(() => buildSuggestions(history), [history]);
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
    if (s.photoMode) setPhotoMode(s.photoMode);
    setIsRecurring(s.isRecurring && !!s.assigneeName);
    if (s.recurrenceRule) {
      const isPreset = ['Every Day','Every Week','Every 2 Weeks','Every Month','Every Year'].includes(s.recurrenceRule);
      setRecurringPreset(isPreset ? s.recurrenceRule : 'Custom');
    }
    setSuggestionApplied(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
  };

  const clearForm = () => {
    setTitle('');
    setAssignee(null);
    setEstMinutes(15);
    setIsCustomTime(false);
    setPointsMode('time');
    setMultiplier(1);
    setCustomPoints('50');
    setPhotoRequired(false);
    setPhotoMode('after');
    setIsRecurring(false);
    setRecurringPreset('Every Week');
    setSuggestionApplied(false);
    setError(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Drag-to-close gesture (Reanimated v3 / RNGH v2 API)
  const dragGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationY > 120 || event.velocityY > 800) {
        translateY.value = withTiming(900, { duration: 260, easing: Easing.in(Easing.ease) });
        runOnJS(onClose)();
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

    // Build recurrenceRule
    let recurrenceRule: string | undefined;
    if (isRecurring) {
      if (recurringPreset === 'Custom') {
        let rule = `FREQ=${customFreq};INTERVAL=${customInterval}`;
        if (customFreq === 'Weekly' && customDaysOfWeek.length > 0) rule += `;BYDAY=${customDaysOfWeek.join(',')}`;
        if (customFreq === 'Monthly') {
          if (customMonthlyMode === 'each' && customMonthlyDays.length > 0) rule += `;BYMONTHDAY=${customMonthlyDays.join(',')}`;
          else if (customMonthlyMode === 'on_the') rule += `;BYSETPOS=${ORDINALS[customMonthlyOrdinal] ?? 1};BYDAY=${customMonthlyOrdinalDay}`;
        }
        if (customFreq === 'Yearly' && customYearlyMonths.length > 0) rule += `;BYMONTH=${customYearlyMonths.join(',')}`;
        recurrenceRule = rule;
      } else {
        recurrenceRule = recurringPreset;
      }
    }

    onAdd({
      title: title.trim(),
      assignee: assignee?.name ?? null,
      avatar: assignee?.avatar ?? '?',
      pool: assignee?.pool ?? 'Parents',
      points: calculatedPoints,
      estMinutes: isCustomTime ? (customH * 60 + customM) : estMinutes,
      dueDate: selectedDate,
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
      nextRecurringDate: isRecurring && recurrenceRule ? computeNextDate(selectedDate, recurrenceRule) : undefined,
    });

    if (stayOpen) {
      setTitle('');
      setError(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      onClose();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const toggleArrayItem = (setter: any, item: any) => {
    setter((prev: any[]) => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
    Haptics.selectionAsync();
  };

  return (
    <View style={StyleSheet.absoluteFill} className="z-[100]">
      <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,23,42,0.6)' }]} />
      <Animated.View style={[panelStyle, { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '90%' }]}>
        <GestureDetector gesture={dragGesture}>
          <Animated.View style={{ alignItems: 'center', paddingTop: 14, paddingBottom: 10 }}>
            <View style={{ width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 2.5 }} />
          </Animated.View>
        </GestureDetector>

        <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}>
          <View className="flex-row items-center justify-between mb-6">
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#0F172A' }}>New Chore</Text>
            <TouchableOpacity onPress={onClose} className="bg-slate-100 p-2 rounded-full">
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

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
                    {/* Top row: avatar + frequency badge */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 18 }}>{s.avatar}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }} numberOfLines={1}>{s.assigneeName ?? 'Unassigned'}</Text>
                      </View>
                      <View style={{ backgroundColor: s.count >= 5 ? '#EEF2FF' : '#F1F5F9', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, fontWeight: '900', color: s.count >= 5 ? COLORS.primary : '#94A3B8' }}>×{s.count}</Text>
                      </View>
                    </View>

                    {/* Title */}
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', lineHeight: 18 }} numberOfLines={2}>{s.title}</Text>

                    {/* Meta chips */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
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
                    </View>

                    {/* Completion rate bar */}
                    {s.count > 1 && (
                      <View style={{ gap: 3 }}>
                        <View style={{ height: 3, backgroundColor: '#E2E8F0', borderRadius: 2, overflow: 'hidden' }}>
                          <View style={{ height: 3, width: `${Math.round((s.completedCount / s.count) * 100)}%` as any, backgroundColor: COLORS.green, borderRadius: 2 }} />
                        </View>
                        <Text style={{ fontSize: 8, fontWeight: '700', color: '#94A3B8' }}>
                          {Math.round((s.completedCount / s.count) * 100)}% completion rate
                        </Text>
                      </View>
                    )}
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
                autoFocus
                value={title}
                onChangeText={(v) => { setTitle(v); if (v.trim()) setError(false); if (!v.trim()) setSuggestionApplied(false); }}
                placeholder="e.g. Clean the kitchen counter"
                placeholderTextColor="#CBD5E1"
                style={{ backgroundColor: '#F8FAFC', paddingHorizontal: 20, paddingVertical: 16, borderRadius: 20, fontSize: 17, fontWeight: '700', color: '#0F172A', borderWidth: 1.5, borderColor: error ? COLORS.red : '#F1F5F9' }}
              />
            </Animated.View>
          </View>

          <View className="flex-row gap-4 mb-6 z-50">
            {/* 2. Who Dropdown */}
            <View className="flex-1 z-50">
              <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Assignee</Text>
              <TouchableOpacity
                onPress={() => { setShowWhoDropdown(!showWhoDropdown); setShowSectionDropdown(false); setShowRecurringDropdown(false); }}
                style={{ height: 60 }}
                className="bg-slate-50 border border-slate-100 px-4 rounded-2xl flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-3">
                  <Text style={{ fontSize: 20 }}>{assignee?.avatar ?? '👤'}</Text>
                  <Text className="font-bold text-slate-700">{assignee?.name ?? 'Select'}</Text>
                </View>
                <ChevronDown size={16} color="#94A3B8" />
              </TouchableOpacity>
              {showWhoDropdown && (
                <View style={{ position: 'absolute', top: 85, left: 0, right: 0, backgroundColor: 'white', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 10, zIndex: 1000 }}>
                  <ScrollView style={{ maxHeight: 200 }} bounces={false}>
                    {FAMILY_MEMBERS.map(m => (
                      <TouchableOpacity
                        key={m.name}
                        onPress={() => { setAssignee(m); setShowWhoDropdown(false); Haptics.selectionAsync(); }}
                        className={`p-4 flex-row items-center gap-3 border-b border-slate-50 ${assignee?.name === m.name ? 'bg-indigo-50' : ''}`}
                      >
                        <Text style={{ fontSize: 18 }}>{m.avatar}</Text>
                        <Text className={`font-bold ${assignee?.name === m.name ? 'text-indigo-600' : 'text-slate-600'}`}>{m.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* 3. Section Dropdown */}
            <View className="flex-1 z-40">
              <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Section</Text>
              <TouchableOpacity
                onPress={() => { setShowSectionDropdown(!showSectionDropdown); setShowWhoDropdown(false); setShowRecurringDropdown(false); }}
                style={{ height: 60 }}
                className="bg-slate-50 border border-slate-100 px-4 rounded-2xl flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-2">
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sectionId ? sections.find(s=>s.id===sectionId)?.themeColor : '#CBD5E1' }} />
                  <Text className="font-bold text-slate-700" numberOfLines={1}>{sectionId ? sections.find(s=>s.id===sectionId)?.title : 'None'}</Text>
                </View>
                <ChevronDown size={16} color="#94A3B8" />
              </TouchableOpacity>
              {showSectionDropdown && (
                <View style={{ position: 'absolute', top: 85, left: 0, right: 0, backgroundColor: 'white', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 10, zIndex: 1000 }}>
                  <ScrollView style={{ maxHeight: 200 }} bounces={false}>
                    <TouchableOpacity
                      onPress={() => { setSectionId(null); setShowSectionDropdown(false); Haptics.selectionAsync(); }}
                      className={`p-4 border-b border-slate-50 ${sectionId === null ? 'bg-indigo-50' : ''}`}
                    >
                      <Text className={`font-bold ${sectionId === null ? 'text-indigo-600' : 'text-slate-600'}`}>None</Text>
                    </TouchableOpacity>
                    {daySections.map(s => (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() => { setSectionId(s.id); setShowSectionDropdown(false); Haptics.selectionAsync(); }}
                        className={`p-4 flex-row items-center gap-3 border-b border-slate-50 ${sectionId === s.id ? 'bg-indigo-50' : ''}`}
                      >
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.themeColor }} />
                        <Text className={`font-bold ${sectionId === s.id ? 'text-indigo-600' : 'text-slate-600'}`}>{s.title}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
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
                <Text style={{ fontSize: 13, fontWeight: '900', color: isCustomTime ? 'white' : '#64748B' }}>Custom</Text>
              </TouchableOpacity>
            </View>

            {isCustomTime && showTimeDropdown && (
              <View className="mt-4 bg-slate-50 p-6 rounded-3xl border border-slate-100 flex-row items-center justify-center gap-8">
                <View className="items-center">
                  <Text className="text-[9px] font-black text-slate-400 uppercase mb-2">Hours</Text>
                  <View className="flex-row items-center gap-3">
                    <TouchableOpacity
                      onPress={() => { setCustomH(Math.max(0, customH - 1)); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      className="w-8 h-8 bg-white border border-slate-200 rounded-full items-center justify-center shadow-sm"
                    >
                      <ChevronDown size={14} color="#64748B" />
                    </TouchableOpacity>
                    <TextInput
                      keyboardType="numeric"
                      value={String(customH)}
                      onChangeText={v => setCustomH(Math.min(23, parseInt(v)||0))}
                      className="text-3xl font-black text-slate-900 w-10 text-center"
                    />
                    <TouchableOpacity
                      onPress={() => { setCustomH(Math.min(23, customH + 1)); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
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
                      onPress={() => { setCustomM(Math.max(0, customM - 5)); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      className="w-8 h-8 bg-white border border-slate-200 rounded-full items-center justify-center shadow-sm"
                    >
                      <ChevronDown size={14} color="#64748B" />
                    </TouchableOpacity>
                    <TextInput
                      keyboardType="numeric"
                      value={String(customM).padStart(2, '0')}
                      onChangeText={v => setCustomM(Math.min(59, parseInt(v)||0))}
                      className="text-3xl font-black text-slate-900 w-12 text-center"
                    />
                    <TouchableOpacity
                      onPress={() => { setCustomM(Math.min(55, customM + 5)); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
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
                    keyboardType="numeric"
                    value={customPoints}
                    onChangeText={setCustomPoints}
                    className="text-3xl font-black text-slate-900 flex-1"
                    placeholder="0"
                  />
                  <Text className="text-slate-400 font-black text-lg ml-4">POINTS</Text>
                </View>
              )}
            </View>
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
                  if (!isRecurring && !assignee) {
                    Alert.alert('Assignee Required', 'Please assign someone before enabling recurring. Recurring tasks must have an assignee.', [{ text: 'OK' }]);
                    return;
                  }
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
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                  <View className="flex-row gap-2">
                    {RECURRING_PRESETS.map(preset => (
                      <Pressable
                        key={preset}
                        onPress={() => requestAnimationFrame(() => { setRecurringPreset(preset); Haptics.selectionAsync(); })}
                        className={`px-5 py-2.5 rounded-full border ${recurringPreset === preset ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-50 border-slate-100'}`}
                      >
                        <Text className={`text-xs font-bold ${recurringPreset === preset ? 'text-white' : 'text-slate-500'}`}>{preset}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>

                {/* Custom iCalendar-style Builder */}
                {recurringPreset === 'Custom' && (
                  <View className="bg-slate-50 border border-slate-100 p-5 rounded-3xl gap-6">

                    {/* Frequency Selector */}
                    <View className="flex-row bg-slate-200 rounded-2xl p-1">
                      {RECURRING_FREQUENCIES.map(freq => (
                        <Pressable
                          key={freq}
                          onPress={() => requestAnimationFrame(() => { setCustomFreq(freq as any); Haptics.selectionAsync(); })}
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
                        <Pressable onPress={() => setCustomInterval(customInterval + 1)} className="w-8 h-8 bg-white rounded-full items-center justify-center border border-slate-200"><ChevronUp size={14} color="#64748B" /></Pressable>
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
                        <Text className="text-[9px] font-black text-slate-400 uppercase mb-3">On these days</Text>
                        <View className="flex-row justify-between">
                          {DAYS_OF_WEEK.map(day => {
                            const isActive = customDaysOfWeek.includes(day);
                            return (
                              <Pressable
                                key={day}
                                onPress={() => toggleArrayItem(setCustomDaysOfWeek, day)}
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
                          <View className="flex-row flex-wrap mt-2">
                            {Array.from({length: 31}, (_, i) => i + 1).map(day => {
                              const isActive = customMonthlyDays.includes(day);
                              return (
                                <View key={day} style={{ width: '14.28%', aspectRatio: 1, padding: 4 }}>
                                  <Pressable
                                    onPress={() => toggleArrayItem(setCustomMonthlyDays, day)}
                                    className={`w-full h-full rounded-full items-center justify-center border ${isActive ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-100'}`}
                                    style={isActive ? GOLDEN_SHADOW : {}}
                                  >
                                    <Text style={{ fontSize: 11, fontWeight: '900', color: isActive ? 'white' : '#475569' }}>{day}</Text>
                                  </Pressable>
                                </View>
                              );
                            })}
                          </View>
                        ) : (
                          <View className="flex-row gap-3">
                            <View className="flex-1 gap-2">
                              <Text className="text-[8px] font-black text-slate-400 uppercase text-center">Week</Text>
                              <ScrollView style={{ maxHeight: 120 }} nestedScrollEnabled>
                                {WEEK_ORDINALS.map(ord => (
                                  <Pressable key={ord} onPress={() => requestAnimationFrame(() => { setCustomMonthlyOrdinal(ord); Haptics.selectionAsync(); })} className={`p-2 rounded-lg mb-1 items-center ${customMonthlyOrdinal === ord ? 'bg-indigo-100' : 'bg-white'}`}>
                                    <Text className={`text-[10px] font-bold ${customMonthlyOrdinal === ord ? 'text-indigo-600' : 'text-slate-500'}`}>{ord}</Text>
                                  </Pressable>
                                ))}
                              </ScrollView>
                            </View>
                            <View className="flex-1 gap-2">
                              <Text className="text-[8px] font-black text-slate-400 uppercase text-center">Day</Text>
                              <ScrollView style={{ maxHeight: 120 }} nestedScrollEnabled>
                                {DAYS_OF_WEEK.map(day => (
                                  <Pressable key={day} onPress={() => requestAnimationFrame(() => { setCustomMonthlyOrdinalDay(day); Haptics.selectionAsync(); })} className={`p-2 rounded-lg mb-1 items-center ${customMonthlyOrdinalDay === day ? 'bg-indigo-100' : 'bg-white'}`}>
                                    <Text className={`text-[10px] font-bold ${customMonthlyOrdinalDay === day ? 'text-indigo-600' : 'text-slate-500'}`}>{day}</Text>
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
                        <Text className="text-[9px] font-black text-slate-400 uppercase mb-3 text-center">In these months</Text>
                        <View className="flex-row flex-wrap gap-2 justify-center mb-6">
                          {MONTHS.map(month => {
                            const isActive = customYearlyMonths.includes(month);
                            return (
                              <Pressable
                                key={month}
                                onPress={() => toggleArrayItem(setCustomYearlyMonths, month)}
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
                            onPress={() => { setCustomYearlyUsesOrdinal(!customYearlyUsesOrdinal); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                            className={`w-10 h-5 rounded-full px-1 justify-center ${customYearlyUsesOrdinal ? 'bg-indigo-600' : 'bg-slate-200'}`}
                          >
                            <View className={`w-3.5 h-3.5 rounded-full bg-white ${customYearlyUsesOrdinal ? 'self-end' : 'self-start'}`} />
                          </Pressable>
                        </View>

                        {customYearlyUsesOrdinal && (
                           <View className="flex-row gap-3">
                             <View className="flex-1 gap-2">
                               <ScrollView style={{ maxHeight: 100 }} nestedScrollEnabled>
                                 {WEEK_ORDINALS.map(ord => (
                                   <Pressable key={ord} onPress={() => requestAnimationFrame(() => { setCustomMonthlyOrdinal(ord); Haptics.selectionAsync(); })} className={`p-2 rounded-lg mb-1 items-center ${customMonthlyOrdinal === ord ? 'bg-indigo-100' : 'bg-white'}`}>
                                     <Text className={`text-[10px] font-bold ${customMonthlyOrdinal === ord ? 'text-indigo-600' : 'text-slate-500'}`}>{ord}</Text>
                                   </Pressable>
                                 ))}
                               </ScrollView>
                             </View>
                             <View className="flex-1 gap-2">
                               <ScrollView style={{ maxHeight: 100 }} nestedScrollEnabled>
                                 {DAYS_OF_WEEK.map(day => (
                                   <Pressable key={day} onPress={() => requestAnimationFrame(() => { setCustomMonthlyOrdinalDay(day); Haptics.selectionAsync(); })} className={`p-2 rounded-lg mb-1 items-center ${customMonthlyOrdinalDay === day ? 'bg-indigo-100' : 'bg-white'}`}>
                                     <Text className={`text-[10px] font-bold ${customMonthlyOrdinalDay === day ? 'text-indigo-600' : 'text-slate-500'}`}>{day}</Text>
                                   </Pressable>
                                 ))}
                               </ScrollView>
                             </View>
                           </View>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Submission Buttons */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => handlePerformAdd(true)}
              className="flex-1 bg-slate-100 py-5 rounded-[24px] items-center border border-slate-200"
            >
              <Text style={{ color: '#475569', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 }}>Add Another</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handlePerformAdd(false)}
              style={{ backgroundColor: COLORS.primary, shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}
              className="flex-[1.5] py-5 rounded-[24px] items-center"
            >
              <Text style={{ color: 'white', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 }}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

// ─── UNDO COUNTDOWN RING ──────────────────────────────────────────
const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);
const CHORE_RING_R    = 10;
const CHORE_RING_CIRC = 2 * Math.PI * CHORE_RING_R;

function ChoreUndoRing({ duration }: { duration: number }) {
  const progress = useSharedValue(1);
  useEffect(() => {
    progress.value = 1;
    progress.value = withTiming(0, { duration, easing: Easing.linear });
  }, []);
  const animProps = useAnimatedProps(() => ({
    strokeDashoffset: CHORE_RING_CIRC * (1 - progress.value),
  }));
  return (
    <Svg width={26} height={26} style={{ marginLeft: 10 }}>
      <SvgCircle cx={13} cy={13} r={CHORE_RING_R} stroke="rgba(255,255,255,0.2)" strokeWidth={2.5} fill="none" />
      <AnimatedSvgCircle
        cx={13} cy={13} r={CHORE_RING_R}
        stroke="#fff" strokeWidth={2.5} fill="none"
        strokeDasharray={CHORE_RING_CIRC}
        animatedProps={animProps}
        strokeLinecap="round"
        transform="rotate(-90 13 13)"
      />
    </Svg>
  );
}

// --- MAIN SCREEN ---
export default function ChoresView() {
  const { session, isDevBypass } = useAuthStore();
  const currentUser = isDevBypass ? 'Dad' : (session?.user?.email?.split('@')[0] || 'Me');

  const [scope, setScope] = useState('All');
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [chores, setChores] = useState<Chore[]>(MOCK_CHORES);
  const [sections, setSections] = useState<Section[]>(MOCK_SECTIONS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isCalExpanded, setIsCalExpanded] = useState(false);
  const [overdueExpanded, setOverdueExpanded] = useState(false);
  const [calDate, setCalDate] = useState(new Date());
  const [calMode, setCalMode] = useState<'Day' | 'Month' | 'Year'>('Day');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  // #21: speed dial FAB
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isAddingChore, setIsAddingChore] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [deferTarget, setDeferTarget] = useState<{ id: string; title: string } | null>(null);
  const [plinkoChore, setPlinkoChore] = useState<Chore | null>(null);
  const [activeSort, setActiveSort] = useState<ActiveSort>(null);
  const [filter, setFilter] = useState<FilterState>({ ...DEFAULT_FILTER });
  // Sync scope → filter.assignees
  useEffect(() => {
    if (scope === 'Me') {
      setFilter(prev => {
        if (prev.assignees.length === 1 && prev.assignees[0] === currentUser) return prev;
        return { ...prev, assignees: [currentUser] };
      });
    } else {
      setFilter(prev => {
        if (prev.assignees.length === 0) return prev;
        return { ...prev, assignees: [] };
      });
    }
  }, [scope, currentUser]);

  // Sync filter.assignees → scope
  useEffect(() => {
    if (filter.assignees.length === 1 && filter.assignees[0] === currentUser) {
      setScope(prev => prev === 'Me' ? prev : 'Me');
    } else {
      setScope(prev => prev === 'All' ? prev : 'All');
    }
  }, [filter.assignees, currentUser]);
  const [showSortFilter, setShowSortFilter] = useState(false);
  // #23: collapsible search
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // #22: show completed
  const [showCompleted, setShowCompleted] = useState(false);
  // #11: undo on completion, deletion, deferral
  const [undoItem, setUndoItem] = useState<{ choreId: string; title: string; action: 'complete' | 'delete' | 'defer'; originalChore?: Chore; spawnedId?: string } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hudRef = useRef<any>(null);
  const listRef = useRef<any>(null);

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

  // Overdue & streak tracking — runs on mount and whenever chores list updates
  useEffect(() => {
    const today = getTodayStr();
    setChores(prev => prev.map(c => {
      if (c.status !== 'pending') return c;
      const isOverdue = c.dueDate < today;
      if (!isOverdue && c.isOverdue) {
        // Was overdue, now not (shouldn't happen without manual change, but clean up)
        return { ...c, isOverdue: false, overdueDays: undefined };
      }
      if (isOverdue) {
        const overdueDays = Math.ceil((parseLocalDate(today).getTime() - parseLocalDate(c.dueDate).getTime()) / (1000 * 60 * 60 * 24));
        // Compute nextRecurringDate if missing for recurring chores
        const nextRecurringDate = c.isRecurring && c.recurrenceRule && !c.nextRecurringDate
          ? (computeNextDate(c.dueDate, c.recurrenceRule) ?? c.nextRecurringDate)
          : c.nextRecurringDate;
        return {
          ...c,
          isOverdue: true,
          overdueDays,
          missedStreak: c.isRecurring ? (c.missedStreak ?? 0) + (c.isOverdue ? 0 : 1) : c.missedStreak,
          nextRecurringDate,
        };
      }
      return c;
    }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Section handlers
  const handleRenameSection = useCallback((id: string, title: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, title: title.trim() || s.title } : s));
  }, []);

  const handleDeleteSection = useCallback((id: string) => {
    setSections(prev => prev.filter(s => s.id !== id));
    setChores(prev => prev.map(c => c.sectionId === id ? { ...c, sectionId: null } : c));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, []);

  const handleChangeSectionColor = useCallback((id: string, color: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, themeColor: color } : s));
  }, []);

  const handleMoveSectionUp = useCallback((id: string) => {
    setSections(prev => {
      const sorted = [...prev].sort((a, b) => a.priorityIndex - b.priorityIndex);
      const idx = sorted.findIndex(s => s.id === id);
      if (idx <= 0) return prev;
      [sorted[idx - 1], sorted[idx]] = [sorted[idx], sorted[idx - 1]];
      return sorted.map((s, i) => ({ ...s, priorityIndex: i }));
    });
  }, []);

  const handleMoveSectionDown = useCallback((id: string) => {
    setSections(prev => {
      const sorted = [...prev].sort((a, b) => a.priorityIndex - b.priorityIndex);
      const idx = sorted.findIndex(s => s.id === id);
      if (idx >= sorted.length - 1) return prev;
      [sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]];
      return sorted.map((s, i) => ({ ...s, priorityIndex: i }));
    });
  }, []);

  // #11: completion with undo
  const handleComplete = useCallback((id: string) => {
    const chore = chores.find(c => c.id === id);
    if (!chore) return;

    let spawnedId: string | undefined;
    setChores(prev => {
      const updated = prev.map(c => c.id === id ? {
        ...c,
        status: 'completed' as const,
        completedBy: currentUser,
        completedAt: new Date().toISOString(),
      } : c);

      // If recurring, spawn next instance
      if (chore.isRecurring && chore.recurrenceRule) {
        const nextDate = computeNextDate(chore.dueDate, chore.recurrenceRule);
        if (nextDate) {
          spawnedId = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const nextChore: Chore = {
            ...chore,
            id: spawnedId,
            dueDate: nextDate,
            nextRecurringDate: computeNextDate(nextDate, chore.recurrenceRule),
            status: 'pending',
            isOverdue: false,
            overdueDays: undefined,
            wasOverdue: false,
            photoProvided: { before: false, after: false },
            completedBy: null,
            completedAt: null,
            isNudged: false,
          };
          return [...updated, nextChore];
        }
      }
      return updated;
    });

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoItem({ choreId: id, title: chore.title, action: 'complete', spawnedId });
    undoTimerRef.current = setTimeout(() => setUndoItem(null), 3500);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [chores, currentUser]);

  const handleRevertComplete = useCallback((id: string) => {
    const chore = chores.find(c => c.id === id);
    if (!chore) return;

    // 1. Auth constraint: Only the completor can rollback
    if (chore.completedBy && chore.completedBy !== currentUser) {
      Alert.alert(
        "Action Restricted",
        `Only ${chore.completedBy} (the one who completed this task) can roll it back.`,
        [{ text: "OK" }]
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // 2. Safety confirmation & Warning
    Alert.alert(
      "Rollback Task?",
      `Are you sure you want to move "${chore.title}" back to the active list?\n\n⚠️ Warning: The ${chore.points} points earned will be returned (deducted).`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "destructive",
          onPress: () => {
            setChores(prev => prev.map(c => c.id === id ? {
              ...c,
              status: 'pending',
              completedBy: null,
              completedAt: null
            } : c));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      ]
    );
  }, [chores, currentUser]);

  const handleUndo = useCallback(() => {
    if (!undoItem) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    if (undoItem.action === 'complete') {
      setChores(prev => prev
        .filter(c => !undoItem.spawnedId || c.id !== undoItem.spawnedId)
        .map(c => c.id === undoItem.choreId ? { ...c, status: 'pending', completedBy: null, completedAt: null } : c));
    } else if (undoItem.action === 'delete' && undoItem.originalChore) {
      setChores(prev => [...prev, undoItem.originalChore!]);
    } else if (undoItem.action === 'defer' && undoItem.originalChore) {
      setChores(prev => prev.map(c => c.id === undoItem.choreId ? undoItem.originalChore! : c));
    }

    setUndoItem(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [undoItem]);

  // #15: nudge handler
  const handleNudge = useCallback((id: string) => {
    setChores(prev => prev.map(c => c.id === id ? { ...c, isNudged: true } : c));
  }, []);

  // #21: add chore
  const handleAddChore = useCallback((chore: Omit<Chore, 'id'>) => {
    setChores(prev => [...prev, { ...chore, id: `c_${Date.now()}` }]);
  }, []);

  const choresByDate = useMemo(() =>
    chores.reduce((acc, c) => { if (c.status !== 'completed') acc[c.dueDate] = true; return acc; }, {} as Record<string, boolean>),
    [chores]);

  const flatData = useMemo(() => {
    let result: ListItem[] = [];

    let dayChores = chores.filter(c =>
      c.dueDate === selectedDate &&
      c.status !== 'completed' &&
      (scope === 'All' || c.pool === scope)
    );

    // Search
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      dayChores = dayChores.filter(c => c.title.toLowerCase().includes(q) || (c.assignee?.toLowerCase().includes(q) ?? false));
    }

    // Filter
    dayChores = applyFilter(dayChores, filter);

    // Sort — custom sort flattens sections; default keeps section/priority order
    const daySections = sections.filter(s => s.date === selectedDate).sort((a, b) => a.priorityIndex - b.priorityIndex);

    const sortOrPriority = (chores: Chore[]) =>
      activeSort ? applySort(chores, activeSort) : chores.sort((a, b) => a.priorityIndex - b.priorityIndex);

    sortOrPriority(dayChores.filter(c => !c.sectionId)).forEach(c => result.push({ type: 'chore', data: c }));
    daySections.forEach(s => {
      const sectionChores = dayChores.filter(c => c.sectionId === s.id);
      if (sectionChores.length === 0) return;
      result.push({ type: 'section', data: s });
      if (!s.isCollapsed) {
        sortOrPriority(sectionChores).forEach(c => result.push({ type: 'chore', data: c }));
      }
    });

    return result;
  }, [chores, sections, selectedDate, scope, searchQuery, activeSort, filter]);

  // #GoTo: Handle deferred scrolling after state/date switch
  useEffect(() => {
    if (pendingScrollId && flatData.length > 0) {
      const targetIndex = flatData.findIndex(item => item.type === 'chore' && item.data.id === pendingScrollId);
      if (targetIndex !== -1) {
        setHighlightedId(pendingScrollId);

        // Use multiple attempts to scroll to ensure the list is ready
        let attempts = 0;
        const tryScroll = () => {
          if (listRef.current && attempts < 5) {
            try {
              listRef.current.scrollToIndex({
                index: targetIndex,
                animated: true,
                viewPosition: 0.5,
              });
            } catch (e) {
              // Ignore layout errors, retry
            }
            attempts++;
            if (attempts < 3) setTimeout(tryScroll, 100);
          }
        };

        setTimeout(() => {
          tryScroll();
          setPendingScrollId(null);
          setTimeout(() => setHighlightedId(null), 3000);
        }, 150);
      }
    }
  }, [flatData, pendingScrollId]);

  const handleToggleSection = useCallback((id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, isCollapsed: !s.isCollapsed } : s));
  }, []);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  const handleToggleOverdue = useCallback(() => {
    setOverdueExpanded(prev => !prev);
  }, []);

  const handleToggleCompleted = useCallback(() => {
    setShowCompleted(prev => !prev);
  }, []);

  const handleDeleteChore = useCallback((id: string) => {
    const chore = chores.find(c => c.id === id);
    if (!chore) return;
    setChores(prev => prev.filter(c => c.id !== id));
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoItem({ choreId: id, title: chore.title, action: 'delete', originalChore: chore });
    undoTimerRef.current = setTimeout(() => setUndoItem(null), 3500);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [chores]);

  const handleDeferChore = useCallback((id: string) => {
    const chore = chores.find(c => c.id === id);
    if (!chore) return;
    setDeferTarget({ id, title: chore.title });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [chores]);

  const handleDeferTo = useCallback((id: string, dateStr: string) => {
    const chore = chores.find(c => c.id === id);
    if (!chore) return;
    setChores(prev => prev.map(c =>
      c.id === id ? { ...c, dueDate: dateStr, isOverdue: false, priorityIndex: c.priorityIndex + 100 } : c
    ));
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoItem({ choreId: id, title: chore.title, action: 'defer', originalChore: chore });
    undoTimerRef.current = setTimeout(() => setUndoItem(null), 3500);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [chores]);

  const handleAddToToday = useCallback((id: string) => {
    setChores(prev => prev.map(c => c.id === id ? { ...c, dueDate: getTodayStr(), isOverdue: false, wasOverdue: true } : c));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleCompleteOnBehalf = useCallback((id: string) => {
    const chore = chores.find(c => c.id === id);
    if (!chore) return;
    let spawnedId: string | undefined;
    setChores(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, status: 'completed' as const, completedBy: currentUser, completedAt: new Date().toISOString() } : c);
      if (chore.isRecurring && chore.recurrenceRule) {
        const nextDate = computeNextDate(chore.dueDate, chore.recurrenceRule);
        if (nextDate) {
          spawnedId = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const nextChore: Chore = {
            ...chore,
            id: spawnedId,
            dueDate: nextDate,
            nextRecurringDate: computeNextDate(nextDate, chore.recurrenceRule),
            status: 'pending',
            isOverdue: false,
            overdueDays: undefined,
            wasOverdue: false,
            photoProvided: { before: false, after: false },
            completedBy: null,
            completedAt: null,
            isNudged: false,
          };
          return [...updated, nextChore];
        }
      }
      return updated;
    });
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoItem({ choreId: id, title: chore.title, action: 'complete', spawnedId });
    undoTimerRef.current = setTimeout(() => setUndoItem(null), 3500);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [chores, currentUser]);

  const handleAssignToMe = useCallback((id: string) => {
    const me = FAMILY_MEMBERS.find(m => m.name === currentUser) ?? FAMILY_MEMBERS[0];
    setChores(prev => prev.map(c => c.id === id ? { ...c, assignee: me.name, avatar: me.avatar, pool: 'Me' } : c));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [currentUser]);

  const handlePhotoUpload = useCallback((id: string, slot: 'before' | 'after', uri: string | null) => {
    setChores(prev => prev.map(c => {
      if (c.id !== id) return c;
      const provided = { ...c.photoProvided };
      if (slot === 'before') {
        provided.before = uri !== null;
        provided.beforeUri = uri ?? undefined;
      } else {
        provided.after = uri !== null;
        provided.afterUri = uri ?? undefined;
      }
      return { ...c, photoProvided: provided };
    }));
  }, []);

  const handleAssignTo = useCallback((id: string, member: typeof FAMILY_MEMBERS[0], isMe: boolean) => {
    setChores(prev => prev.map(c => c.id === id ? { ...c, assignee: member.name, avatar: member.avatar, pool: isMe ? 'Me' : member.pool } : c));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleEditChore = useCallback((chore: Chore, scope: 'this' | 'all', updates: Partial<Chore>) => {
    setChores(prev => prev.map(c => {
      const applyUpdate = (target: Chore): Chore => {
        const merged = { ...target, ...updates };
        // Recompute nextRecurringDate if recurrenceRule changed
        if (updates.recurrenceRule && merged.isRecurring) {
          merged.nextRecurringDate = computeNextDate(merged.dueDate, merged.recurrenceRule) ?? merged.nextRecurringDate;
        }
        return merged;
      };
      if (scope === 'all' && chore.isRecurring && c.title.toLowerCase() === chore.title.toLowerCase() && c.isRecurring) {
        return applyUpdate(c);
      }
      if (c.id === chore.id) return applyUpdate(c);
      return c;
    }));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleStartEditSection = useCallback((id: string) => {
    setEditingSectionId(id);
  }, []);

  const handleEndEditSection = useCallback(() => {
    setEditingSectionId(null);
  }, []);

  const handleGoToInstance = useCallback((title: string, targetDate: string) => {
    const isSameDate = targetDate === selectedDate;

    // Find the chore in the full list to get its ID and section
    const instance = chores.find(c => c.title.toLowerCase() === title.toLowerCase() && c.dueDate === targetDate);

    if (instance) {
      if (!isSameDate) {
        setSelectedDate(targetDate);
        setCalDate(parseLocalDate(targetDate));
        hudRef.current?.scrollToDate(targetDate);
      }

      if (instance.sectionId) {
        setSections(prev => prev.map(s => s.id === instance.sectionId ? { ...s, isCollapsed: false } : s));
      }

      // Allow state to settle before setting pending scroll
      setTimeout(() => {
        setPendingScrollId(instance.id);
      }, 150);
    }
  }, [chores, selectedDate]);

  // Precomputed lookup maps — avoid O(n) filter/find inside renderItem
  const sectionIndexMap = useMemo(() => {
    const daySections = sections.filter(s => s.date === selectedDate).sort((a, b) => a.priorityIndex - b.priorityIndex);
    const total = daySections.length;
    return Object.fromEntries(daySections.map((s, i) => [s.id, { idx: i, total }]));
  }, [sections, selectedDate]);

  const sectionChoreCountMap = useMemo(() => {
    // Apply the same filters as flatData but count all section chores regardless of collapsed state
    let dayChores = chores.filter(c =>
      c.dueDate === selectedDate &&
      c.status !== 'completed' &&
      (scope === 'All' || c.pool === scope)
    );
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      dayChores = dayChores.filter(c => c.title.toLowerCase().includes(q) || (c.assignee?.toLowerCase().includes(q) ?? false));
    }
    dayChores = applyFilter(dayChores, filter);

    const map: Record<string, number> = {};
    dayChores.forEach(c => {
      if (c.sectionId) map[c.sectionId] = (map[c.sectionId] || 0) + 1;
    });
    return map;
  }, [chores, selectedDate, scope, searchQuery, filter]);

  const sectionColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    sections.forEach(s => { map[s.id] = s.themeColor; });
    return map;
  }, [sections]);

  // Titles of chores that have an overdue sibling — used to flag recurring today-instances as wasOverdue
  const overdueTitles = useMemo(() => {
    const titles = new Set<string>();
    chores.forEach(c => { if (c.isOverdue && c.missedStreak && c.missedStreak > 0) titles.add(c.title.toLowerCase()); });
    return titles;
  }, [chores]);

  const renderHeader = useCallback(() => {
    const overdueList = chores.filter(c => c.status !== 'completed' && c.dueDate < getTodayStr() && c.isOverdue && (scope === 'All' || c.pool === scope));
    const dayChores = chores.filter(c => c.dueDate === selectedDate && (scope === 'All' || c.pool === scope));
    const dayTotalCount = dayChores.length;
    const dayDoneCount = dayChores.filter(c => c.status === 'completed').length;
    const dayTotalMinutes = dayChores.reduce((acc, c) => acc + c.estMinutes, 0);

    return (
      <View collapsable={false} className="pt-4">
        {overdueList.length > 0 && (
          <View>
            <TouchableOpacity
              onPress={handleToggleOverdue}
              activeOpacity={0.8}
              className="mx-6 bg-rose-600 p-5 rounded-[32px] mb-4 flex-row items-center justify-between shadow-lg"
            >
              <View className="flex-row items-center">
                <AlertTriangle size={20} color="#fff" />
                <Text className="ml-3 font-bold text-white text-base">Overdue ({overdueList.length})</Text>
              </View>
              {overdueExpanded ? <ChevronUp size={20} color="#fff" /> : <ChevronDown size={20} color="#fff" />}
            </TouchableOpacity>
            {overdueExpanded && overdueList.map((c, index) => (
              <View key={c.id}>
                <ChoreCard
                  chore={c}
                  isExpanded={expandedId === c.id}
                  onToggleExpand={() => handleToggleExpand(c.id)}
                  onComplete={handleComplete}
                  onDelete={handleDeleteChore}
                  onNudge={handleNudge}
                  onDefer={handleDeferChore}
                  onAddToToday={handleAddToToday}
                  canAddToday={true}
                  onGoToTodayInstance={() => handleGoToInstance(c.title, c.nextRecurringDate!)}
                  onOpenEdit={setEditingChore}
                  onCompleteOnBehalf={handleCompleteOnBehalf}
                  onAssignToMe={handleAssignToMe}
                  onAssignTo={handleAssignTo}
                  onPhotoUpload={handlePhotoUpload}
                  currentUser={currentUser}
                  onPlinko={(chore) => setPlinkoChore(chore)}
                />
              </View>
            ))}
          </View>
        )}

        {dayTotalCount > 0 && (
          <View className="px-6 pt-2 mb-4">
            <View className="flex-row items-center justify-between mb-1.5">
              <View className="flex-row items-center gap-2.5">
                <View className="bg-indigo-50/50 border border-indigo-100/50 px-2 py-0.5 rounded-lg flex-row items-center">
                  <Clock size={10} color={COLORS.primary} style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 10, fontWeight: '900', color: COLORS.primary }}>{dayTotalMinutes}m</Text>
                </View>
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>Progress</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '900', color: dayDoneCount === dayTotalCount ? COLORS.green : '#334155' }}>{dayDoneCount}/{dayTotalCount}</Text>
            </View>
            <View style={{ height: 6, backgroundColor: '#F1F5F9', borderRadius: 99 }}>
              <View style={{ height: 6, width: `${(dayDoneCount / dayTotalCount) * 100}%`, backgroundColor: dayDoneCount === dayTotalCount ? COLORS.green : COLORS.primary, borderRadius: 99 }} />
            </View>
          </View>
        )}
      </View>
    );
  }, [chores, overdueExpanded, handleToggleOverdue, expandedId, handleToggleExpand, handleComplete, handleDeleteChore, handleNudge, handleDeferChore, handleAddToToday, handleGoToInstance, selectedDate, scope]);

  const renderFooter = useCallback(() => {
    const dayChores = chores.filter(c =>
      c.dueDate === selectedDate &&
      c.status !== 'completed' &&
      (scope === 'All' || c.pool === scope)
    );
    const dayTotalCount = chores.filter(c => c.dueDate === selectedDate && (scope === 'All' || c.pool === scope)).length;
    const daySections = sections.filter(s => s.date === selectedDate);
    const dayCompleted = chores.filter(c => c.dueDate === selectedDate && c.status === 'completed' && (scope === 'All' || c.pool === scope));

    const isEmpty = dayTotalCount === 0 || (searchQuery.trim().length > 0 && dayChores.length === 0 && daySections.length === 0);

    return (
      <View collapsable={false} className="pb-[160px]">
        {isEmpty && (
          <View style={{ alignItems: 'center', paddingVertical: 64, paddingHorizontal: 32 }}>
            <Text style={{ fontSize: 52 }}>{searchQuery.trim().length > 0 ? '🔍' : '🎉'}</Text>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A', marginTop: 16, textAlign: 'center' }}>
              {searchQuery.trim().length > 0 ? `No results for "${searchQuery}"` : 'All clear!'}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#94A3B8', marginTop: 8, textAlign: 'center' }}>
              {searchQuery.trim().length > 0 ? 'Try a different search.' : selectedDate === getTodayStr() ? 'Nothing due today. Enjoy the break!' : 'Nothing scheduled for this day.'}
            </Text>
            {searchQuery.trim().length === 0 && (
              <TouchableOpacity onPress={() => { setIsFabOpen(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={{ marginTop: 24, backgroundColor: '#EEF2FF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Plus size={16} color={COLORS.primary} />
                <Text style={{ fontSize: 13, fontWeight: '900', color: COLORS.primary }}>Add a Chore</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {dayCompleted.length > 0 && (
          <View className="px-5 mt-2 mb-2">
            <TouchableOpacity onPress={handleToggleCompleted} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: '#F1F5F9' }} />
              <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 12 }}>
                {showCompleted ? 'Hide' : 'Show'} completed ({dayCompleted.length})
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#F1F5F9' }} />
            </TouchableOpacity>
            {showCompleted && dayCompleted.map(c => (
              <View key={c.id} style={{ marginBottom: 10 }}>
                <TouchableOpacity
                  onPress={() => handleRevertComplete(c.id)}
                  activeOpacity={0.7}
                  style={{ backgroundColor: '#F8FAFC', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#F1F5F9' }}
                >
                  <CheckCircle2 size={22} color={COLORS.green} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#94A3B8', textDecorationLine: 'line-through' }}>{c.title}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#CBD5E1', marginTop: 2 }}>{c.points} pts • {c.assignee}</Text>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <RotateCcw size={16} color="#94A3B8" />
                    <Text style={{ fontSize: 22 }}>{c.avatar}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }, [chores, sections, selectedDate, scope, searchQuery, handleToggleCompleted, showCompleted, handleToggleExpand, expandedId, handleRevertComplete]);

  const renderItem = useCallback(({ item, drag, isActive }: any) => {
    // 4. Section
    if (item.type === 'section') {
      const info = sectionIndexMap[item.data.id] ?? { idx: 0, total: 1 };
      return (
        <ScaleDecorator activeScale={1.01}>
          <SectionHeader
            section={item.data}
            onToggle={() => handleToggleSection(item.data.id)}
            onRename={handleRenameSection}
            onDelete={handleDeleteSection}
            onChangeColor={handleChangeSectionColor}
            onMoveUp={() => handleMoveSectionUp(item.data.id)}
            onMoveDown={() => handleMoveSectionDown(item.data.id)}
            canMoveUp={info.idx > 0}
            canMoveDown={info.idx < info.total - 1}
            drag={drag}
            isEditing={editingSectionId === item.data.id}
            onStartEdit={() => handleStartEditSection(item.data.id)}
            onEndEdit={handleEndEditSection}
            choreCount={sectionChoreCountMap[item.data.id] ?? 0}
          />
        </ScaleDecorator>
      );
    }

    // 5. Active Chore
    if (item.type === 'chore') {
      const sectionColor = item.data.sectionId ? sectionColorMap[item.data.sectionId] : undefined;
      const derivedWasOverdue = item.data.wasOverdue || (!item.data.isOverdue && item.data.isRecurring && overdueTitles.has(item.data.title.toLowerCase()));
      return (
        <ShadowDecorator radius={20} opacity={0.15} elevation={12}>
          <ScaleDecorator activeScale={1.03}>
            <ChoreCard
              chore={{ ...item.data, wasOverdue: derivedWasOverdue }}
              isActive={isActive}
              isExpanded={expandedId === item.data.id}
              onToggleExpand={() => handleToggleExpand(item.data.id)}
              onComplete={handleComplete}
              onDelete={handleDeleteChore}
              onNudge={handleNudge}
              onDefer={handleDeferChore}
              drag={searchQuery.trim().length === 0 ? drag : undefined}
              isHighlighted={highlightedId === item.data.id}
              sectionColor={sectionColor}
              onOpenEdit={setEditingChore}
              onCompleteOnBehalf={handleCompleteOnBehalf}
              onAssignToMe={handleAssignToMe}
              onAssignTo={handleAssignTo}
              currentUser={currentUser}
              onPlinko={(chore) => setPlinkoChore(chore)}
            />
          </ScaleDecorator>
        </ShadowDecorator>
      );
    }

    return null;
  }, [
    expandedId, handleComplete, handleDeleteChore, highlightedId,
    handleNudge, handleDeferChore, sectionIndexMap, handleToggleSection, handleRenameSection,
    handleDeleteSection, handleChangeSectionColor, handleMoveSectionUp, handleMoveSectionDown,
    editingSectionId, handleStartEditSection, handleEndEditSection, sectionChoreCountMap,
    sectionColorMap, searchQuery, handleToggleExpand, overdueTitles,
    handleCompleteOnBehalf, handleAssignToMe, handleAssignTo, handlePhotoUpload, currentUser, setEditingChore
  ]);
  const keyExtractor = useCallback((item: ListItem) => {
    switch (item.type) {
      case 'overdue-header': return 'overdue-header';
      case 'overdue-item': return `overdue-${item.data.id}`;
      case 'progress': return 'progress-bar';
      case 'section': return `sec-${item.data.id}`;
      case 'chore': return `chore-${item.data.id}`;
      case 'completed-header': return 'completed-header';
      case 'completed-item': return `comp-${item.data.id}`;
      case 'empty-state': return 'empty-state';
    }
  }, []);

  const handleDragEnd = useCallback(({ data }: { data: ListItem[] }) => {
    let currentSectionId: string | null = null;
    const choreUpdates: Record<string, { sectionId: string | null; priorityIndex: number }> = {};
    const sectionUpdates: Record<string, number> = {};
    let index = 0;

    data.forEach((item) => {
      if (item.type === 'section') {
        currentSectionId = item.data.id;
        sectionUpdates[item.data.id] = index++;
      } else if (item.type === 'chore') {
        choreUpdates[item.data.id] = { sectionId: currentSectionId, priorityIndex: index++ };
      }
    });

    // Batch updates manually to be sure
    unstable_batchedUpdates(() => {
      if (Object.keys(choreUpdates).length > 0) {
        setChores(prev => prev.map(c => choreUpdates[c.id] ? { ...c, ...choreUpdates[c.id] } : c));
      }
      if (Object.keys(sectionUpdates).length > 0) {
        setSections(prev => prev.map(s => sectionUpdates[s.id] !== undefined ? { ...s, priorityIndex: sectionUpdates[s.id] } : s));
      }
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-black" edges={['top']}>
        {/* #12: pt-8 → pt-2 (SafeAreaView already handles status bar inset) */}
        <View className="flex-row items-center justify-between px-4 bg-white dark:bg-zinc-950 z-20 pt-2 pb-3">
          <View style={{ width: 80 }} />
          <ScopeSegmentedControl scope={scope} setScope={setScope} />
          {/* #23: search icon + today button */}
          <View style={{ width: 80 }} className="items-end flex-row justify-end gap-2">
            <TouchableOpacity onPress={() => { setIsSearchOpen(!isSearchOpen); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={{ padding: 8, borderRadius: 99, backgroundColor: isSearchOpen ? '#EEF2FF' : '#F1F5F9' }}>
              <Search size={14} color={isSearchOpen ? COLORS.primary : '#64748B'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setSelectedDate(getTodayStr()); setCalDate(new Date()); hudRef.current?.scrollToDate(getTodayStr()); }} className="bg-indigo-50 p-2 rounded-full">
              <RotateCcw size={14} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* #23: animated search bar */}
        <Animated.View style={[searchBarAnimStyle, { backgroundColor: 'white', paddingHorizontal: 20 }]}>
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

        <CalendarHUD ref={hudRef} selectedDate={selectedDate} setSelectedDate={setSelectedDate} choresByDate={choresByDate} isExpanded={isCalExpanded} setIsExpanded={setIsCalExpanded} calDate={calDate} setCalDate={setCalDate} calMode={calMode} setCalMode={setCalMode} />

        {/* Sort / Filter bar */}
        {(() => {
          const activeCount = filterActiveCount(filter);
          const chips: { key: string; label: string }[] = [
            ...filter.assignees.map(a => ({ key: `a:${a}`, label: a })),
            ...(filter.recurring     ? [{ key: 'recurring',     label: 'Recurring' }] : []),
            ...(filter.photoRequired ? [{ key: 'photoRequired', label: 'Photo' }]     : []),
            ...(filter.nudged        ? [{ key: 'nudged',        label: 'Nudged' }]    : []),
          ];
          const removeChip = (key: string) => {
            if (key.startsWith('a:')) setFilter(prev => ({ ...prev, assignees: prev.assignees.filter(a => a !== key.slice(2)) }));
            else setFilter(prev => ({ ...prev, [key]: false }));
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          };

          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 6 }}>
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
                    {dir === 'asc'  && <ArrowUp   size={10} color={COLORS.primary} />}
                    {dir === 'desc' && <ArrowDown  size={10} color={COLORS.primary} />}
                    {!dir           && <ArrowUpDown size={10} color="#CBD5E1" />}
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

        <View style={{ flex: 1 }}>
          <DraggableFlatList
            ref={listRef}
            data={flatData}
            onDragEnd={handleDragEnd}
            activationDistance={20}
            dragItemOverflow={false}
            autoscrollThreshold={200}
            autoscrollSpeed={150}
            animationConfig={{ damping: 30, mass: 0.1, stiffness: 250, overshootClamping: false }}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderFooter}
            onScrollBeginDrag={() => { if (isCalExpanded) setIsCalExpanded(false); }}
            containerStyle={{ flex: 1 }}
          />
        </View>
      </SafeAreaView>

      {/* #11: undo snackbar */}
      {undoItem && (
        <View style={{ position: 'absolute', bottom: 172, left: 20, right: 20, zIndex: 100 }}>
          <Animated.View entering={FadeInDown} exiting={FadeOut} style={{ backgroundColor: '#1E293B', borderRadius: 18, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 }}>
            <Text style={{ color: '#E2E8F0', fontSize: 13, fontWeight: '700', flex: 1 }} numberOfLines={1}>
              "{undoItem.title}" {undoItem.action === 'complete' ? 'done!' : undoItem.action === 'delete' ? 'deleted!' : 'deferred!'}
            </Text>
            <TouchableOpacity onPress={handleUndo} style={{ paddingHorizontal: 14, paddingVertical: 6, backgroundColor: COLORS.primary, borderRadius: 10, marginLeft: 12 }}>
              <Text style={{ color: 'white', fontSize: 12, fontWeight: '900' }}>Undo</Text>
            </TouchableOpacity>
            <ChoreUndoRing key={undoItem.choreId + undoItem.action} duration={3500} />
          </Animated.View>
        </View>
      )}

      {/* #21: speed dial FAB */}
      {isFabOpen && <Pressable onPress={() => setIsFabOpen(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />}
      <View style={{ position: 'absolute', right: 24, bottom: 100, alignItems: 'flex-end' }}>
        {isFabOpen && (
          <>
            <View style={{ marginBottom: 12 }}>
              <Animated.View entering={FadeInDown.delay(40)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                <View style={{ backgroundColor: 'white', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginRight: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>Add Chore</Text>
                </View>
                <TouchableOpacity onPress={() => { setIsFabOpen(false); setIsAddingChore(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}>
                  <ListPlus size={22} color="white" />
                </TouchableOpacity>
              </Animated.View>
            </View>
            <View style={{ marginBottom: 14 }}>
              <Animated.View entering={FadeInDown} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                <View style={{ backgroundColor: 'white', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginRight: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>Add Section</Text>
                </View>
                <TouchableOpacity onPress={() => { setIsFabOpen(false); const id = `s_${Date.now()}`; setSections(prev => [...prev, { id, title: 'New Section', themeColor: COLORS.primary, isCollapsed: false, date: selectedDate, priorityIndex: prev.length }]); setEditingSectionId(id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center', shadowColor: '#8B5CF6', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}>
                  <FolderPlus size={22} color="white" />
                </TouchableOpacity>
              </Animated.View>
            </View>
          </>
        )}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setIsFabOpen(!isFabOpen); }}
          style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 6 }}
        >
          {isFabOpen ? <X size={26} color="white" strokeWidth={2.5} /> : <Plus size={30} color="white" strokeWidth={2.5} />}
        </TouchableOpacity>
      </View>

      {/* #21: quick add chore bottom sheet */}
      {isAddingChore && (
        <QuickAddChorePanel
          onClose={() => setIsAddingChore(false)}
          onAdd={handleAddChore}
          sections={sections}
          selectedDate={selectedDate}
          history={chores}
        />
      )}
      {editingChore && (
        <ChoreEditPanel
          chore={editingChore}
          onClose={() => setEditingChore(null)}
          onSave={(updates, scope) => { handleEditChore(editingChore, scope, updates); setEditingChore(null); }}
          sections={sections}
        />
      )}
      {deferTarget && (
        <DeferDatePickerModal
          choreTitle={deferTarget.title}
          onClose={() => setDeferTarget(null)}
          onDefer={(date) => { handleDeferTo(deferTarget.id, date); setDeferTarget(null); }}
        />
      )}
      {plinkoChore && (
        <PlinkoBoardModal
          chore={plinkoChore}
          onClose={() => setPlinkoChore(null)}
          onAssign={handleAssignTo}
          currentUser={currentUser}
          familyMembers={FAMILY_MEMBERS}
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
        <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,23,42,0.5)' }]} />
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
                {isDirty && (
                  <TouchableOpacity onPress={handleReset} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEE2E2', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 }}>
                    <RotateCcw size={11} color={COLORS.red} />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.red }}>Reset</Text>
                  </TouchableOpacity>
                )}
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
                      {dir === 'asc'  && <ArrowUp   size={12} color="white" />}
                      {dir === 'desc' && <ArrowDown  size={12} color="white" />}
                      {!dir           && <ArrowUpDown size={12} color="#CBD5E1" />}
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
                  { key: 'recurring' as const,     label: 'Recurring tasks',      icon: <Repeat2 size={15} color={localFilter.recurring ? COLORS.primary : '#94A3B8'} /> },
                  { key: 'photoRequired' as const, label: 'Photo required',       icon: <Camera  size={15} color={localFilter.photoRequired ? COLORS.primary : '#94A3B8'} /> },
                  { key: 'nudged' as const,        label: 'Nudged',               icon: <BellRing size={15} color={localFilter.nudged ? COLORS.primary : '#94A3B8'} /> },
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
