import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Dimensions,
  TextInput, Modal, Alert, Image, LayoutAnimation, Pressable,
  Animated as RNAnimated
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming,
  FadeInDown, FadeOut, Layout, withDelay, Easing, useAnimatedProps,
} from 'react-native-reanimated';
import {
  ShoppingCart, Plus, X, Flame, CheckCircle2,
  Trash2, Sparkles,
  Zap, History, ChevronDown, GripVertical, Check, Tag,
} from 'lucide-react-native';
import { GestureHandlerRootView, PanGestureHandler, State, Swipeable } from 'react-native-gesture-handler';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
import { classify, searchSuggestions, CATEGORY_COLORS, type GroceryCategory } from '../../../utils/groceryClassifier';
import { useHuddleStore } from '../../../store/huddleStore';

const { width, height } = Dimensions.get('window');
const POPULAR_UNITS = ['Item', 'Bag', 'Lb', 'Oz', 'Kg', 'G', 'Ml', 'L', 'Can', 'Jar', 'Box', 'Bunch', 'Loaf', 'Dozen', 'Gal', 'Qt', 'Pt'];

function formatUnit(qty: string | number, unit: string): string {
  if (!unit) return '';
  const count = parseFloat(String(qty)) || 1;
  const u = unit.trim();
  const low = u.toLowerCase();

  // Official SI: L is capitalized, mL has capitalized L.
  // Others typically lowercase.
  const invariant: Record<string, string> = {
    'kg': 'kg', 'g': 'g', 'ml': 'mL', 'l': 'L', 'oz': 'oz', 'dozen': 'dozen', 'qt': 'qt', 'pt': 'pt', 'gal': 'gal'
  };
  
  const knownUnits: Record<string, { s: string, p: string }> = {
    'item': { s: 'item', p: 'items' },
    'bag': { s: 'bag', p: 'bags' },
    'lb': { s: 'lb', p: 'lbs' },
    'can': { s: 'can', p: 'cans' },
    'jar': { s: 'jar', p: 'jars' },
    'box': { s: 'box', p: 'boxes' },
    'bunch': { s: 'bunch', p: 'bunches' },
    'loaf': { s: 'loaf', p: 'loaves' },
    'container': { s: 'container', p: 'containers' },
    'pack': { s: 'pack', p: 'packs' },
    'bottle': { s: 'bottle', p: 'bottles' },
  };

  if (invariant[low]) {
    const res = invariant[low];
    if (low === 'lbs' && count === 1) return 'lb';
    return res;
  }

  const match = Object.values(knownUnits).find(m => m.s === low || m.p === low);
  if (match) {
    return count === 1 ? match.s : match.p;
  }

  return u.toLowerCase();
}

const SNAP_SPRING = { damping: 30, stiffness: 300, mass: 0.1 };
const TRANSITION_CONFIG = { duration: 250 };
const CHORE_RING_R = 10;
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
      <Circle cx={13} cy={13} r={CHORE_RING_R} stroke="rgba(255,255,255,0.2)" strokeWidth={2.5} fill="none" />
      <AnimatedCircle
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

const GOLDEN_SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.04,
  shadowRadius: 12,
  elevation: 2,
};

