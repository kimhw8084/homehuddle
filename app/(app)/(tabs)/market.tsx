import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Dimensions, Alert,
  TextInput, Modal, Pressable, FlatList, PanResponder,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming,
  FadeInDown, FadeOut, Easing, runOnJS,
} from 'react-native-reanimated';
import {
  Wallet, ChevronRight, Zap, Tag, Plus, X, ChevronDown, ChevronUp,
  MoreHorizontal, TrendingUp, TrendingDown, Package, Pencil, Trash2,
  ShieldCheck, Search, Bolt, Timer, Lock, ListPlus,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

const SPRING_CONFIG = { damping: 25, stiffness: 200, mass: 0.5 };

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

// ─── TYPES ────────────────────────────────────────────────────────
type Category = string;

type PriceEntry = { date: string; pts: number };  // history of price changes

type MarketItem = {
  id: string;
  name: string;
  emoji: string;
  pts: number;
  category: Category;
  desc: string;
  purchaseCount: number;  // purchases in last 30 days
  stock: number | null;          // null = unlimited
  expiresInDays: number | null;  // null = no expiry
  eligibleMembers: string[];     // [] = all
  curators: string[];            // members who can edit/restock/delete
  createdBy: string;
  priceHistory: PriceEntry[];
};

type FlashSaleScope =
  | { type: 'all' }
  | { type: 'categories'; categories: string[] }
  | { type: 'items'; itemIds: string[] };

type FlashSale = {
  id: string;
  scope: FlashSaleScope;
  discountPct: number;   // e.g. 20 = 20% off
  expiresAt: number;     // Date.now() + duration ms
};

const FAMILY_MEMBERS = [
  { name: 'Dad',  avatar: '👨🏻', color: '#4F46E5', balance: 435 },
  { name: 'Mom',  avatar: '👩🏼', color: '#EC4899', balance: 280 },
  { name: 'Alex', avatar: '👦🏻', color: '#10B981', balance: 180 },
];

// Build date strings relative to today for mock history
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const INITIAL_ITEMS: MarketItem[] = [
  { id: 'm1',  name: 'Ice Cream',         emoji: '🍦', pts: 80,  category: 'Food',    desc: 'Choose any flavor at the parlor', purchaseCount: 8,  stock: null, expiresInDays: 7,  eligibleMembers: [], curators: ['Dad'], createdBy: 'Dad', priceHistory: [{ date: daysAgo(30), pts: 60 }, { date: daysAgo(14), pts: 75 }, { date: daysAgo(3), pts: 80 }] },
  { id: 'm2',  name: 'Pizza Night',       emoji: '🍕', pts: 200, category: 'Food',    desc: 'Family pizza of your choice',     purchaseCount: 3,  stock: 2,    expiresInDays: null, eligibleMembers: [], curators: ['Mom'], createdBy: 'Mom', priceHistory: [{ date: daysAgo(20), pts: 200 }] },
  { id: 'm3',  name: 'Candy Bag',         emoji: '🍬', pts: 50,  category: 'Food',    desc: 'Pick a bag from the store',       purchaseCount: 11, stock: null, expiresInDays: 5,  eligibleMembers: ['Alex'], curators: ['Dad', 'Mom'], createdBy: 'Dad', priceHistory: [{ date: daysAgo(25), pts: 40 }, { date: daysAgo(10), pts: 50 }] },
  { id: 'm4',  name: 'Fancy Dinner',      emoji: '🍽️', pts: 350, category: 'Food',    desc: 'Restaurant of your choice',       purchaseCount: 1,  stock: 1,    expiresInDays: null, eligibleMembers: ['Dad', 'Mom'], curators: ['Dad'], createdBy: 'Dad', priceHistory: [{ date: daysAgo(60), pts: 300 }, { date: daysAgo(7), pts: 350 }] },
  { id: 'm5',  name: 'Movie Night',       emoji: '🎬', pts: 150, category: 'Fun',     desc: 'Pick the movie for the family',   purchaseCount: 9,  stock: null, expiresInDays: null, eligibleMembers: [], curators: ['Mom'], createdBy: 'Mom', priceHistory: [{ date: daysAgo(45), pts: 100 }, { date: daysAgo(20), pts: 130 }, { date: daysAgo(5), pts: 150 }] },
  { id: 'm6',  name: 'Game Afternoon',    emoji: '🎮', pts: 120, category: 'Fun',     desc: '2 hours of gaming',               purchaseCount: 5,  stock: null, expiresInDays: null, eligibleMembers: ['Alex'], curators: ['Dad'], createdBy: 'Dad', priceHistory: [{ date: daysAgo(15), pts: 120 }] },
  { id: 'm7',  name: 'Bowling Trip',      emoji: '🎳', pts: 250, category: 'Fun',     desc: 'Family bowling outing',           purchaseCount: 2,  stock: null, expiresInDays: null, eligibleMembers: [], curators: ['Dad', 'Mom'], createdBy: 'Mom', priceHistory: [{ date: daysAgo(30), pts: 220 }, { date: daysAgo(2), pts: 250 }] },
  { id: 'm8',  name: 'Sleep In Day',      emoji: '😴', pts: 200, category: 'Rest',    desc: 'Skip one morning routine',        purchaseCount: 6,  stock: 3,    expiresInDays: null, eligibleMembers: [], curators: ['Mom'], createdBy: 'Mom', priceHistory: [{ date: daysAgo(50), pts: 180 }, { date: daysAgo(10), pts: 200 }] },
  { id: 'm9',  name: 'No-Chore Pass',     emoji: '🏖️', pts: 180, category: 'Rest',    desc: 'Skip your chores for one day',    purchaseCount: 4,  stock: 0,    expiresInDays: 3,  eligibleMembers: [], curators: ['Dad', 'Mom'], createdBy: 'Dad', priceHistory: [{ date: daysAgo(40), pts: 150 }, { date: daysAgo(12), pts: 175 }, { date: daysAgo(1), pts: 180 }] },
  { id: 'm10', name: 'Extra Screen Time', emoji: '📱', pts: 100, category: 'Screen',  desc: '1 extra hour of screen time',     purchaseCount: 7,  stock: null, expiresInDays: 1,  eligibleMembers: ['Alex'], curators: ['Dad', 'Mom'], createdBy: 'Mom', priceHistory: [{ date: daysAgo(20), pts: 80 }, { date: daysAgo(5), pts: 100 }] },
  { id: 'm11', name: 'Late Night Pass',   emoji: '🌙', pts: 130, category: 'Screen',  desc: 'Stay up 1hr past bedtime',        purchaseCount: 2,  stock: null, expiresInDays: 1,  eligibleMembers: ['Alex'], curators: ['Dad', 'Mom'], createdBy: 'Dad', priceHistory: [{ date: daysAgo(30), pts: 130 }] },
  { id: 'm12', name: 'Wish Card',         emoji: '⭐', pts: 500, category: 'Special', desc: 'One reasonable wish granted',     purchaseCount: 1,  stock: 1,    expiresInDays: 30, eligibleMembers: [], curators: ['Dad', 'Mom'], createdBy: 'Dad', priceHistory: [{ date: daysAgo(90), pts: 400 }, { date: daysAgo(30), pts: 500 }] },
  { id: 'm13', name: 'Spa Day',           emoji: '🧖', pts: 300, category: 'Special', desc: 'Relaxation day, no chores',       purchaseCount: 3,  stock: null, expiresInDays: null, eligibleMembers: [], curators: ['Mom'], createdBy: 'Mom', priceHistory: [{ date: daysAgo(25), pts: 300 }] },
];

const BASE_CATEGORIES = ['Food', 'Fun', 'Rest', 'Screen', 'Special'];
const CAT_ICONS: Record<string, string> = {
  Food: '🍕', Fun: '🎉', Rest: '😴', Screen: '📱', Special: '⭐',
};

// Suggestion engine: most-purchased / highest-rated items for quick-fill
const SUGGESTIONS = INITIAL_ITEMS.slice(0, 5).map(i => ({
  name: i.name, emoji: i.emoji, pts: i.pts, category: i.category, desc: i.desc,
}));

// ─── PRICE HISTORY MODAL ──────────────────────────────────────────
function PriceHistoryModal({ item, onClose }: { item: MarketItem; onClose: () => void }) {
  const history = [...item.priceHistory].reverse(); // newest first
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable onPress={e => e.stopPropagation()}>
          <View style={{ backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}>
            <View style={{ width: 40, height: 4, backgroundColor: C.mutedBorder, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ fontSize: 18, fontWeight: '900', color: C.text, marginBottom: 4 }}>{item.emoji} {item.name}</Text>
            <Text style={{ fontSize: 12, color: C.subtext, marginBottom: 20 }}>Price history — newest first</Text>

            {history.map((entry, idx) => {
              const prev = history[idx + 1];
              const delta = prev ? entry.pts - prev.pts : null;
              const isFirst = idx === 0;
              return (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: idx < history.length - 1 ? 1 : 0, borderColor: C.mutedBorder }}>
                  {/* Timeline dot */}
                  <View style={{ alignItems: 'center', width: 20 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: isFirst ? C.accent : C.mutedBorder, borderWidth: 2, borderColor: isFirst ? C.accent : C.subtext }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: C.text }}>{entry.pts} pts</Text>
                    <Text style={{ fontSize: 12, color: C.subtext }}>{entry.date}</Text>
                  </View>
                  {delta !== null && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: delta > 0 ? C.redBg : C.greenBg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      {delta > 0
                        ? <TrendingUp size={12} color={C.red} />
                        : <TrendingDown size={12} color={C.green} />}
                      <Text style={{ fontSize: 11, fontWeight: '800', color: delta > 0 ? C.red : C.green }}>
                        {delta > 0 ? '+' : ''}{delta}
                      </Text>
                    </View>
                  )}
                  {delta === null && (
                    <View style={{ backgroundColor: C.muted, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: C.subtext }}>ORIGINAL</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── ADD / EDIT ITEM MODAL ────────────────────────────────────────
type ItemFormProps = {
  initial?: MarketItem;
  categories: string[];
  onSave: (item: Omit<MarketItem, 'id' | 'priceHistory' | 'createdBy' | 'purchaseCount'>) => void;
  onClose: () => void;
  currentUser: string;
};

function ItemFormModal({ initial, categories, onSave, onClose, currentUser }: ItemFormProps) {
  const [name, setName]             = useState(initial?.name ?? '');
  const [emoji, setEmoji]           = useState(initial?.emoji ?? '');
  const [pts, setPts]               = useState(initial?.pts.toString() ?? '');
  const [desc, setDesc]             = useState(initial?.desc ?? '');
  const [category, setCategory]     = useState(initial?.category ?? categories[0]);
  const [newCat, setNewCat]         = useState('');
  const [addingCat, setAddingCat]   = useState(false);
  const [stock, setStock]           = useState<string>(initial?.stock?.toString() ?? '');
  const [unlimited, setUnlimited]   = useState(initial?.stock === null);
  const [expires, setExpires]       = useState<string>(initial?.expiresInDays?.toString() ?? '');
  const [noExpiry, setNoExpiry]     = useState(initial?.expiresInDays === null);
  const [eligible, setEligible]     = useState<string[]>(initial?.eligibleMembers ?? []);
  const [curators, setCurators]     = useState<string[]>(initial?.curators ?? [currentUser]);
  const [suggestion, setSuggestion] = useState<typeof SUGGESTIONS[0] | null>(null);
  const [showSugg, setShowSugg]     = useState(true);

  const filteredSugg = useMemo(() => {
    const q = name.trim().toLowerCase();
    return q.length < 2 ? [] : SUGGESTIONS.filter(s => s.name.toLowerCase().includes(q));
  }, [name]);

  const applySugg = (s: typeof SUGGESTIONS[0]) => {
    setName(s.name); setEmoji(s.emoji); setPts(s.pts.toString());
    setDesc(s.desc); setCategory(s.category); setShowSugg(false);
    Haptics.selectionAsync();
  };

  const handleSave = () => {
    const ptsNum = parseInt(pts);
    if (!name.trim() || !ptsNum) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const finalCat = addingCat && newCat.trim() ? newCat.trim() : category;
    onSave({
      name: name.trim(),
      emoji: emoji.trim() || '🎁',
      pts: ptsNum,
      desc: desc.trim(),
      category: finalCat,
      stock: unlimited ? null : (parseInt(stock) || 0),
      expiresInDays: noExpiry ? null : (parseInt(expires) || null),
      eligibleMembers: eligible,
      curators,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const toggleMember = (arr: string[], set: (v: string[]) => void, name: string) => {
    set(arr.includes(name) ? arr.filter(n => n !== name) : [...arr, name]);
    Haptics.selectionAsync();
  };

  const translateY = useSharedValue(600);
  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  useEffect(() => { translateY.value = withSpring(0, { ...SPRING_CONFIG, damping: 30 }); }, []);
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
      <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <Animated.View {...panResponder.panHandlers} style={[panelStyle, { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' }]}>
          <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {/* Handle */}
            <View style={{ alignItems: 'center', paddingBottom: 12 }}>
              <View style={{ width: 40, height: 4, backgroundColor: C.mutedBorder, borderRadius: 2 }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: C.text, flex: 1 }}>
                {initial ? 'Edit Item' : 'New Market Item'}
              </Text>
              <TouchableOpacity onPress={onClose}><X size={22} color={C.subtext} /></TouchableOpacity>
            </View>

            {/* Suggestions */}
            {showSugg && filteredSugg.length > 0 && (
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: C.subtext, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Suggestions</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {filteredSugg.map(s => (
                    <TouchableOpacity
                      key={s.name}
                      onPress={() => applySugg(s)}
                      style={{ backgroundColor: C.accentBg, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.accent + '30' }}
                    >
                      <Text style={{ fontSize: 16 }}>{s.emoji}</Text>
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: C.accent }}>{s.name}</Text>
                        <Text style={{ fontSize: 11, color: C.subtext }}>{s.pts} pts</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Emoji + Name */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              <TextInput
                value={emoji}
                onChangeText={setEmoji}
                placeholder="🎁"
                style={{ fontSize: 28, width: 58, height: 58, borderRadius: 16, backgroundColor: C.muted, textAlign: 'center', borderWidth: 1, borderColor: C.mutedBorder }}
              />
              <TextInput
                value={name}
                onChangeText={t => { setName(t); setShowSugg(true); }}
                placeholder="Item name"
                placeholderTextColor={C.subtext}
                style={{ flex: 1, fontSize: 16, fontWeight: '700', color: C.text, backgroundColor: C.muted, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: C.mutedBorder }}
              />
            </View>

            {/* Description */}
            <TextInput
              value={desc}
              onChangeText={setDesc}
              placeholder="Short description…"
              placeholderTextColor={C.subtext}
              style={{ fontSize: 14, color: C.text, backgroundColor: C.muted, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 14, borderWidth: 1, borderColor: C.mutedBorder }}
            />

            {/* Points */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.subtext, marginBottom: 6 }}>Price (pts)</Text>
              <TextInput
                value={pts}
                onChangeText={setPts}
                keyboardType="numeric"
                placeholder="e.g. 150"
                placeholderTextColor={C.subtext}
                style={{ fontSize: 16, fontWeight: '800', color: C.text, backgroundColor: C.muted, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: C.mutedBorder }}
              />
            </View>

            {/* Category */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.subtext, marginBottom: 6 }}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => { setCategory(cat); setAddingCat(false); Haptics.selectionAsync(); }}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: category === cat && !addingCat ? C.accent : C.muted, borderWidth: 1, borderColor: category === cat && !addingCat ? C.accent : C.mutedBorder }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: category === cat && !addingCat ? '#fff' : C.subtext }}>{CAT_ICONS[cat] ?? '📦'} {cat}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => { setAddingCat(true); Haptics.selectionAsync(); }}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: addingCat ? C.accent : C.muted, borderWidth: 1, borderColor: addingCat ? C.accent : C.mutedBorder, flexDirection: 'row', alignItems: 'center', gap: 5 }}
                >
                  <Plus size={13} color={addingCat ? '#fff' : C.subtext} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: addingCat ? '#fff' : C.subtext }}>New</Text>
                </TouchableOpacity>
              </ScrollView>
              {addingCat && (
                <TextInput
                  value={newCat}
                  onChangeText={setNewCat}
                  placeholder="New category name…"
                  placeholderTextColor={C.subtext}
                  autoFocus
                  style={{ marginTop: 8, fontSize: 14, color: C.text, backgroundColor: C.muted, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: C.accent }}
                />
              )}
            </View>

            {/* Stock */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.subtext, marginBottom: 6 }}>Stock</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <TouchableOpacity
                  onPress={() => { setUnlimited(true); Haptics.selectionAsync(); }}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 14, backgroundColor: unlimited ? C.accent : C.muted, borderWidth: 1, borderColor: unlimited ? C.accent : C.mutedBorder, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: unlimited ? '#fff' : C.subtext }}>Unlimited</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setUnlimited(false); Haptics.selectionAsync(); }}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 14, backgroundColor: !unlimited ? C.accent : C.muted, borderWidth: 1, borderColor: !unlimited ? C.accent : C.mutedBorder, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: !unlimited ? '#fff' : C.subtext }}>Limited</Text>
                </TouchableOpacity>
              </View>
              {!unlimited && (
                <TextInput
                  value={stock}
                  onChangeText={setStock}
                  keyboardType="numeric"
                  placeholder="Number of units"
                  placeholderTextColor={C.subtext}
                  style={{ fontSize: 14, color: C.text, backgroundColor: C.muted, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: C.mutedBorder }}
                />
              )}
            </View>

            {/* Expiration */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.subtext, marginBottom: 6 }}>Expiration after purchase</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <TouchableOpacity
                  onPress={() => { setNoExpiry(true); Haptics.selectionAsync(); }}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 14, backgroundColor: noExpiry ? C.accent : C.muted, borderWidth: 1, borderColor: noExpiry ? C.accent : C.mutedBorder, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: noExpiry ? '#fff' : C.subtext }}>Never</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setNoExpiry(false); Haptics.selectionAsync(); }}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 14, backgroundColor: !noExpiry ? C.accent : C.muted, borderWidth: 1, borderColor: !noExpiry ? C.accent : C.mutedBorder, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: !noExpiry ? '#fff' : C.subtext }}>Fixed days</Text>
                </TouchableOpacity>
              </View>
              {!noExpiry && (
                <TextInput
                  value={expires}
                  onChangeText={setExpires}
                  keyboardType="numeric"
                  placeholder="e.g. 7  (days)"
                  placeholderTextColor={C.subtext}
                  style={{ fontSize: 14, color: C.text, backgroundColor: C.muted, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: C.mutedBorder }}
                />
              )}
            </View>

            {/* Eligible members */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.subtext, marginBottom: 6 }}>Who can buy  <Text style={{ fontWeight: '400' }}>(empty = everyone)</Text></Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {FAMILY_MEMBERS.map(m => {
                  const on = eligible.includes(m.name);
                  return (
                    <TouchableOpacity
                      key={m.name}
                      onPress={() => toggleMember(eligible, setEligible, m.name)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: on ? m.color : C.muted, borderWidth: 1, borderColor: on ? m.color : C.mutedBorder }}
                    >
                      <Text style={{ fontSize: 16 }}>{m.avatar}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: on ? '#fff' : C.subtext }}>{m.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Curators */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.subtext, marginBottom: 6 }}>Curators  <Text style={{ fontWeight: '400' }}>(can edit, restock, delete)</Text></Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {FAMILY_MEMBERS.map(m => {
                  const on = curators.includes(m.name);
                  return (
                    <TouchableOpacity
                      key={m.name}
                      onPress={() => toggleMember(curators, setCurators, m.name)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: on ? C.accent : C.muted, borderWidth: 1, borderColor: on ? C.accent : C.mutedBorder }}
                    >
                      <Text style={{ fontSize: 16 }}>{m.avatar}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: on ? '#fff' : C.subtext }}>{m.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Save */}
            <TouchableOpacity
              onPress={handleSave}
              style={{ backgroundColor: C.accent, borderRadius: 20, paddingVertical: 18, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#fff' }}>{initial ? 'Save Changes' : 'Add to Market'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── RESTOCK MODAL ────────────────────────────────────────────────
function RestockModal({ item, onRestock, onClose }: { item: MarketItem; onRestock: (n: number) => void; onClose: () => void }) {
  const [qty, setQty] = useState('5');
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', paddingHorizontal: 32 }} onPress={onClose}>
        <Pressable onPress={e => e.stopPropagation()}>
          <View style={{ backgroundColor: C.card, borderRadius: 24, padding: 24, gap: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: C.text }}>{item.emoji} Restock "{item.name}"</Text>
            <Text style={{ fontSize: 13, color: C.subtext }}>Current stock: {item.stock ?? '∞'}</Text>
            <TextInput
              value={qty}
              onChangeText={setQty}
              keyboardType="numeric"
              placeholder="Units to add"
              placeholderTextColor={C.subtext}
              style={{ fontSize: 16, fontWeight: '800', color: C.text, backgroundColor: C.muted, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: C.mutedBorder }}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={onClose} style={{ flex: 1, backgroundColor: C.muted, borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}>
                <Text style={{ fontWeight: '700', color: C.subtext }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { const n = parseInt(qty); if (n > 0) { onRestock(n); onClose(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } }}
                style={{ flex: 1, backgroundColor: C.green, borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}
              >
                <Text style={{ fontWeight: '900', color: '#fff' }}>Add Stock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── LONG-PRESS MENU ──────────────────────────────────────────────
function LongPressMenu({
  item, currentUser, canCurate, onEdit, onRestock, onDelete, onPriceHistory, onClose,
}: {
  item: MarketItem; currentUser: string; canCurate: boolean;
  onEdit: () => void; onRestock: () => void; onDelete: () => void;
  onPriceHistory: () => void; onClose: () => void;
}) {
  const actions: { label: string; icon: React.ReactNode; color: string; onPress: () => void; disabled?: boolean }[] = [
    { label: 'Price History', icon: <TrendingUp size={17} color={C.accent} />, color: C.accent, onPress: onPriceHistory },
    { label: 'Edit Item',     icon: <Pencil size={17} color={C.text} />,       color: C.text,   onPress: onEdit,          disabled: !canCurate },
    { label: 'Add Stock',     icon: <Package size={17} color={C.green} />,     color: C.green,  onPress: onRestock,        disabled: !canCurate || item.stock === null },
    { label: 'Delete Item',   icon: <Trash2 size={17} color={C.red} />,        color: C.red,    onPress: onDelete,         disabled: !canCurate },
  ];
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable onPress={e => e.stopPropagation()}>
          <View style={{ backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40 }}>
            <View style={{ width: 40, height: 4, backgroundColor: C.mutedBorder, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
              <Text style={{ fontSize: 16, fontWeight: '900', color: C.text }}>{item.name}</Text>
            </View>
            {actions.map(a => (
              <TouchableOpacity
                key={a.label}
                disabled={a.disabled}
                onPress={() => { onClose(); setTimeout(a.onPress, 150); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, borderBottomWidth: 1, borderColor: C.mutedBorder, opacity: a.disabled ? 0.3 : 1 }}
              >
                {a.icon}
                <Text style={{ fontSize: 15, fontWeight: '700', color: a.color }}>{a.label}</Text>
                {a.label === 'Edit Item' && !canCurate && (
                  <View style={{ marginLeft: 'auto', backgroundColor: C.muted, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: C.subtext }}>Curators only</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── FLASH SALE MODAL ─────────────────────────────────────────────
const DISCOUNT_PRESETS = [10, 20, 30];
const DURATION_OPTIONS = [
  { label: '1h',  ms: 1  * 3600_000 },
  { label: '4h',  ms: 4  * 3600_000 },
  { label: '12h', ms: 12 * 3600_000 },
  { label: '1d',  ms: 24 * 3600_000 },
];

function FlashSaleModal({ items, categories, onSave, onClose }: {
  items: MarketItem[];
  categories: string[];
  onSave: (sale: Omit<FlashSale, 'id'>) => void;
  onClose: () => void;
}) {
  const [scopeType, setScopeType]         = useState<'all' | 'categories' | 'items'>('all');
  const [selCats, setSelCats]             = useState<string[]>([]);
  const [selItems, setSelItems]           = useState<string[]>([]);
  const [discountPreset, setDiscountPreset] = useState<number | 'custom'>(20);
  const [customDiscount, setCustomDiscount] = useState('');
  const [durationOpt, setDurationOpt]     = useState<number | 'custom'>(DURATION_OPTIONS[1].ms);
  const [customDurationH, setCustomDurationH] = useState('');

  const discountPct = discountPreset === 'custom' ? (parseInt(customDiscount) || 0) : discountPreset;
  const durationMs  = durationOpt === 'custom' ? ((parseInt(customDurationH) || 0) * 3600_000) : durationOpt;
  const translateY = useSharedValue(500);
  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  useEffect(() => { translateY.value = withSpring(0, { ...SPRING_CONFIG, damping: 30 }); }, []);
  const fsPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.value = g.dy; },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 80) { translateY.value = withTiming(700, { duration: 250 }); setTimeout(onClose, 260); }
      else { translateY.value = withSpring(0, { damping: 28, stiffness: 280 }); }
    },
  })).current;

  const toggleCat  = (c: string)  => setSelCats(prev  => prev.includes(c)  ? prev.filter(x => x !== c)  : [...prev, c]);
  const toggleItem = (id: string) => setSelItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const scopeValid = scopeType === 'all' || (scopeType === 'categories' && selCats.length > 0) || (scopeType === 'items' && selItems.length > 0);
  const isValid = scopeValid && discountPct > 0 && discountPct <= 100 && durationMs > 0;

  const handleSave = () => {
    if (!isValid) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const scope: FlashSaleScope =
      scopeType === 'all'        ? { type: 'all' } :
      scopeType === 'categories' ? { type: 'categories', categories: selCats } :
      { type: 'items', itemIds: selItems };
    onSave({ scope, discountPct, expiresAt: Date.now() + durationMs });
    onClose();
  };

  const label = { fontSize: 11, fontWeight: '700' as const, color: C.subtext, textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 8 };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <Animated.View {...fsPan.panHandlers} style={[panelStyle, { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%' }]}>
          <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <View style={{ alignItems: 'center', paddingBottom: 12 }}>
              <View style={{ width: 40, height: 4, backgroundColor: C.mutedBorder, borderRadius: 2 }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.goldBg, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>⚡</Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: '900', color: C.text, flex: 1 }}>New Flash Sale</Text>
              <TouchableOpacity onPress={onClose}><X size={22} color={C.subtext} /></TouchableOpacity>
            </View>

            {/* Scope */}
            <Text style={label}>Apply to</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              {(['all', 'categories', 'items'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => { setScopeType(t); Haptics.selectionAsync(); }}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center', backgroundColor: scopeType === t ? C.gold + 'CC' : C.muted, borderWidth: 1, borderColor: scopeType === t ? C.gold : C.mutedBorder }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: scopeType === t ? '#fff' : C.subtext }}>
                    {t === 'all' ? '🏪 All' : t === 'categories' ? '📂 Category' : '📦 Items'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {scopeType === 'categories' && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                {categories.map(c => {
                  const on = selCats.includes(c);
                  return (
                    <TouchableOpacity key={c} onPress={() => { toggleCat(c); Haptics.selectionAsync(); }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: on ? C.accentBg : C.muted, borderWidth: 1, borderColor: on ? C.accent : C.mutedBorder }}
                    >
                      <Text style={{ fontSize: 14 }}>{CAT_ICONS[c] ?? '📦'}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: on ? C.accent : C.subtext }}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {scopeType === 'items' && (
              <View style={{ marginBottom: 18 }}>
                {items.filter(i => i.stock === null || i.stock > 0).map(i => {
                  const on = selItems.includes(i.id);
                  return (
                    <TouchableOpacity key={i.id} onPress={() => { toggleItem(i.id); Haptics.selectionAsync(); }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.mutedBorder }}
                    >
                      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: on ? C.accentBg : C.muted, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 16 }}>{i.emoji}</Text>
                      </View>
                      <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: C.text }}>{i.name}</Text>
                      <Text style={{ fontSize: 12, color: C.subtext }}>{i.pts} pts</Text>
                      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: on ? C.accent : C.mutedBorder, backgroundColor: on ? C.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                        {on && <Text style={{ fontSize: 11, color: '#fff', fontWeight: '900' }}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Discount % */}
            <Text style={label}>Discount</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: discountPreset === 'custom' ? 10 : 20 }}>
              {DISCOUNT_PRESETS.map(d => (
                <TouchableOpacity key={d} onPress={() => { setDiscountPreset(d); Haptics.selectionAsync(); }}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center', backgroundColor: discountPreset === d ? C.red + 'CC' : C.muted, borderWidth: 1, borderColor: discountPreset === d ? C.red : C.mutedBorder }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: discountPreset === d ? '#fff' : C.subtext }}>{d}%</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => { setDiscountPreset('custom'); Haptics.selectionAsync(); }}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center', backgroundColor: discountPreset === 'custom' ? C.red + 'CC' : C.muted, borderWidth: 1, borderColor: discountPreset === 'custom' ? C.red : C.mutedBorder }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: discountPreset === 'custom' ? '#fff' : C.subtext }}>Custom</Text>
              </TouchableOpacity>
            </View>
            {discountPreset === 'custom' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.muted, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20, gap: 8 }}>
                <TextInput value={customDiscount} onChangeText={setCustomDiscount} placeholder="e.g. 15" placeholderTextColor={C.subtext} keyboardType="number-pad" style={{ flex: 1, fontSize: 17, fontWeight: '800', color: C.text }} autoFocus />
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.subtext }}>% off</Text>
              </View>
            )}

            {/* Duration */}
            <Text style={label}>Duration</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: durationOpt === 'custom' ? 10 : 28 }}>
              {DURATION_OPTIONS.map(opt => (
                <TouchableOpacity key={opt.label} onPress={() => { setDurationOpt(opt.ms); Haptics.selectionAsync(); }}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center', backgroundColor: durationOpt === opt.ms ? C.accentBg : C.muted, borderWidth: 1, borderColor: durationOpt === opt.ms ? C.accent : C.mutedBorder }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: durationOpt === opt.ms ? C.accent : C.subtext }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => { setDurationOpt('custom'); Haptics.selectionAsync(); }}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center', backgroundColor: durationOpt === 'custom' ? C.accentBg : C.muted, borderWidth: 1, borderColor: durationOpt === 'custom' ? C.accent : C.mutedBorder }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: durationOpt === 'custom' ? C.accent : C.subtext }}>Custom</Text>
              </TouchableOpacity>
            </View>
            {durationOpt === 'custom' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.muted, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 28, gap: 8 }}>
                <TextInput value={customDurationH} onChangeText={setCustomDurationH} placeholder="e.g. 6" placeholderTextColor={C.subtext} keyboardType="number-pad" style={{ flex: 1, fontSize: 17, fontWeight: '800', color: C.text }} autoFocus />
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.subtext }}>hours</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleSave}
              disabled={!isValid}
              style={{ backgroundColor: isValid ? C.gold : C.muted, borderRadius: 18, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
            >
              <Text style={{ fontSize: 15, fontWeight: '900', color: isValid ? '#fff' : C.subtext }}>⚡ Launch Flash Sale</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── MARKET CARD ──────────────────────────────────────────────────
function MarketCard({
  item, memberBalance, currentUser, onBuy, onLongPress, isPopular, salePrice,
  saleExpiresAt,
}: {
  item: MarketItem;
  memberBalance: number;
  currentUser: string;
  onBuy: (item: MarketItem, effectivePrice: number) => void;
  onLongPress: (item: MarketItem) => void;
  isPopular: boolean;
  salePrice?: number;
  saleExpiresAt?: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const confirmTimer = useRef<NodeJS.Timeout | null>(null);

  const effectivePrice = salePrice ?? item.pts;
  const outOfStock = item.stock !== null && item.stock <= 0;
  const hasFunds = memberBalance >= effectivePrice;
  const isEligible = item.eligibleMembers.length === 0 || item.eligibleMembers.includes(currentUser);
  const canBuy = !outOfStock && hasFunds && isEligible;

  const handleBuyPress = () => {
    if (outOfStock) return;

    if (!isEligible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Restricted', 'You are not eligible to purchase this item.');
      return;
    }

    if (!hasFunds) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Insufficient Points', `You need ${effectivePrice} points to buy this item.`);
      return;
    }

    if (!confirming) {
      setConfirming(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirming(false), 3000);
      return;
    }

    // Confirming is true, execute purchase
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setConfirming(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBuy(item, effectivePrice);
  };

  useEffect(() => {
    return () => { if (confirmTimer.current) clearTimeout(confirmTimer.current); };
  }, []);

  // Inline metadata chips: stock warning + expiry
  const chips: { label: string; color: string }[] = [];
  if (item.stock !== null && !outOfStock && item.stock <= 3)
    chips.push({ label: `${item.stock} left`, color: C.red });
  if (item.expiresInDays !== null)
    chips.push({ label: `${item.expiresInDays}d`, color: C.gold });

  return (
    <View style={{ width: '100%' }}>
      <Pressable
        onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onLongPress(item); }}
        delayLongPress={450}
        android_ripple={null}
        style={[C.shadow, {
          backgroundColor: C.card,
          borderRadius: 18, borderWidth: 1,
          borderColor: outOfStock ? C.red + '40' : C.cardBorder,
          marginBottom: 10,
          overflow: 'hidden',
          opacity: canBuy || outOfStock ? 1 : 0.7,
        }]}
      >
        {/* Main row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
          {/* Emoji bubble */}
          <View style={{
            width: 52, height: 52, borderRadius: 16,
            backgroundColor: outOfStock ? C.muted : !isEligible ? C.muted : C.accentBg,
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Text style={{ fontSize: 26, opacity: outOfStock || !isEligible ? 0.4 : 1 }}>{item.emoji}</Text>
            {outOfStock && (
              <View style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 18, height: 18, borderRadius: 9,
                backgroundColor: C.red, alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: C.card,
              }}>
                <Text style={{ fontSize: 9, color: '#fff', fontWeight: '900', lineHeight: 11 }}>✕</Text>
              </View>
            )}
            {!outOfStock && !isEligible && (
              <View style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 18, height: 18, borderRadius: 9,
                backgroundColor: C.subtext, alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: C.card,
              }}>
                <Lock size={10} color="#fff" />
              </View>
            )}
          </View>

          {/* Text block */}
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 }}>
              <Text style={{
                fontSize: 14, fontWeight: '800', flexShrink: 1,
                color: outOfStock || !isEligible ? C.subtext : C.text,
                textDecorationLine: outOfStock ? 'line-through' : 'none',
              }} numberOfLines={1}>
                {item.name}
              </Text>
              {isPopular && !outOfStock && isEligible && (
                <View style={{ backgroundColor: C.gold, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 }}>
                  <Text style={{ fontSize: 8, fontWeight: '900', color: '#fff' }}>HOT</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 11, color: C.subtext, lineHeight: 15, opacity: outOfStock ? 0.6 : 1 }} numberOfLines={1}>
              {item.desc}
            </Text>
            {!outOfStock && chips.length > 0 && (
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 5 }}>
                {chips.map(chip => (
                  <View key={chip.label} style={{ backgroundColor: chip.color + '18', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: chip.color }}>{chip.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Price button — only interactive element */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleBuyPress}
            style={{
              flexShrink: 0,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: outOfStock || !isEligible ? C.muted : confirming ? C.red : hasFunds ? '#F1F5F9' : C.gold,
              borderRadius: 12, paddingHorizontal: confirming ? 8 : 12, paddingVertical: 8, gap: confirming ? 0 : 2,
              minWidth: confirming ? 72 : 58, height: 38,
              borderWidth: hasFunds && !confirming && !outOfStock && isEligible ? 1 : 0,
              borderColor: '#E2E8F0',
            }}
          >
            {!confirming && salePrice !== undefined && isEligible && (
              <Text style={{ fontSize: 9, fontWeight: '900', color: C.subtext, textDecorationLine: 'line-through', opacity: 0.7 }}>
                {item.pts}
              </Text>
            )}
            {confirming ? (
              <Text style={{ fontSize: 11, fontWeight: '900', color: '#fff' }}>Confirm?</Text>
            ) : !isEligible ? (
              <Lock size={14} color={C.subtext} />
            ) : (
              <>
                <Zap size={11} color={hasFunds ? C.accent : '#fff'} fill={hasFunds ? C.accent : '#fff'} />
                <Text style={{ fontSize: 11, fontWeight: '900', color: hasFunds ? C.text : '#fff' }}>
                  {effectivePrice}
                </Text>
              </>
            )}
            {!confirming && salePrice !== undefined && isEligible && !hasFunds && (
               <Text style={{ fontSize: 7, fontWeight: '900', color: '#fff', marginTop: -2 }}>NEED PTS</Text>
            )}
            {!confirming && salePrice !== undefined && isEligible && hasFunds && (
              <View style={{ backgroundColor: C.red, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 }}>
                <Text style={{ fontSize: 8, fontWeight: '900', color: '#fff' }}>SALE</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Flash sale strip */}
        {salePrice !== undefined && !outOfStock && (() => {
          const pct = Math.round(((item.pts - salePrice) / item.pts) * 100);
          let timeLabel = '';
          if (saleExpiresAt) {
            const ms = saleExpiresAt - Date.now();
            if (ms > 0) {
              const h = Math.floor(ms / 3600_000);
              const m = Math.floor((ms % 3600_000) / 60_000);

              const end = new Date(saleExpiresAt);
              const isToday = end.toDateString() === new Date().toDateString();
              const timeStr = end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
              const exactTime = isToday ? timeStr : `${end.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${timeStr}`;

              if (h > 0) {
                timeLabel = ` · ends in ${h}h${m > 0 ? ` ${m}m` : ''} (${exactTime})`;
              } else {
                timeLabel = ` · ends in ${m}m (${exactTime})`;
              }
            }
          }
          return (
            <View style={{ backgroundColor: C.red + '12', borderTopWidth: 1, borderTopColor: C.red + '30', paddingHorizontal: 14, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 10 }}>⚡</Text>
              <Text style={{ fontSize: 11, fontWeight: '800', color: C.red }}>{pct}% off</Text>
              {timeLabel ? <Text style={{ fontSize: 10, color: C.red, fontWeight: '600', opacity: 0.8 }}>{timeLabel}</Text> : null}
            </View>
          );
        })()}

        {/* Out-of-stock banner strip */}
        {outOfStock && (
          <View style={{
            backgroundColor: C.red + '12',
            borderTopWidth: 1, borderTopColor: C.red + '30',
            paddingHorizontal: 14, paddingVertical: 7,
            flexDirection: 'row', alignItems: 'center', gap: 6,
          }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.red }} />
            <Text style={{ fontSize: 11, fontWeight: '800', color: C.red, flex: 1 }}>Out of stock</Text>
            <Text style={{ fontSize: 10, color: C.subtext, fontWeight: '600' }}>Long press to restock</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

// ─── REDEEM ANIMATION OVERLAY ─────────────────────────────────────
const { height: SCREEN_H } = Dimensions.get('window');

// ─── CONFIRM SHEET ────────────────────────────────────────────────
function ConfirmSheet({ item, effectivePrice, memberBalance, onConfirm, onCancel }: {
  item: MarketItem;
  effectivePrice: number;
  memberBalance: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const translateY = useSharedValue(300);
  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  useEffect(() => { translateY.value = withSpring(0, { damping: 26, stiffness: 320 }); }, []);

  const dismiss = (cb: () => void) => {
    translateY.value = withTiming(300, { duration: 220 });
    setTimeout(cb, 230);
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={() => dismiss(onCancel)} />
        <Animated.View style={[panelStyle, { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44 }]}>
          <View style={{ width: 40, height: 4, backgroundColor: C.mutedBorder, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: C.accentBg, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 30 }}>{item.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '900', color: C.text }}>{item.name}</Text>
              <Text style={{ fontSize: 12, color: C.subtext, marginTop: 2 }}>{item.desc}</Text>
            </View>
          </View>
          <View style={{ backgroundColor: C.muted, borderRadius: 14, padding: 14, marginBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: C.subtext, fontWeight: '600' }}>Cost</Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: C.accent }}>{effectivePrice} pts</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={() => dismiss(onCancel)} style={{ flex: 1, backgroundColor: C.muted, borderRadius: 16, paddingVertical: 15, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: C.subtext }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => dismiss(onConfirm)}
              style={{ flex: 2, backgroundColor: C.accent, borderRadius: 16, paddingVertical: 15, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#fff' }}>Redeem for {effectivePrice} pts</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── REDEEM OVERLAY ───────────────────────────────────────────────
function RedeemOverlay({ item, effectivePrice, memberBalance, onDone }: {
  item: MarketItem;
  effectivePrice: number;
  memberBalance: number;
  onDone: () => void;
}) {
  const cardScale = useSharedValue(0.85);
  const cardOp    = useSharedValue(0);
  const cardY     = useSharedValue(0);
  const [displayed, setDisplayed] = useState(memberBalance);

  useEffect(() => {
    // Appear instantly
    cardScale.value = withSpring(1, { damping: 20, stiffness: 350 });
    cardOp.value    = withTiming(1, { duration: 120 });

    // Count down immediately — 1200ms total, 30 steps
    const start = memberBalance;
    const end   = memberBalance - effectivePrice;
    const steps = 30;
    const interval = 1200 / steps;
    let step = 0;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const t = setInterval(() => {
      step++;
      setDisplayed(Math.round(start + (end - start) * (step / steps)));
      if (step >= steps) {
        clearInterval(t);
        // Wait 2 seconds before flying away so user sees the result
        setTimeout(() => {
          cardScale.value = withTiming(0.1, { duration: 300, easing: Easing.in(Easing.quad) });
          cardY.value     = withTiming(SCREEN_H * 0.45, { duration: 300, easing: Easing.in(Easing.quad) });
          cardOp.value    = withTiming(0, { duration: 260 });
          setTimeout(() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onDone(); }, 310);
        }, 2000);
      }
    }, interval);

    return () => clearInterval(t);
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }, { translateY: cardY.value }],
    opacity: cardOp.value,
  }));

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.65)' }} pointerEvents="box-none">
      <Animated.View style={[cardStyle, { width: width - 64, backgroundColor: C.card, borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 20 }]}>
        <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: C.accentBg, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 40 }}>{item.emoji}</Text>
        </View>
        <Text style={{ fontSize: 16, fontWeight: '900', color: C.text, marginBottom: 16 }}>{item.name}</Text>
        <Text style={{ fontSize: 11, fontWeight: '700', color: C.subtext, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>Balance</Text>
        <Text style={{ fontSize: 42, fontWeight: '900', color: C.accent, letterSpacing: -1 }}>
          {displayed.toLocaleString()}
        </Text>
        <Text style={{ fontSize: 13, color: C.red, fontWeight: '700', marginTop: 4 }}>−{effectivePrice} pts</Text>
      </Animated.View>
    </View>
  );
}

// ─── MARKET SCREEN ────────────────────────────────────────────────
export default function MarketScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [selectedMember, setSelectedMember] = useState('Dad');
  const [category, setCategory]             = useState<Category>('All');
  const [items, setItems]                   = useState<MarketItem[]>(INITIAL_ITEMS);
  const [showAdd, setShowAdd]               = useState(false);
  const [editItem, setEditItem]             = useState<MarketItem | null>(null);
  const [longPressItem, setLongPressItem]   = useState<MarketItem | null>(null);
  const [restockItem, setRestockItem]       = useState<MarketItem | null>(null);
  const [priceHistItem, setPriceHistItem]   = useState<MarketItem | null>(null);
  const [ptsSortDir, setPtsSortDir]         = useState<null | 'asc' | 'desc'>(null);
  const [searchQuery, setSearchQuery]       = useState('');
  const [searching, setSearching]           = useState(false);
  const [flashSales, setFlashSales]         = useState<FlashSale[]>([]);
  const [showFlashSale, setShowFlashSale]   = useState(false);
  const [showAddMenu, setShowAddMenu]       = useState(false);
  const [isFabOpen, setIsFabOpen]           = useState(false);
  const [redeemState, setRedeemState]       = useState<{ item: MarketItem; price: number } | null>(null);

  const currentUser = selectedMember;
  const member = FAMILY_MEMBERS.find(m => m.name === selectedMember)!;

  // Active (non-expired) sales
  const activeSales = useMemo(() => flashSales.filter(s => s.expiresAt > Date.now()), [flashSales]);

  // Returns discounted price for an item, or undefined if no sale applies
  const getSaleInfo = useCallback((item: MarketItem): { price: number; expiresAt: number } | undefined => {
    const sale = activeSales.find(s => {
      if (s.scope.type === 'all') return true;
      if (s.scope.type === 'categories') return s.scope.categories.includes(item.category);
      if (s.scope.type === 'items') return s.scope.itemIds.includes(item.id);
      return false;
    });
    if (!sale) return undefined;
    return { price: Math.max(1, Math.round(item.pts * (1 - sale.discountPct / 100))), expiresAt: sale.expiresAt };
  }, [activeSales]);

  const allCategories = useMemo(() => {
    const cats = new Set(items.map(i => i.category));
    return Array.from(cats).sort();
  }, [items]);

  const allWithAll = useMemo(() => ['All', ...allCategories], [allCategories]);

  // Top 2 most-purchased items across all categories
  const popularIds = useMemo(() => {
    return [...items]
      .sort((a, b) => b.purchaseCount - a.purchaseCount)
      .slice(0, 2)
      .map(i => i.id);
  }, [items]);

  const sorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = items.filter(i =>
      (category === 'All' || i.category === category) &&
      (!q || i.name.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q) || i.category.toLowerCase().includes(q))
    );

    const canBuyFn  = (i: MarketItem) => (i.stock === null || i.stock > 0) && member.balance >= i.pts && (i.eligibleMembers.length === 0 || i.eligibleMembers.includes(currentUser));
    const isOOS     = (i: MarketItem) => i.stock !== null && i.stock <= 0;

    const buyable   = filtered.filter(i => canBuyFn(i));
    const cantBuy   = filtered.filter(i => !canBuyFn(i) && !isOOS(i));
    const outStock  = filtered.filter(i => isOOS(i));

    const sortFn = ptsSortDir
      ? (a: MarketItem, b: MarketItem) => ptsSortDir === 'asc' ? a.pts - b.pts : b.pts - a.pts
      : null;

    if (sortFn) {
      // When pts sort is active, sort all three tiers independently but keep hierarchy
      return [...buyable.sort(sortFn), ...cantBuy.sort(sortFn), ...outStock.sort(sortFn)];
    }

    // Default: popular float to top of buyable tier
    const popular = buyable.filter(i => popularIds.includes(i.id)).sort((a, b) => b.purchaseCount - a.purchaseCount);
    const rest    = buyable.filter(i => !popularIds.includes(i.id));
    return [...popular, ...rest, ...cantBuy, ...outStock];
  }, [items, category, popularIds, ptsSortDir, member.balance, currentUser, searchQuery]);

  const handleBuy = useCallback((item: MarketItem, effectivePrice: number) => {
    setRedeemState({ item, price: effectivePrice });
  }, []);

  const handleRedeemDone = useCallback(() => {
    if (!redeemState) return;
    const { item } = redeemState;
    if (item.stock !== null) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, stock: (i.stock ?? 1) - 1, purchaseCount: i.purchaseCount + 1 } : i));
    } else {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, purchaseCount: i.purchaseCount + 1 } : i));
    }
    setRedeemState(null);
  }, [redeemState]);

  const handleSaveNew = useCallback((data: Omit<MarketItem, 'id' | 'priceHistory' | 'createdBy' | 'purchaseCount'>) => {
    const id = `custom-${Date.now()}`;
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    setItems(prev => [...prev, { ...data, id, createdBy: currentUser, purchaseCount: 0, priceHistory: [{ date: today, pts: data.pts }] }]);
  }, [currentUser]);

  const handleSaveEdit = useCallback((data: Omit<MarketItem, 'id' | 'priceHistory' | 'createdBy' | 'purchaseCount'>) => {
    if (!editItem) return;
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    setItems(prev => prev.map(i => {
      if (i.id !== editItem.id) return i;
      const newHistory = data.pts !== i.pts ? [...i.priceHistory, { date: today, pts: data.pts }] : i.priceHistory;
      return { ...i, ...data, priceHistory: newHistory };
    }));
    setEditItem(null);
  }, [editItem]);

  const handleDelete = useCallback((item: MarketItem) => {
    Alert.alert(`Delete "${item.name}"?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setItems(prev => prev.filter(i => i.id !== item.id));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }},
    ]);
  }, []);

  const handleRestock = useCallback((item: MarketItem, qty: number) => {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, stock: (i.stock ?? 0) + qty } : i));
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView style={{ flex: 1 }}>

        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: C.subtext, textTransform: 'uppercase', letterSpacing: 1 }}>HomeHuddle</Text>
            <Text style={{ fontSize: 28, fontWeight: '900', color: C.text, marginTop: 1 }}>Market</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/wallet'); }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accent + '40', borderRadius: 20, paddingHorizontal: 14, height: 38 }}
            >
              <Wallet size={15} color={C.accent} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: C.accent }}>Wallet</Text>
              <ChevronRight size={13} color={C.accent} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Member selector */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 24, gap: 8, marginBottom: 14 }}>
          {FAMILY_MEMBERS.map(m => {
            const active = selectedMember === m.name;
            return (
              <TouchableOpacity
                key={m.name}
                onPress={() => { Haptics.selectionAsync(); setSelectedMember(m.name); }}
                style={[C.shadow, {
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  paddingHorizontal: 14, paddingVertical: 9, borderRadius: 50,
                  backgroundColor: active ? m.color : C.card,
                  borderWidth: 1, borderColor: active ? m.color : C.cardBorder,
                }]}
              >
                <Text style={{ fontSize: 20, lineHeight: 24 }}>{m.avatar}</Text>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: active ? '#fff' : C.text, lineHeight: 20 }}>{m.name}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: active ? 'rgba(255,255,255,0.75)' : C.subtext }}>
                    {m.balance} pts
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Balance banner */}
        <View style={[C.shadow, {
          marginHorizontal: 24, marginBottom: 14,
          backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.cardBorder,
          flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, gap: 12,
        }]}>
          <Text style={{ fontSize: 24 }}>{member.avatar}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: C.subtext, fontWeight: '600' }}>{member.name}'s balance</Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: C.text, letterSpacing: -0.5 }}>
              {member.balance} <Text style={{ fontSize: 13, color: C.subtext, fontWeight: '600' }}>pts</Text>
            </Text>
          </View>
        </View>

        {/* Category filter — fixed height row, horizontal scroll */}
        <FlatList
          horizontal
          data={allWithAll}
          keyExtractor={cat => cat}
          extraData={category}
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, flexShrink: 0, height: 36, marginBottom: 14 }}
          contentContainerStyle={{ paddingHorizontal: 24 }}
          getItemLayout={(_data, index) => ({ length: 100, offset: 100 * index, index })}
          renderItem={({ item: cat, index: idx }) => {
            const active = category === cat;
            return (
              <TouchableOpacity
                onPress={() => { Haptics.selectionAsync(); setCategory(cat); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
                  paddingHorizontal: 13, height: 36, borderRadius: 20,
                  backgroundColor: active ? C.accent : C.card,
                  borderWidth: 1, borderColor: active ? C.accent : C.cardBorder,
                  marginRight: idx < allWithAll.length - 1 ? 8 : 0,
                }}
              >
                <Text style={{ fontSize: 13, lineHeight: 18, includeFontPadding: false }}>{cat === 'All' ? '🏪' : (CAT_ICONS[cat] ?? '📦')}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', lineHeight: 18, includeFontPadding: false, color: active ? '#fff' : C.subtext }}>{cat}</Text>
              </TouchableOpacity>
            );
          }}
        />

        {/* Grid */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}>
          {/* Search bar */}
          {searching && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.muted, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, gap: 8 }}>
              <Search size={14} color={C.subtext} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search items…"
                placeholderTextColor={C.subtext}
                style={{ flex: 1, fontSize: 14, color: C.text }}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={14} color={C.subtext} />
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <Tag size={13} color={C.subtext} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.subtext, textTransform: 'uppercase', letterSpacing: 0.8, flex: 1 }}>
              {sorted.length} items · {category}
            </Text>
            <TouchableOpacity
              onPress={() => { setSearching(s => !s); setSearchQuery(''); Haptics.selectionAsync(); }}
              style={{ padding: 4, marginRight: 2 }}
            >
              {searching ? <X size={16} color={C.subtext} /> : <Search size={16} color={C.subtext} />}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                setPtsSortDir(d => d === null ? 'asc' : d === 'asc' ? 'desc' : null);
              }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
                backgroundColor: ptsSortDir ? C.accentBg : C.muted,
                borderWidth: 1, borderColor: ptsSortDir ? C.accent + '50' : C.mutedBorder,
              }}
            >
              <Zap size={11} color={ptsSortDir ? C.accent : C.subtext} />
              <Text style={{ fontSize: 11, fontWeight: '800', color: ptsSortDir ? C.accent : C.subtext }}>pts</Text>
              {ptsSortDir === 'asc'  && <ChevronUp   size={11} color={C.accent} />}
              {ptsSortDir === 'desc' && <ChevronDown  size={11} color={C.accent} />}
              {ptsSortDir === null   && <ChevronDown  size={11} color={C.subtext} />}
            </TouchableOpacity>
          </View>

          <View style={{ gap: 0 }}>
            {sorted.map((item, idx) => (
              <Animated.View key={`${category}-${item.id}`} entering={FadeInDown.delay(idx * 40).springify().damping(22)}>
                <MarketCard
                  item={item}
                  memberBalance={member.balance}
                  currentUser={currentUser}
                  onBuy={handleBuy}
                  onLongPress={setLongPressItem}
                  isPopular={popularIds.includes(item.id)}
                  salePrice={getSaleInfo(item)?.price}
                  saleExpiresAt={getSaleInfo(item)?.expiresAt}
                />
              </Animated.View>
            ))}
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* Speed Dial FAB */}
      {isFabOpen && <Pressable onPress={() => setIsFabOpen(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />}
      <View style={{ position: 'absolute', right: 24, bottom: 100, alignItems: 'flex-end' }}>
        {isFabOpen && (
          <>
            <View style={{ marginBottom: 12 }}>
              <Animated.View entering={FadeInDown.delay(40)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                <View style={{ backgroundColor: 'white', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginRight: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>New Flash Sale</Text>
                </View>
                <TouchableOpacity
                  onPress={() => { setIsFabOpen(false); setShowFlashSale(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center', shadowColor: C.gold, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}
                >
                  <Bolt size={22} color="white" />
                </TouchableOpacity>
              </Animated.View>
            </View>
            <View style={{ marginBottom: 14 }}>
              <Animated.View entering={FadeInDown} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                <View style={{ backgroundColor: 'white', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginRight: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>New Item</Text>
                </View>
                <TouchableOpacity
                  onPress={() => { setIsFabOpen(false); setShowAdd(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}
                >
                  <ListPlus size={22} color="white" />
                </TouchableOpacity>
              </Animated.View>
            </View>
          </>
        )}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setIsFabOpen(!isFabOpen); }}
          style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', shadowColor: C.accent, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 6 }}
        >
          {isFabOpen ? <X size={26} color="white" strokeWidth={2.5} /> : <Plus size={30} color="white" strokeWidth={2.5} />}
        </TouchableOpacity>
      </View>

      {/* Modals */}
      {showAdd && (
        <ItemFormModal
          categories={allCategories}
          onSave={handleSaveNew}
          onClose={() => setShowAdd(false)}
          currentUser={currentUser}
        />
      )}
      {editItem && (
        <ItemFormModal
          initial={editItem}
          categories={allCategories}
          onSave={handleSaveEdit}
          onClose={() => setEditItem(null)}
          currentUser={currentUser}
        />
      )}
      {longPressItem && (
        <LongPressMenu
          item={longPressItem}
          currentUser={currentUser}
          canCurate={longPressItem.curators.includes(currentUser) || longPressItem.createdBy === currentUser}
          onEdit={() => setEditItem(longPressItem)}
          onRestock={() => setRestockItem(longPressItem)}
          onDelete={() => handleDelete(longPressItem)}
          onPriceHistory={() => setPriceHistItem(longPressItem)}
          onClose={() => setLongPressItem(null)}
        />
      )}
      {restockItem && (
        <RestockModal
          item={restockItem}
          onRestock={qty => handleRestock(restockItem, qty)}
          onClose={() => setRestockItem(null)}
        />
      )}
      {priceHistItem && (
        <PriceHistoryModal
          item={priceHistItem}
          onClose={() => setPriceHistItem(null)}
        />
      )}
      {showFlashSale && (
        <FlashSaleModal
          items={items}
          categories={allCategories}
          onSave={sale => setFlashSales(prev => [...prev, { ...sale, id: `fs-${Date.now()}` }])}
          onClose={() => setShowFlashSale(false)}
        />
      )}
      {redeemState && (
        <RedeemOverlay
          item={redeemState.item}
          effectivePrice={redeemState.price}
          memberBalance={member.balance}
          onDone={handleRedeemDone}
        />
      )}
    </View>
  );
}