type RestockItem = {
  id: string;
  name: string;
  category: string;
  addedBy: { name: string; avatar: string };
  isUrgent: boolean;
  isStaple: boolean;
  isCompleted: boolean;
  addedAt: number;
  completedAt?: number;
  qty?: number;
  unit?: string;
  store?: string;
  brand?: string;
  note?: string;
  tags?: string[];
};

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function toTitleCase(str: string): string {
  if (!str) return '';
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

// --- FILTER BAR ---
const FilterBar = React.memo(({
  allStores, allBrands, allTags,
  filterStores, filterBrands, filterTags, filterUrgent,
  onToggleStore, onToggleBrand, onToggleTag, onToggleUrgent, onClear, hasFilters,
}: {
  allStores: string[], allBrands: string[], allTags: string[],
  filterStores: string[], filterBrands: string[], filterTags: string[],
  filterUrgent: boolean,
  onToggleStore: (s: string) => void,
  onToggleBrand: (b: string) => void,
  onToggleTag: (t: string) => void,
  onToggleUrgent: () => void,
  onClear: () => void,
  hasFilters: boolean,
}) => {
  const [openDropdown, setOpenDropdown] = useState<'store' | 'brand' | 'tags' | null>(null);

  const pills: { key: 'store' | 'brand' | 'tags'; label: string; count: number; options: string[]; active: string[]; onToggle: (v: string) => void }[] = [
    { key: 'store', label: 'Store', count: filterStores.length, options: allStores, active: filterStores, onToggle: onToggleStore },
    { key: 'brand', label: 'Brand', count: filterBrands.length, options: allBrands, active: filterBrands, onToggle: onToggleBrand },
    { key: 'tags', label: 'Tags', count: filterTags.length, options: allTags, active: filterTags, onToggle: onToggleTag },
  ];

  return (
    <View style={{ marginBottom: 8 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, gap: 8 }}>
        {pills.map(pill => (
          <TouchableOpacity
            key={pill.key}
            onPress={() => { setOpenDropdown(openDropdown === pill.key ? null : pill.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: pill.count > 0 ? '#0F172A' : '#F1F5F9' }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: pill.count > 0 ? 'white' : '#64748B' }}>{pill.label}</Text>
            {pill.count > 0 && <View style={{ backgroundColor: '#6366F1', borderRadius: 6, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}><Text style={{ fontSize: 9, fontWeight: '900', color: 'white' }}>{pill.count}</Text></View>}
            <ChevronDown size={12} color={pill.count > 0 ? 'white' : '#94A3B8'} style={{ transform: [{ rotate: openDropdown === pill.key ? '180deg' : '0deg' }] }} />
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={() => { setOpenDropdown(null); onToggleUrgent(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: filterUrgent ? '#E11D48' : '#F1F5F9' }}
        >
          <Text style={{ fontSize: 11, fontWeight: '800', color: filterUrgent ? 'white' : '#64748B' }}>Urgent</Text>
        </TouchableOpacity>
        {hasFilters && (
          <TouchableOpacity onPress={() => { setOpenDropdown(null); onClear(); }} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#FFF1F2' }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#E11D48' }}>Clear</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {openDropdown && (() => {
        const pill = pills.find(p => p.key === openDropdown)!;
        if (pill.options.length === 0) return null;
        return (
          <View style={{ marginHorizontal: 24, marginTop: 6, backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 }}>
            {pill.options.map((opt, i) => {
              const isActive = pill.active.includes(opt);
              return (
                <TouchableOpacity
                  key={opt}
                  onPress={() => { pill.onToggle(opt); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: i < pill.options.length - 1 ? 1 : 0, borderBottomColor: '#F1F5F9', backgroundColor: isActive ? '#F8FAFF' : 'white' }}
                >
                  <Text style={{ fontSize: 14, fontWeight: isActive ? '700' : '500', color: isActive ? '#4F46E5' : '#1E293B' }}>{opt}</Text>
                  {isActive && <Check size={16} color="#4F46E5" />}
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })()}
    </View>
  );
});

// --- TO-BUY ITEM COMPONENT ---
const ToBuyItem = React.memo(({
  item, onToggle, onRemove, onEdit, isDragging: isParentDragging = false,
  isPending = false
}: {
  item: RestockItem,
  onToggle: (id: string) => void,
  onRemove: (id: string) => void,
  onEdit: (item: RestockItem) => void,
  isDragging?: boolean,
  isPending?: boolean
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<RestockItem>(item);
  const [tagInput, setTagInput] = useState('');
  const [showMoreEdit, setShowMoreEdit] = useState(false);

  useEffect(() => { setEditData(item); }, [item]);

  const toggleEdit = () => {
    setIsEditing(!isEditing);
    setShowMoreEdit(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const addTag = () => {
    if (tagInput.trim() && !editData.tags?.includes(tagInput.trim()) && (editData.tags || []).length < 5) {
      setEditData(d => ({ ...d, tags: [...(d.tags || []), tagInput.trim()] }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setEditData(d => ({ ...d, tags: (d.tags || []).filter(t => t !== tag) }));
  };

  const circleScale = useSharedValue(1);
  const isVisualCompleted = item.isCompleted || isPending;

  const handleToggle = () => {
    onToggle(item.id);
  };

  const circleAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }]
  }));

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = (progress: any, dragX: any) => {
    const width = 70;
    const trans = dragX.interpolate({
      inputRange: [-width, 0],
      outputRange: [0, width],
      extrapolate: 'clamp',
    });

    return (
      <RNAnimated.View style={{ width, transform: [{ translateX: trans }] }}>
        <TouchableOpacity
          onPress={() => {
            if (isConfirmingDelete) {
              onRemove(item.id);
              swipeableRef.current?.close();
            } else {
              setIsConfirmingDelete(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
          }}
          activeOpacity={0.8}
          style={{
            backgroundColor: isConfirmingDelete ? '#E11D48' : '#FFF1F2',
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            borderBottomWidth: 1,
            borderBottomColor: '#F1F5F9',
          }}
        >
          <Trash2 size={20} color={isConfirmingDelete ? 'white' : '#E11D48'} />
          <Text style={{
            color: isConfirmingDelete ? 'white' : '#E11D48',
            fontSize: 10,
            fontWeight: '900',
            marginTop: 4
          }}>
            {isConfirmingDelete ? 'CONFIRM' : 'DELETE'}
          </Text>
        </TouchableOpacity>
      </RNAnimated.View>
    );
  };

  const itemContent = (
    <View style={{
      backgroundColor: 'white',
      borderBottomWidth: 1,
      borderBottomColor: '#F1F5F9',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          onPress={handleToggle}
          style={{ padding: 16, paddingRight: 8 }}
        >
          <Animated.View style={circleAnimStyle}>
            {isVisualCompleted ? (
              <CheckCircle2 size={24} color={item.isCompleted ? "#10B981" : "#94A3B8"} />
            ) : (
              <View style={{
                width: 24, height: 24, borderRadius: 12, borderWidth: 2,
                borderColor: item.isUrgent ? '#FDA4AF' : '#E2E8F0',
                backgroundColor: 'white'
              }} />
            )}
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={isVisualCompleted ? undefined : toggleEdit}
          disabled={isVisualCompleted}
          style={{ flex: 1, paddingVertical: 12, paddingRight: 16, gap: 4 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
              <Text style={{
                fontSize: 16, fontWeight: '700', color: isVisualCompleted ? '#94A3B8' : '#1E293B',
                textDecorationLine: isVisualCompleted ? 'line-through' : 'none',
                opacity: isVisualCompleted ? 0.6 : 1, flexShrink: 1
              }} numberOfLines={1}>
                {item.name}
              </Text>
              {(item.qty || 0) > 0 && (
                <Text style={{ fontSize: 15, fontWeight: '800', color: isVisualCompleted ? '#CBD5E1' : '#64748B' }}>
                  {item.qty}{item.unit ? ` ${formatUnit(item.qty ?? 1, item.unit)}` : ''}
                </Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600' }}>{item.addedBy.name.split(' ')[0]}</Text>
              <Text style={{ fontSize: 11, color: '#CBD5E1' }}>{timeAgo(item.addedAt)}</Text>
              {!isVisualCompleted && <ChevronDown size={14} color="#CBD5E1" style={{ transform: [{ rotate: isEditing ? '180deg' : '0deg' }] }} />}
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {item.store && (
              <View style={{ backgroundColor: isVisualCompleted ? '#F8FAFC' : '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <ShoppingCart size={10} color={isVisualCompleted ? '#CBD5E1' : '#64748B'} />
                <Text style={{ fontSize: 10, fontWeight: '700', color: isVisualCompleted ? '#CBD5E1' : '#64748B' }}>{item.store}</Text>
              </View>
            )}
            {item.brand && (
              <View style={{ backgroundColor: isVisualCompleted ? '#F8FAFC' : '#F0FDF4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: isVisualCompleted ? '#CBD5E1' : '#16A34A' }}>{item.brand}</Text>
              </View>
            )}
            {(item.tags || []).slice(0, 3).map(tag => (
              <View key={tag} style={{ backgroundColor: isVisualCompleted ? '#F8FAFC' : '#EEF2FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: isVisualCompleted ? '#CBD5E1' : '#4F46E5' }}>{tag}</Text>
              </View>
            ))}
            {item.isUrgent && (
              <View style={{ backgroundColor: isVisualCompleted ? '#F8FAFC' : '#FFE4E6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: isVisualCompleted ? '#CBD5E1' : '#E11D48' }}>URGENT</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {isEditing && (
        <View style={{ backgroundColor: 'white', padding: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <View style={{ flex: 1, height: 40, backgroundColor: '#F8FAFC', borderRadius: 12, justifyContent: 'center' }}>
              <TextInput
                value={String(editData.qty || '')}
                onChangeText={t => {
                  const cleaned = t.replace(/[^0-9.]/g, '');
                  const parts = cleaned.split('.');
                  if (parts.length > 2) return;
                  if (parts[1]?.length > 2) return;
                  setEditData(d => ({ ...d, qty: parseFloat(cleaned) || 0 }));
                }}
                keyboardType="decimal-pad"
                style={{ flex: 1, textAlign: 'center', fontWeight: '800', paddingVertical: 0 }}
                placeholder="1"
              />
            </View>
            <View style={{ flex: 1.5, height: 40, backgroundColor: '#F8FAFC', borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                placeholder="Unit"
                value={editData.unit}
                onChangeText={t => setEditData(d => ({ ...d, unit: t }))}
                style={{ flex: 1, paddingHorizontal: 12, fontWeight: '700', paddingVertical: 0 }}
              />
              {!!editData.unit && (
                <TouchableOpacity onPress={() => setEditData(d => ({ ...d, unit: '' }))} style={{ padding: 8 }}>
                  <X size={14} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              onPress={() => { setEditData(d => ({ ...d, isUrgent: !d.isUrgent })); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={{ width: 40, height: 40, backgroundColor: editData.isUrgent ? '#FEE2E2' : '#F8FAFC', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: editData.isUrgent ? 1 : 0, borderColor: '#FCA5A5' }}
            >
              <Text style={{ fontSize: 16 }}>🔥</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowMoreEdit(!showMoreEdit)}
              style={{ width: 40, height: 40, backgroundColor: '#F8FAFC', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
            >
              <ChevronDown size={20} color="#64748B" style={{ transform: [{ rotate: showMoreEdit ? '180deg' : '0deg' }] }} />
            </TouchableOpacity>
          </View>

          <View style={{ marginBottom: 12 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {POPULAR_UNITS.filter(u => !editData.unit || u.toLowerCase().includes(editData.unit.toLowerCase())).map(u => (
                <TouchableOpacity key={u} onPress={() => setEditData(d => ({ ...d, unit: formatUnit(editData.qty || 1, u) }))} style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, marginRight: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>{formatUnit(editData.qty || 1, u)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {showMoreEdit && (
            <Animated.View entering={FadeInDown.duration(200)} style={{ gap: 12, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1, height: 40, backgroundColor: '#F8FAFC', borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    placeholder="Store"
                    value={editData.store}
                    onChangeText={t => setEditData(d => ({ ...d, store: t }))}
                    style={{ flex: 1, paddingHorizontal: 12, fontWeight: '700', paddingVertical: 0 }}
                  />
                  {!!editData.store && (
                    <TouchableOpacity onPress={() => setEditData(d => ({ ...d, store: '' }))} style={{ padding: 8 }}>
                      <X size={14} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={{ flex: 1, height: 40, backgroundColor: '#F8FAFC', borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    placeholder="Brand"
                    value={editData.brand}
                    onChangeText={t => setEditData(d => ({ ...d, brand: t }))}
                    style={{ flex: 1, paddingHorizontal: 12, fontWeight: '700', paddingVertical: 0 }}
                  />
                  {!!editData.brand && (
                    <TouchableOpacity onPress={() => setEditData(d => ({ ...d, brand: '' }))} style={{ padding: 8 }}>
                      <X size={14} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {(editData.tags || []).map(tag => (
                    <TouchableOpacity key={tag} onPress={() => removeTag(tag)} style={{ backgroundColor: 'white', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6, ...GOLDEN_SHADOW }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#6366F1' }}>{tag}</Text>
                      <X size={12} color="#6366F1" />
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  placeholder="Add tags... (Enter)"
                  value={tagInput}
                  onChangeText={setTagInput}
                  onSubmitEditing={addTag}
                  style={{ fontSize: 14, fontWeight: '600', color: '#1E293B', height: 32 }}
                />
              </View>

              <TextInput
                placeholder="Notes..."
                value={editData.note}
                onChangeText={t => setEditData(d => ({ ...d, note: t }))}
                style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, minHeight: 56 }}
                multiline
              />
            </Animated.View>
          )}

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => { if (!item.isCompleted) { onEdit(editData); } setIsEditing(false); }} style={{ flex: 1, backgroundColor: '#0F172A', paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '800' }}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onRemove(item.id)} style={{ width: 50, backgroundColor: '#FFF1F2', borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={20} color="#E11D44" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View>
      {!item.isCompleted ? (
        <Swipeable
          ref={swipeableRef}
          renderRightActions={renderRightActions}
          onSwipeableOpen={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
          onSwipeableClose={() => setIsConfirmingDelete(false)}
          friction={2}
          overshootRight={false}
        >
          {itemContent}
        </Swipeable>
      ) : itemContent}
    </View>
  );
});

// --- STAPLES CAROUSEL ---
const FALLBACK_STAPLES = ['Milk', 'Eggs', 'Bread', 'Bananas', 'Coffee', 'Toilet Paper'];

const StaplesCarousel = React.memo(({ onSelect, completedItems }: { onSelect: (name: string) => void; completedItems: RestockItem[] }) => {
  const topNames = useMemo(() => {
    const freq: Record<string, number> = {};
    completedItems.forEach(i => { freq[i.name] = (freq[i.name] ?? 0) + 1; });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n]) => n);
    if (sorted.length >= 4) return sorted;
    const extras = FALLBACK_STAPLES.filter(n => !sorted.includes(n));
    return [...sorted, ...extras].slice(0, 8);
  }, [completedItems]);
  const staples = topNames.map(name => ({ name }));
  return (
    <View style={{ marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>Frequent Items</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
        {staples.map((s, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => { onSelect(s.name); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={{
              marginRight: 6,
              backgroundColor: 'white',
              paddingHorizontal: 8,
              paddingVertical: 5,
              borderRadius: 6,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#E2E8F0',
              ...GOLDEN_SHADOW
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#1E293B' }}>{toTitleCase(s.name)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
});

// --- PANTRY CHECK MODAL ---
const PantryCheck = React.memo(({ ingredients, onApprove, onCancel }: { ingredients: string[]; onApprove: (selected: string[]) => void; onCancel: () => void }) => {
  const [selected, setSelected] = useState<string[]>(ingredients);
  const toggle = (ing: string) => {
    setSelected(prev => prev.includes(ing) ? prev.filter(i => i !== ing) : [...prev, ing]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  return (
    <Modal visible transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 32, paddingBottom: 48 }}>
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#0F172A', textAlign: 'center', marginBottom: 8 }}>Pantry Check</Text>
          <Text style={{ color: '#94A3B8', textAlign: 'center', marginBottom: 24 }}>Check what you NEED to buy</Text>
          <ScrollView style={{ maxHeight: 400, marginBottom: 24 }}>
            {ingredients.map((ing, i) => (
              <TouchableOpacity key={i} onPress={() => toggle(ing)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                <View style={{ width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: selected.includes(ing) ? '#6366F1' : '#E2E8F0', backgroundColor: selected.includes(ing) ? '#6366F1' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {selected.includes(ing) && <Check size={16} color="white" />}
                </View>
                <Text style={{ marginLeft: 16, fontSize: 17, fontWeight: '700', color: selected.includes(ing) ? '#1E293B' : '#94A3B8' }}>{ing}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={onCancel} style={{ flex: 1, backgroundColor: '#F1F5F9', paddingVertical: 16, borderRadius: 16, alignItems: 'center' }}>
              <Text style={{ fontWeight: '800', color: '#64748B' }}>SKIP</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onApprove(selected)} style={{ flex: 2, backgroundColor: '#6366F1', paddingVertical: 16, borderRadius: 16, alignItems: 'center' }}>
              <Text style={{ fontWeight: '800', color: 'white' }}>ADD TO LIST</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

// --- DRAGGABLE CATEGORY SECTION ---
const DraggableCategorySection = React.memo(({
  cat, catItems, idx, total, isExpanded, isPlaceholder, onToggleExpand, onDragStart, onDragEnd, onReorder, toggleItem, deleteItem, updateRestockItem, items, onReorderItems,
  pendingIds = new Set()
}: {
  cat: string,
  catItems: RestockItem[],
  idx: number,
  total: number,
  isExpanded: boolean,
  isPlaceholder: boolean,
  onToggleExpand: () => void,
  onDragStart: () => void,
  onDragEnd: () => void,
  onReorder: (dir: number) => void,
  toggleItem: (id: string) => void,
  deleteItem: (id: string) => void,
  updateRestockItem: (id: string, updates: any) => void,
  items: RestockItem[],
  onReorderItems: (cat: string, from: number, to: number) => void,
  pendingIds?: Set<string>
}) => {
  const dragY = useSharedValue(0);
  const positionOffset = useSharedValue(0);
  const isDraggingInternal = useSharedValue(false);
  const prevIdx = useRef(idx);
  const catReorderCooldown = useRef(false);
  const catTranslationAtLastReorder = useRef(0);

  useEffect(() => {
    if (isDraggingInternal.value && prevIdx.current !== idx) {
      const jump = (prevIdx.current - idx) * 72;
      positionOffset.value = positionOffset.value + jump;
    }
    prevIdx.current = idx;
  }, [idx]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: dragY.value + positionOffset.value },
    ],
    zIndex: isDraggingInternal.value ? 1000 : 1,
    backgroundColor: 'white',
    opacity: isPlaceholder ? 0.3 : 1,
    shadowColor: '#000',
    shadowOpacity: withTiming(isDraggingInternal.value ? 0.15 : 0),
    shadowRadius: 20,
    elevation: isDraggingInternal.value ? 10 : 0,
  }));

  return (
    <Animated.View style={[{ borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }, animatedStyle]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <PanGestureHandler
          activateAfterLongPress={200}
          onGestureEvent={({ nativeEvent }) => {
            if (!isDraggingInternal.value) {
              isDraggingInternal.value = true;
              catTranslationAtLastReorder.current = 0;
              onDragStart();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }
            dragY.value = nativeEvent.translationY - catTranslationAtLastReorder.current;

            if (!catReorderCooldown.current && Math.abs(dragY.value) > 36) {
              const dir = dragY.value > 0 ? 1 : -1;
              if ((dir > 0 && idx < total - 1) || (dir < 0 && idx > 0)) {
                catReorderCooldown.current = true;
                catTranslationAtLastReorder.current = nativeEvent.translationY;
                dragY.value = 0;
                onReorder(dir);
                setTimeout(() => { catReorderCooldown.current = false; }, 200);
              }
            }
          }}
          onHandlerStateChange={({ nativeEvent }) => {
            if (nativeEvent.state === State.END || nativeEvent.state === State.CANCELLED) {
              isDraggingInternal.value = false;
              onDragEnd();
              dragY.value = withTiming(0, { duration: 200 });
              positionOffset.value = withTiming(0, { duration: 200 });
              catReorderCooldown.current = false;
              catTranslationAtLastReorder.current = 0;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 8 }}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onToggleExpand(); }}
            disabled={isDraggingInternal.value || isPlaceholder}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: (CATEGORY_COLORS as any)[cat] ?? '#CBD5E1' }} />
            <Text style={{ flex: 1, fontSize: 11, fontWeight: '900', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1.2 }}>{cat}</Text>
            <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#94A3B8' }}>{catItems.length}</Text>
            </View>
            <ChevronDown size={12} color="#CBD5E1" style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }} />
          </TouchableOpacity>
        </PanGestureHandler>
      </View>
      {isExpanded && !isPlaceholder && (
        <View style={{ paddingLeft: 16 }}>
          {catItems.map((item, itemIdx) => (
            <DraggableRestockItem
              key={item.id}
              item={item}
              idx={itemIdx}
              total={catItems.length}
              onToggle={toggleItem}
              onRemove={deleteItem}
              onEdit={(updates) => updateRestockItem(updates.id, updates)}
              onReorder={(dir) => onReorderItems(cat, itemIdx, itemIdx + dir)}
              isPending={pendingIds.has(item.id)}
            />
          ))}
        </View>
      )}
    </Animated.View>
  );
});

// --- DRAGGABLE RESTOCK ITEM ---
const DraggableRestockItem = React.memo(({
  item, idx, total, onToggle, onRemove, onEdit, onReorder, isPending = false
}: {
  item: RestockItem,
  idx: number,
  total: number,
  onToggle: (id: string) => void,
  onRemove: (id: string) => void,
  onEdit: (item: RestockItem) => void,
  onReorder: (dir: number) => void,
  isPending?: boolean
}) => {
  const dragY = useSharedValue(0);
  const positionOffset = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const prevIdx = useRef(idx);
  const measuredHeight = useRef(60);
  const reorderCooldown = useRef(false);
  const translationAtLastReorder = useRef(0);

  useEffect(() => {
    if (isDragging.value && prevIdx.current !== idx) {
      const jump = (prevIdx.current - idx) * measuredHeight.current;
      positionOffset.value = positionOffset.value + jump;
    }
    prevIdx.current = idx;
  }, [idx]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dragY.value + positionOffset.value }],
    zIndex: isDragging.value ? 2000 : 1,
    backgroundColor: isDragging.value ? '#F8FAFC' : 'transparent',
    opacity: withTiming(isDragging.value ? 0.8 : 1, { duration: 150 }),
  }));

  return (
    <Animated.View style={animatedStyle} onLayout={e => { measuredHeight.current = e.nativeEvent.layout.height; }}>
      <PanGestureHandler
        activateAfterLongPress={200}
        onGestureEvent={({ nativeEvent }) => {
          if (!isDragging.value) {
            isDragging.value = true;
            translationAtLastReorder.current = 0;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          dragY.value = nativeEvent.translationY - translationAtLastReorder.current;
          const threshold = measuredHeight.current * 0.5;
          if (!reorderCooldown.current && Math.abs(dragY.value) > threshold) {
            const dir = dragY.value > 0 ? 1 : -1;
            if ((dir > 0 && idx < total - 1) || (dir < 0 && idx > 0)) {
              reorderCooldown.current = true;
              translationAtLastReorder.current = nativeEvent.translationY;
              dragY.value = 0;
              onReorder(dir);
              setTimeout(() => { reorderCooldown.current = false; }, 200);
            }
          }
        }}
        onHandlerStateChange={({ nativeEvent }) => {
          if (nativeEvent.state === State.END || nativeEvent.state === State.CANCELLED) {
            isDragging.value = false;
            dragY.value = withTiming(0, { duration: 200 });
            positionOffset.value = withTiming(0, { duration: 200 });
            reorderCooldown.current = false;
            translationAtLastReorder.current = 0;
          }
        }}
      >
        <Animated.View style={{ flex: 1 }}>
          <ToBuyItem
            item={item}
            onToggle={onToggle}
            onRemove={onRemove}
            onEdit={onEdit}
            isDragging={isDragging.value}
            isPending={isPending}
          />
        </Animated.View>
      </PanGestureHandler>
    </Animated.View>
  );
});

// --- MAIN SCREEN ---
export default function RestockScreen() {
  const insets = useSafeAreaInsets();
  const {
    restockItems: items,
    toggleRestockItem,
    deleteRestockItem: deleteItem,
    addRestockItem,
    updateRestockItem,
    setRestockItems,
    currentUser,
    familyMembers,
    restockCategoryOrder,
    setRestockCategoryOrder,
    restockExpandedCategories: storedExpandedCategories,
    setRestockExpandedCategories,
  } = useHuddleStore();

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [completedPage, setCompletedPage] = useState(1);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [undoItem, setUndoItem] = useState<{ id: string, name: string, action: 'complete' | 'delete', data?: RestockItem } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, []);

  const COMPLETED_PAGE_SIZE = 5;

  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('');
  const [store, setStore] = useState('');
  const [brand, setBrand] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [isUrgentNew, setIsUrgentNew] = useState(false);

  const [localCategoryOrder, setLocalCategoryOrder] = useState<string[] | null>(restockCategoryOrder);
  useEffect(() => { setLocalCategoryOrder(restockCategoryOrder); }, [restockCategoryOrder]);
  const categoryOrder = localCategoryOrder;
  const pendingCategoryOrderRef = useRef<string[] | null>(null);
  const setCategoryOrder = useCallback((ord: string[] | null) => {
    setLocalCategoryOrder(ord);
    pendingCategoryOrderRef.current = ord;
  }, []);
  const commitCategoryOrder = useCallback(() => {
    if (pendingCategoryOrderRef.current !== null) {
      setRestockCategoryOrder(pendingCategoryOrderRef.current);
      pendingCategoryOrderRef.current = null;
    }
  }, [setRestockCategoryOrder]);
  const [expandedCategories, setExpandedCategoriesLocal] = useState<Record<string, boolean>>(storedExpandedCategories);
  const expandedCategoriesRef = useRef(storedExpandedCategories);
  const setExpandedCategories = useCallback((updater: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => {
    const next = typeof updater === 'function' ? updater(expandedCategoriesRef.current) : updater;
    expandedCategoriesRef.current = next;
    setExpandedCategoriesLocal(next);
    setRestockExpandedCategories(next);
  }, [setRestockExpandedCategories]);
  const [pendingIngredients, setPendingIngredients] = useState<string[]>([]);

  const { category: detectedCat, suggestions } = useMemo(() => classify(searchTerm), [searchTerm]);

  const addItem = useCallback((name: string, overrideCategory?: GroceryCategory) => {
    if (!name.trim()) return;
    const result = classify(name);
    const category = overrideCategory !== undefined ? overrideCategory : result.category;
    const newItem: Omit<any, 'id'> = {
      name: name.trim(),
      category: category === 'Other' ? result.category : category,
      addedBy: { name: currentUser, avatar: familyMembers.find((m: any) => m.name === currentUser)?.avatar ?? '👤' },
      isUrgent: isUrgentNew,
      isStaple: result.isExact,
      isCompleted: false,
      addedAt: Date.now(),
      qty: Math.max(1, parseFloat(qty) || 1), unit, store, brand: brand || undefined, tags, note: note || undefined
    };
    addRestockItem(newItem);
    setSearchTerm(''); setIsAddingMode(false); setQty('1'); setUnit(''); setStore(''); setBrand(''); setTags([]); setNote(''); setIsUrgentNew(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [qty, unit, store, brand, tags, note, detectedCat, currentUser, isUrgentNew, addRestockItem]);

  const toggleItem = useCallback((id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    if (item.isCompleted) {
      // Immediate un-complete
      toggleRestockItem(id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    setPendingIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        // Cancel completion
        next.delete(id);
        if (timersRef.current[id]) {
          clearTimeout(timersRef.current[id]);
          delete timersRef.current[id];
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        // Start pending completion
        next.add(id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        timersRef.current[id] = setTimeout(() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          toggleRestockItem(id);
          setPendingIds(p => {
            const n = new Set(p);
            n.delete(id);
            return n;
          });
          delete timersRef.current[id];
        }, 2000);
      }
      return next;
    });
  }, [items, toggleRestockItem]);

  const handleDelete = useCallback((id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    deleteItem(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoItem({ id, name: item.name, action: 'delete', data: item });
    undoTimerRef.current = setTimeout(() => setUndoItem(null), 3500);
  }, [items, deleteItem]);

  const handleUndo = useCallback(() => {
    if (!undoItem) return;
    if (undoItem.action === 'complete') {
      toggleRestockItem(undoItem.id);
    } else if (undoItem.action === 'delete' && undoItem.data) {
      // Re-insert with original id preserved (addRestockItem would generate a new id)
      setRestockItems([undoItem.data, ...items]);
    }
    setUndoItem(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [undoItem, toggleRestockItem, setRestockItems, items]);

  const [filterStores, setFilterStores] = useState<string[]>([]);
  const [filterBrands, setFilterBrands] = useState<string[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterUrgent, setFilterUrgent] = useState(false);

  const allStores = useMemo(() => [...new Set(items.filter(i => !i.isCompleted && i.store).map(i => i.store!))], [items]);
  const allBrands = useMemo(() => [...new Set(items.filter(i => !i.isCompleted && i.brand).map(i => i.brand!))], [items]);
  const allTags = useMemo(() => [...new Set(items.filter(i => !i.isCompleted).flatMap(i => i.tags || []))], [items]);

  const hasFilters = filterStores.length > 0 || filterBrands.length > 0 || filterTags.length > 0 || filterUrgent;

  const toggleFilter = <T,>(arr: T[], setArr: (v: T[]) => void, val: T) => {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const pendingItems = useMemo(() => {
    let filtered = items.filter(i => !i.isCompleted);
    if (filterUrgent) filtered = filtered.filter(i => i.isUrgent);
    if (filterStores.length) filtered = filtered.filter(i => i.store && filterStores.includes(i.store));
    if (filterBrands.length) filtered = filtered.filter(i => i.brand && filterBrands.includes(i.brand));
    if (filterTags.length) filtered = filtered.filter(i => filterTags.every(t => (i.tags || []).includes(t)));
    return filtered.sort((a, b) => (b.isUrgent ? 1 : 0) - (a.isUrgent ? 1 : 0));
  }, [items, filterStores, filterBrands, filterTags, filterUrgent]);
  const completedItems = useMemo(() => items.filter(i => i.isCompleted).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)), [items]);

  const pendingByCategory = useMemo(() => {
    const map: Record<string, RestockItem[]> = {};
    pendingItems.forEach(i => { if (!map[i.category]) map[i.category] = []; map[i.category].push(i); });
    const keys = Object.keys(map);
    const ordered = categoryOrder ? [...categoryOrder.filter(k => keys.includes(k)), ...keys.filter(k => !categoryOrder.includes(k))] : keys.sort();
    return ordered.map(k => [k, map[k]] as [string, RestockItem[]]);
  }, [pendingItems, categoryOrder]);

  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);

  const onReorderItems = useCallback((category: string, from: number, to: number) => {
    const categoryItems = items.filter(i => i.category === category && !i.isCompleted);
    const otherItems = items.filter(i => i.category !== category || i.isCompleted);
    const reordered = [...categoryItems];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setRestockItems([...reordered, ...otherItems]);
  }, [items, setRestockItems]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        {pendingIngredients.length > 0 && (
          <PantryCheck
            ingredients={pendingIngredients}
            onCancel={() => setPendingIngredients([])}
            onApprove={(selected) => {
              selected.forEach(s => addItem(s));
              setPendingIngredients([]);
            }}
          />
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 }}>HomeHuddle</Text>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#0F172A', marginTop: 1 }}>Restock</Text>
          </View>
          <TouchableOpacity
            onPress={() => { setQuickAddOpen(v => !v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: quickAddOpen ? '#0F172A' : '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}
          >
            {quickAddOpen
              ? <X size={20} color="white" />
              : <Plus size={20} color="#6366F1" />}
          </TouchableOpacity>
        </View>

        <FilterBar
            allStores={allStores}
            allBrands={allBrands}
            allTags={allTags}
            filterStores={filterStores}
            filterBrands={filterBrands}
            filterTags={filterTags}
            filterUrgent={filterUrgent}
            onToggleStore={s => toggleFilter(filterStores, setFilterStores, s)}
            onToggleBrand={b => toggleFilter(filterBrands, setFilterBrands, b)}
            onToggleTag={t => toggleFilter(filterTags, setFilterTags, t)}
            onToggleUrgent={() => setFilterUrgent(v => !v)}
            onClear={() => { setFilterStores([]); setFilterBrands([]); setFilterTags([]); setFilterUrgent(false); }}
            hasFilters={hasFilters}
          />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

          {quickAddOpen && (
            <>
              <StaplesCarousel onSelect={(name) => { setSearchTerm(name); setIsAddingMode(true); }} completedItems={completedItems} />
              <View style={{ paddingHorizontal: 20 }}>
            <View style={{ backgroundColor: 'white', borderRadius: 28, padding: 8, ...GOLDEN_SHADOW, borderWidth: 1, borderColor: '#F1F5F9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
                <Sparkles size={20} color="#6366F1" />
                <TextInput
                  placeholder="I need..."
                  value={searchTerm}
                  maxLength={50}
                  onChangeText={t => { setSearchTerm(t); setIsAddingMode(t.length > 0); }}
                  style={{ flex: 1, height: 60, fontSize: 18, fontWeight: '700', paddingLeft: 12 }}
                  onSubmitEditing={() => addItem(searchTerm)}
                />
                {searchTerm.length > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => { setSearchTerm(''); setIsAddingMode(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      style={{ padding: 8 }}
                    >
                      <X size={20} color="#94A3B8" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => addItem(searchTerm)} style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' }}>
                      <Plus size={24} color="white" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {isAddingMode && suggestions.length > 0 && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {suggestions.map((s, i) => (
                      <TouchableOpacity key={i} onPress={() => setSearchTerm(toTitleCase(s.name))} style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, marginRight: 8, borderWidth: 1, borderColor: '#C7D2FE', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#4F46E5' }}>{toTitleCase(s.name)}</Text>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase' }}>{s.category}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {isAddingMode && (
                <View style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 8, padding: 8 }}>
                    <View style={{ flex: 1, height: 40, backgroundColor: '#F8FAFC', borderRadius: 12, justifyContent: 'center' }}>
                      <TextInput
                        value={qty}
                        onChangeText={t => {
                          const cleaned = t.replace(/[^0-9.]/g, '');
                          const parts = cleaned.split('.');
                          if (parts.length > 2) return;
                          if (parts[1]?.length > 2) return;
                          setQty(cleaned);
                        }}
                        style={{ flex: 1, textAlign: 'center', fontWeight: '800', paddingVertical: 0 }}
                        keyboardType="decimal-pad"
                        placeholder="1"
                      />
                    </View>
                    <View style={{ flex: 1.5, height: 40, backgroundColor: '#F8FAFC', borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
                      <TextInput
                        placeholder="Unit"
                        value={unit}
                        onChangeText={setUnit}
                        style={{ flex: 1, paddingHorizontal: 12, fontWeight: '700', paddingVertical: 0 }}
                      />
                      {!!unit && (
                        <TouchableOpacity onPress={() => setUnit('')} style={{ padding: 6 }}>
                          <X size={14} color="#94A3B8" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => { setIsUrgentNew(v => !v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      style={{ width: 40, height: 40, backgroundColor: isUrgentNew ? '#FEE2E2' : '#F8FAFC', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: isUrgentNew ? 1 : 0, borderColor: '#FCA5A5' }}
                    >
                      <Text style={{ fontSize: 16 }}>🔥</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowMoreDetails(!showMoreDetails)} style={{ width: 40, height: 40, backgroundColor: '#F8FAFC', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                      <ChevronDown size={20} color="#64748B" style={{ transform: [{ rotate: showMoreDetails ? '180deg' : '0deg' }] }} />
                    </TouchableOpacity>
                  </View>

                  {isAddingMode && (
                    <View style={{ padding: 8 }}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {POPULAR_UNITS.filter(u => !unit || u.toLowerCase().includes(unit.toLowerCase())).map(u => (
                          <TouchableOpacity key={u} onPress={() => setUnit(formatUnit(qty || 1, u))} style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, marginRight: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>{formatUnit(qty || 1, u)}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                  {showMoreDetails && (
                    <Animated.View entering={FadeInDown.duration(200)} style={{ padding: 12, gap: 12 }}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <View style={{ flex: 1, height: 40, backgroundColor: '#F8FAFC', borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
                          <TextInput
                            placeholder="Store"
                            value={store}
                            onChangeText={setStore}
                            style={{ flex: 1, paddingHorizontal: 12, fontWeight: '700', paddingVertical: 0 }}
                          />
                          {!!store && (
                            <TouchableOpacity onPress={() => setStore('')} style={{ padding: 6 }}>
                              <X size={14} color="#94A3B8" />
                            </TouchableOpacity>
                          )}
                        </View>
                        <View style={{ flex: 1, height: 40, backgroundColor: '#F8FAFC', borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
                          <TextInput
                            placeholder="Brand"
                            value={brand}
                            onChangeText={setBrand}
                            style={{ flex: 1, paddingHorizontal: 12, fontWeight: '700', paddingVertical: 0 }}
                          />
                          {!!brand && (
                            <TouchableOpacity onPress={() => setBrand('')} style={{ padding: 6 }}>
                              <X size={14} color="#94A3B8" />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>

                      <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12 }}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                          {tags.map(tag => (
                            <TouchableOpacity key={tag} onPress={() => setTags(prev => prev.filter(t => t !== tag))} style={{ backgroundColor: 'white', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6, ...GOLDEN_SHADOW }}>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#6366F1' }}>{tag}</Text>
                              <X size={12} color="#6366F1" />
                            </TouchableOpacity>
                          ))}
                        </View>
                        <TextInput
                          placeholder="Add tags... (Enter)"
                          value={tagInput}
                          onChangeText={setTagInput}
                          onSubmitEditing={() => {
                            if (tagInput.trim() && !tags.includes(tagInput.trim()) && tags.length < 5) {
                              setTags(prev => [...prev, tagInput.trim()]);
                              setTagInput('');
                            }
                          }}
                          style={{ fontSize: 14, fontWeight: '600', color: '#1E293B', height: 32 }}
                        />
                      </View>

                      <TextInput placeholder="Notes..." value={note} onChangeText={setNote} style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, minHeight: 56 }} multiline />
                    </Animated.View>
                  )}
                </View>
              )}
            </View>
          </View>
            </>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 24, marginTop: 8, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4 }}>
              <TouchableOpacity
                onPress={() => {
                  const next: Record<string, boolean> = {};
                  pendingByCategory.forEach(([c]) => next[c] = true);
                  setExpandedCategories(next);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'white', ...GOLDEN_SHADOW }}
              >
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#6366F1' }}>EXPAND ALL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const next: Record<string, boolean> = {};
                  pendingByCategory.forEach(([c]) => next[c] = false);
                  setExpandedCategories(next);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
              >
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748B' }}>COLLAPSE</Text>
              </TouchableOpacity>
            </View>
          </View>

          {pendingByCategory.map(([cat, catItems], idx) => (
            <DraggableCategorySection
              key={cat}
              cat={cat}
              catItems={catItems}
              idx={idx}
              total={pendingByCategory.length}
              isExpanded={expandedCategories[cat] !== false}
              isPlaceholder={draggedCategory === cat}
              onToggleExpand={() => setExpandedCategories(p => ({ ...p, [cat]: !(expandedCategories[cat] !== false) }))}
              onDragStart={() => setDraggedCategory(cat)}
              onDragEnd={() => { setDraggedCategory(null); commitCategoryOrder(); }}
              onReorder={(dir) => {
                const ord = pendingByCategory.map(([c]) => c);
                [ord[idx], ord[idx + dir]] = [ord[idx + dir], ord[idx]];
                setCategoryOrder(ord);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              toggleItem={toggleItem}
              deleteItem={handleDelete}
              updateRestockItem={updateRestockItem}
              items={items}
              onReorderItems={onReorderItems}
              pendingIds={pendingIds}
            />
          ))}

          {completedItems.length > 0 && (
            <View style={{ marginTop: 32, marginBottom: 100 }}>
              <TouchableOpacity onPress={() => setIsHistoryExpanded(!isHistoryExpanded)} style={{ backgroundColor: '#F1F5F9', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <History size={16} color="#64748B" />
                  <Text style={{ fontWeight: '800', color: '#64748B' }}>HISTORY ({completedItems.length})</Text>
                </View>
              </TouchableOpacity>
              {isHistoryExpanded && (
                <View>
                  {completedItems.slice(0, completedPage * COMPLETED_PAGE_SIZE).map(i => <ToBuyItem key={i.id} item={i} onToggle={toggleItem} onRemove={handleDelete} onEdit={u => updateRestockItem(u.id, u)} />)}
                  {completedItems.length > completedPage * COMPLETED_PAGE_SIZE && <TouchableOpacity onPress={() => setCompletedPage(p => p + 1)} style={{ padding: 20, alignItems: 'center' }}><Text style={{ fontWeight: '800', color: '#6366F1' }}>LOAD MORE</Text></TouchableOpacity>}
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {undoItem && (
          <View style={{ position: 'absolute', bottom: 108, left: 24, right: 24, zIndex: 100 }}>
            <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOut} style={{ backgroundColor: '#1E293B', borderRadius: 20, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', ...GOLDEN_SHADOW, shadowOpacity: 0.2 }}>
              <Text style={{ color: '#E2E8F0', fontSize: 13, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                "{undoItem.name}" {undoItem.action === 'delete' ? 'deleted!' : 'completed!'}
              </Text>
              <TouchableOpacity onPress={handleUndo} style={{ paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#6366F1', borderRadius: 12, marginLeft: 12 }}>
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '900' }}>Undo</Text>
              </TouchableOpacity>
              <ChoreUndoRing key={undoItem.id} duration={3500} />
            </Animated.View>
          </View>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
