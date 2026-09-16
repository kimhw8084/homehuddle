/**
 * WeeklyMenuSection — World-class dinner planning widget
 *
 * Features:
 *  • Gradient "Tonight" hero card with recipe details, cook avatar, countdown
 *  • Horizontal week strip: each day pill shows emoji, name, type badge, cook avatar, vote tally
 *  • Voting phase: live ballot with per-member vote tracking, animated progress bars
 *  • Results phase: podium + ranked list with voter avatars
 *  • ManageDayModal: full day editor (meal type, recipe pick, cook, note, rating)
 *  • RecipeBank: search / add / edit / delete with cuisine chips, difficulty
 *  • Full-screen DayDetailModal for any tapped day
 *  • Archive viewer (past weeks)
 *  • "Chef of the week" streak badge
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet,
    Dimensions, TextInput, Alert, Animated, Easing, Platform, PanResponder,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
    ChefHat, X, Check, ChevronRight, Clock, Star,
    History, UtensilsCrossed, Plus, Search, Edit2, Trash2,
    RotateCcw, BookOpen, Sparkles, Vote, BarChart2, CheckCircle2,
    StickyNote, ChevronUp, ChevronDown,
} from 'lucide-react-native';
import { Recipe, DayMenu, useHuddleStore } from '../store/huddleStore';
import { InitialsAvatar } from './AvatarPicker';
import { useAuthStore } from '../store/authStore';
import { MealPlanner } from '../features/meals/MealPlanner';

export function WeeklyMenuSection() {
    const signedIn = useAuthStore(state => Boolean(state.user));
    return signedIn ? <MealPlanner /> : <DemoWeeklyMenuSection />;
}

const { width } = Dimensions.get('window');
const CARD_W = width - 40; // 20px margin each side

// ─── Color palette ──────────────────────────────────────────────────────────
const C = {
    bg: '#F8FAFC',
    card: '#FFFFFF',
    accent: '#6366F1',
    accentBg: '#EEF2FF',
    text: '#0F172A',
    sub: '#64748B',
    muted: '#F1F5F9',
    border: '#E2E8F0',
    green: '#10B981',
    amber: '#F59E0B',
    red: '#EF4444',
    pink: '#EC4899',
    purple: '#8B5CF6',
    dark: '#0F172A',
    gold: '#F59E0B',
};

const SHADOW = {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
};

const SHADOW_SM = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
};

// ─── Constants ───────────────────────────────────────────────────────────────
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const MEAL_TYPES: Array<{ id: DayMenu['type']; label: string; emoji: string; color: string; bg: string }> = [
    { id: 'home', label: 'Home Cooked', emoji: '🍳', color: '#6366F1', bg: '#EEF2FF' },
    { id: 'dining_out', label: 'Dining Out', emoji: '🍽️', color: '#EC4899', bg: '#FDF2F8' },
    { id: 'to_go', label: 'Takeout', emoji: '🥡', color: '#F59E0B', bg: '#FFFBEB' },
    { id: 'leftovers', label: 'Leftovers', emoji: '♻️', color: '#10B981', bg: '#F0FDF4' },
];

const CUISINE_COLORS: Record<string, { bg: string; text: string }> = {
    'American':      { bg: '#FEF3C7', text: '#92400E' },
    'Italian':       { bg: '#FEE2E2', text: '#991B1B' },
    'Mexican':       { bg: '#FEF9C3', text: '#854D0E' },
    'Asian':         { bg: '#E0F2FE', text: '#0C4A6E' },
    'Japanese':      { bg: '#F0FDF4', text: '#14532D' },
    'Korean':        { bg: '#FDF4FF', text: '#581C87' },
    'Thai':          { bg: '#ECFDF5', text: '#064E3B' },
    'Indian':        { bg: '#FFF7ED', text: '#7C2D12' },
    'Mediterranean': { bg: '#EFF6FF', text: '#1E3A5F' },
    'Chinese':       { bg: '#FEF3C7', text: '#78350F' },
    'French':        { bg: '#FDF2F8', text: '#831843' },
    'Greek':         { bg: '#EFF6FF', text: '#1E40AF' },
    'Spanish':       { bg: '#FFF7ED', text: '#9A3412' },
    'Vietnamese':    { bg: '#F0FDF4', text: '#065F46' },
    'Middle Eastern':{ bg: '#FFFBEB', text: '#92400E' },
    'Caribbean':     { bg: '#ECFEFF', text: '#164E63' },
    'African':       { bg: '#FEF3C7', text: '#713F12' },
    'Comfort':       { bg: '#F5F3FF', text: '#4C1D95' },
    'Healthy':       { bg: '#ECFDF5', text: '#064E3B' },
    'Seafood':       { bg: '#F0F9FF', text: '#075985' },
    'Vegetarian':    { bg: '#F0FDF4', text: '#166534' },
    'Vegan':         { bg: '#F0FDF4', text: '#15803D' },
    'Breakfast':     { bg: '#FFFBEB', text: '#B45309' },
    'BBQ':           { bg: '#FEE2E2', text: '#B91C1C' },
    'Fusion':        { bg: '#F5F3FF', text: '#6D28D9' },
    'Other':         { bg: '#F1F5F9', text: '#475569' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getTodayIdx(): number {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
}

function mealTypeConfig(type?: DayMenu['type']) {
    return MEAL_TYPES.find(t => t.id === type) ?? MEAL_TYPES[0];
}

function dayEmoji(menu?: DayMenu, recipe?: Recipe): string {
    if (recipe?.emoji) return recipe.emoji;
    return mealTypeConfig(menu?.type).emoji;
}

// ─── Animated vote bar ───────────────────────────────────────────────────────
function VoteBar({ pct, color }: { pct: number; color: string }) {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(anim, { toValue: pct, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    }, [pct]);
    return (
        <View style={{ height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden', flex: 1 }}>
            <Animated.View style={{ height: 6, borderRadius: 3, backgroundColor: color, width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
        </View>
    );
}

// ─── Mini avatar stack ───────────────────────────────────────────────────────
function AvatarStack({ names, size = 22 }: { names: string[]; size?: number }) {
    const { familyMembers } = useHuddleStore();
    const members = names.map(n => familyMembers.find(m => m.name === n)).filter(Boolean);
    return (
        <View style={{ flexDirection: 'row' }}>
            {members.slice(0, 4).map((m, i) => (
                <View key={m!.name} style={{ marginLeft: i > 0 ? -(size * 0.35) : 0, zIndex: 10 - i, borderWidth: 1.5, borderColor: '#fff', borderRadius: size / 2 }}>
                    <InitialsAvatar name={m!.name} avatar={m!.avatar} size={size} accentColor={C.accent} />
                </View>
            ))}
        </View>
    );
}

// ─── Cook Avatar chip ────────────────────────────────────────────────────────
function CookChip({ name, size = 20 }: { name?: string; size?: number }) {
    const { familyMembers } = useHuddleStore();
    if (!name) return null;
    const m = familyMembers.find(f => f.name === name);
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.muted, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: C.border }}>
            <InitialsAvatar name={name} avatar={m?.avatar} size={size} accentColor={C.accent} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.text }}>{name}</Text>
        </View>
    );
}

// ─── Phase badge ─────────────────────────────────────────────────────────────
function PhaseBadge({ phase }: { phase: 'voting' | 'results' | 'finalized' }) {
    const map = {
        voting:    { label: 'Voting Open', color: C.accent, bg: C.accentBg, icon: Vote },
        results:   { label: 'Results In', color: C.amber, bg: '#FFFBEB', icon: BarChart2 },
        finalized: { label: 'Menu Set', color: C.green, bg: '#F0FDF4', icon: CheckCircle2 },
    };
    const { label, color, bg, icon: Icon } = map[phase];
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
            <Icon size={11} color={color} />
            <Text style={{ fontSize: 11, fontWeight: '800', color }}>{label}</Text>
        </View>
    );
}

// ─── Modal: Recipe Form (Add / Edit) ────────────────────────────────────────
function RecipeFormModal({ visible, onClose, recipeToEdit }: { visible: boolean; onClose: () => void; recipeToEdit?: Recipe | null }) {
    const { addRecipe, updateRecipe, currentUser, recipes } = useHuddleStore();
    const [name, setName] = useState('');
    const [cuisine, setCuisine] = useState('Italian');
    const [emoji, setEmoji] = useState('🍽️');
    const [prepHours, setPrepHours] = useState(0);
    const [prepMins, setPrepMins] = useState(30);
    const [prepHText, setPrepHText] = useState('0');
    const [prepMText, setPrepMText] = useState('30');
    const [ingredients, setIngredients] = useState('');
    const [description, setDescription] = useState('');

    const translateY = useRef(new Animated.Value(600)).current;
    useEffect(() => {
        if (visible) {
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start();
        }
    }, [visible]);
    const startY = useRef(0);
    const close = () => {
        Animated.timing(translateY, { toValue: 700, duration: 250, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => onClose());
    };
    const snapBack = () => Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start();

    useEffect(() => {
        if (visible) {
            if (recipeToEdit) {
                setName(recipeToEdit.name); setCuisine(recipeToEdit.cuisine);
                setEmoji(recipeToEdit.emoji);
                const match = recipeToEdit.prepTime.match(/(?:(\d+)h)?(?:\s*(\d+)m)?/);
                const ph = match ? parseInt(match[1] ?? '0') : 0;
                const pm = match ? parseInt(match[2] ?? '0') : 30;
                setPrepHours(ph); setPrepHText(String(ph));
                setPrepMins(pm); setPrepMText(String(pm).padStart(2, '0'));
                setIngredients(recipeToEdit.ingredients.join(', '));
                setDescription(recipeToEdit.description ?? '');
            } else {
                setName(''); setCuisine('Italian'); setEmoji('🍽️');
                setPrepHours(0); setPrepHText('0'); setPrepMins(30); setPrepMText('30'); setIngredients(''); setDescription('');
            }
            translateY.setValue(600);
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start();
        }
    }, [recipeToEdit, visible]);

    const prepTime = (() => {
        if (prepHours > 0 && prepMins > 0) return `${prepHours}h ${prepMins}m`;
        if (prepHours > 0) return `${prepHours}h`;
        return `${prepMins}m`;
    })();

    const nameTrimmed = name.trim();
    const isDuplicate = !!nameTrimmed && recipes.some(r => r.name.toLowerCase() === nameTrimmed.toLowerCase() && r.id !== recipeToEdit?.id);

    const submit = () => {
        if (!nameTrimmed) return Alert.alert('Required', 'Meal name is required.');
        if (isDuplicate) return Alert.alert('Duplicate', 'A meal with this name already exists.');
        const data = { name: nameTrimmed, cuisine, emoji, prepTime,
            difficulty: 'Medium' as const, description,
            ingredients: ingredients.split(',').map(i => i.trim()).filter(Boolean),
            addedBy: currentUser, tags: [cuisine] };
        recipeToEdit ? updateRecipe(recipeToEdit.id, data) : addRecipe(data);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        close();
    };

    return (
        <Modal visible={visible} animationType="none" transparent statusBarTranslucent>
            <View style={s.modalOverlay}>
                <Animated.View style={[s.formSheet, { transform: [{ translateY }] }]}>
                    <View style={s.sheetHandle}
                        onStartShouldSetResponder={() => true}
                        onResponderGrant={(e) => { startY.current = e.nativeEvent.pageY; }}
                        onResponderMove={(e) => { const dy = e.nativeEvent.pageY - startY.current; if (dy > 0) translateY.setValue(dy); }}
                        onResponderRelease={(e) => { const dy = e.nativeEvent.pageY - startY.current; if (dy > 80) close(); else snapBack(); }}
                    />
                    <View style={s.formHeader}>
                        <Text style={s.formTitle}>{recipeToEdit ? '✏️  Edit Meal' : '✨  New Meal'}</Text>
                        <TouchableOpacity onPress={close} style={s.closeBtn}><X size={20} color={C.sub} /></TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {/* Emoji + Name row */}
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ width: 72 }}>
                                <Text style={s.fieldLabel}>Emoji</Text>
                                <TextInput value={emoji} onChangeText={setEmoji} maxLength={4}
                                    style={[s.input, { textAlign: 'center', fontSize: 28, paddingVertical: 10 }]} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.fieldLabel}>Meal Name *</Text>
                                <TextInput value={name} onChangeText={setName} placeholder="e.g. Mom's Lasagna"
                                    placeholderTextColor="#CBD5E1"
                                    style={[s.input, isDuplicate && { borderColor: C.red, borderWidth: 2 }]} />
                                {isDuplicate && <Text style={{ fontSize: 11, color: C.red, fontWeight: '700', marginTop: 4 }}>This meal already exists in your bank.</Text>}
                            </View>
                        </View>

                        {/* Prep time — up/down spinners like chore add window */}
                        <View>
                            <Text style={s.fieldLabel}>Prep Time</Text>
                            <View style={{ backgroundColor: C.muted, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
                                {/* Hours */}
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{ fontSize: 9, fontWeight: '900', color: C.sub, letterSpacing: 1, marginBottom: 8 }}>HOURS</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <TouchableOpacity
                                            onPress={() => { const v = Math.max(0, prepHours - 1); if (v === 0 && prepMins === 0) return; setPrepHours(v); setPrepHText(String(v)); }}
                                            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
                                            <ChevronDown size={14} color={C.sub} />
                                        </TouchableOpacity>
                                        <TextInput
                                            keyboardType="numeric"
                                            value={prepHText}
                                            onChangeText={v => { const s = v.replace(/[^0-9]/g, ''); setPrepHText(s); const n = parseInt(s, 10); if (!isNaN(n) && n >= 0 && n <= 23) setPrepHours(n); }}
                                            onBlur={() => { const n = parseInt(prepHText, 10); const safe = isNaN(n) ? 0 : Math.max(0, Math.min(23, n)); if (safe === 0 && prepMins === 0) { setPrepMins(5); setPrepMText('05'); } setPrepHours(safe); setPrepHText(String(safe)); }}
                                            style={{ fontSize: 30, fontWeight: '900', color: C.text, width: 40, textAlign: 'center', padding: 0 }}
                                        />
                                        <TouchableOpacity
                                            onPress={() => { const v = Math.min(23, prepHours + 1); setPrepHours(v); setPrepHText(String(v)); }}
                                            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
                                            <ChevronUp size={14} color={C.sub} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <Text style={{ fontSize: 28, fontWeight: '900', color: C.border, marginTop: 16 }}>:</Text>
                                {/* Minutes */}
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{ fontSize: 9, fontWeight: '900', color: C.sub, letterSpacing: 1, marginBottom: 8 }}>MINS</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <TouchableOpacity
                                            onPress={() => { const v = Math.max(0, prepMins - 5); if (prepHours === 0 && v === 0) return; setPrepMins(v); setPrepMText(String(v).padStart(2, '0')); }}
                                            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
                                            <ChevronDown size={14} color={C.sub} />
                                        </TouchableOpacity>
                                        <TextInput
                                            keyboardType="numeric"
                                            value={prepMText}
                                            onChangeText={v => { const s = v.replace(/[^0-9]/g, ''); setPrepMText(s); const n = parseInt(s, 10); if (!isNaN(n) && n >= 0 && n <= 59) setPrepMins(prepHours === 0 && n === 0 ? 5 : n); }}
                                            onBlur={() => { const n = parseInt(prepMText, 10); const safe = isNaN(n) ? 0 : Math.max(0, Math.min(59, n)); const f = prepHours === 0 && safe === 0 ? 5 : safe; setPrepMins(f); setPrepMText(String(f).padStart(2, '0')); }}
                                            style={{ fontSize: 30, fontWeight: '900', color: C.text, width: 44, textAlign: 'center', padding: 0 }}
                                        />
                                        <TouchableOpacity
                                            onPress={() => { const v = Math.min(55, prepMins + 5); setPrepMins(v); setPrepMText(String(v).padStart(2, '0')); }}
                                            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
                                            <ChevronUp size={14} color={C.sub} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Cuisine */}
                        <View>
                            <Text style={s.fieldLabel}>Cuisine</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                                {Object.keys(CUISINE_COLORS).map(c => {
                                    const cc = CUISINE_COLORS[c];
                                    const active = cuisine === c;
                                    return (
                                        <TouchableOpacity key={c} onPress={() => setCuisine(c)}
                                            style={{ backgroundColor: active ? C.dark : cc.bg, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: active ? C.dark : 'transparent', alignSelf: 'flex-start' }}>
                                            <Text style={{ fontSize: 12, fontWeight: '800', color: active ? '#fff' : cc.text }}>{c}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        {/* Ingredients */}
                        <View>
                            <Text style={s.fieldLabel}>Ingredients (comma separated)</Text>
                            <TextInput value={ingredients} onChangeText={setIngredients}
                                placeholder="Flour, Cheese, Basil…" placeholderTextColor="#CBD5E1"
                                multiline style={[s.input, { height: 80, textAlignVertical: 'top' }]} />
                        </View>

                        {/* Notes */}
                        <View>
                            <Text style={s.fieldLabel}>Notes</Text>
                            <TextInput value={description} onChangeText={setDescription}
                                placeholder="Family tips, substitutions…" placeholderTextColor="#CBD5E1"
                                multiline style={[s.input, { height: 64, textAlignVertical: 'top' }]} />
                        </View>

                        <TouchableOpacity onPress={submit} style={s.primaryBtn}>
                            <Text style={s.primaryBtnText}>{recipeToEdit ? 'Save Changes' : 'Add to Meal Bank'}</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
}

// ─── Modal: Recipe Bank ──────────────────────────────────────────────────────
function RecipeBankModal({ visible, onClose, onSelect }: { visible: boolean; onClose: () => void; onSelect?: (r: Recipe) => void }) {
    const { recipes, deleteRecipe } = useHuddleStore();
    const [search, setSearch] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Recipe | null>(null);
    const [filterCuisine, setFilterCuisine] = useState<string | null>(null);

    const filtered = useMemo(() => recipes.filter(r =>
        (r.name.toLowerCase().includes(search.toLowerCase()) || r.cuisine.toLowerCase().includes(search.toLowerCase())) &&
        (!filterCuisine || r.cuisine === filterCuisine)
    ), [recipes, search, filterCuisine]);

    const cuisines = useMemo(() => [...new Set(recipes.map(r => r.cuisine))], [recipes]);

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
                {/* Header */}
                <View style={s.fullHeader}>
                    <View>
                        <Text style={s.fullTitle}>🍽  Meal Bank</Text>
                        <Text style={s.fullSub}>{recipes.length} family favorites</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity onPress={() => { setEditing(null); setFormOpen(true); }} style={s.addIconBtn}>
                            <Plus size={20} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onClose} style={s.closeIconBtn}><X size={20} color={C.sub} /></TouchableOpacity>
                    </View>
                </View>

                {/* Search */}
                <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 }}>
                    <View style={s.searchBar}>
                        <Search size={16} color={C.sub} />
                        <TextInput value={search} onChangeText={setSearch} placeholder="Search meals…"
                            placeholderTextColor="#CBD5E1" style={s.searchInput} />
                    </View>
                </View>

                {/* Cuisine filter chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    style={{ flexShrink: 0 }}
                    contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 8, alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setFilterCuisine(null)}
                        style={[s.filterChip, !filterCuisine && s.filterChipActive]}>
                        <Text style={[s.filterChipText, !filterCuisine && { color: '#fff' }]}>All</Text>
                    </TouchableOpacity>
                    {cuisines.map(c => {
                        const cc = CUISINE_COLORS[c] ?? { bg: '#F1F5F9', text: C.sub };
                        const active = filterCuisine === c;
                        return (
                            <TouchableOpacity key={c} onPress={() => setFilterCuisine(active ? null : c)}
                                style={[s.filterChip, active && { backgroundColor: C.dark, borderColor: C.dark }]}>
                                <Text style={[s.filterChipText, active && { color: '#fff' }]}>{c}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Recipe list */}
                <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} showsVerticalScrollIndicator={false}>
                    {filtered.length === 0 ? (
                        <View style={{ alignItems: 'center', paddingTop: 80 }}>
                            <Text style={{ fontSize: 48 }}>🍳</Text>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: C.sub, marginTop: 12 }}>No meals found</Text>
                        </View>
                    ) : filtered.map(r => {
                        const cc = CUISINE_COLORS[r.cuisine] ?? { bg: '#F1F5F9', text: C.sub };
                        return (
                            <TouchableOpacity key={r.id} activeOpacity={0.85}
                                onPress={() => onSelect ? (onSelect(r), onClose()) : (setEditing(r), setFormOpen(true))}
                                style={s.recipeCard}>
                                <View style={s.recipeEmoji}><Text style={{ fontSize: 26 }}>{r.emoji}</Text></View>
                                <View style={{ flex: 1, gap: 4 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <View style={{ backgroundColor: cc.bg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                                            <Text style={{ fontSize: 9, fontWeight: '900', color: cc.text }}>{r.cuisine.toUpperCase()}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                            <Clock size={10} color={C.sub} />
                                            <Text style={{ fontSize: 10, fontWeight: '700', color: C.sub }}>{r.prepTime}</Text>
                                        </View>
                                    </View>
                                    <Text style={s.recipeName} numberOfLines={1}>{r.name}</Text>
                                    <Text style={s.recipeIngredients} numberOfLines={1}>
                                        {r.ingredients.slice(0, 3).join(' · ')}{r.ingredients.length > 3 ? ' …' : ''}
                                    </Text>
                                </View>
                                {onSelect ? (
                                    <View style={s.selectChevron}><ChevronRight size={16} color={C.accent} /></View>
                                ) : (
                                    <View style={{ gap: 8 }}>
                                        <TouchableOpacity onPress={() => { setEditing(r); setFormOpen(true); }} style={s.iconActionBtn}>
                                            <Edit2 size={14} color={C.accent} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => Alert.alert('Delete', `Remove "${r.name}"?`, [
                                            { text: 'Cancel', style: 'cancel' },
                                            { text: 'Delete', style: 'destructive', onPress: () => deleteRecipe(r.id) },
                                        ])} style={[s.iconActionBtn, { backgroundColor: '#FEE2E2' }]}>
                                            <Trash2 size={14} color={C.red} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
                <RecipeFormModal visible={formOpen} onClose={() => setFormOpen(false)} recipeToEdit={editing} />
            </SafeAreaView>
        </Modal>
    );
}

// ─── Modal: Day Detail (view-only, tap to open; edit via button) ──────────────
function DayDetailModal({ visible, day, onClose, onEdit }: { visible: boolean; day: string; onClose: () => void; onEdit: () => void }) {
    const { weekMenu, recipes } = useHuddleStore();
    const dayMenu = weekMenu[day];
    const recipe = recipes.find(r => r.id === dayMenu?.recipeId || r.name === dayMenu?.recipeName);
    const mt = mealTypeConfig(dayMenu?.type);
    const emoji = dayEmoji(dayMenu, recipe);
    const dayIdx = DAYS.indexOf(day);

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
            <View style={s.modalOverlay}>
                <View style={{ backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
                    <View style={s.sheetHandle} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: C.sub, textTransform: 'uppercase', letterSpacing: 1 }}>{DAY_FULL[dayIdx]}</Text>
                        </View>
                        <TouchableOpacity onPress={() => { onClose(); setTimeout(onEdit, 80); }}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.accentBg, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: C.accent + '40' }}>
                            <Edit2 size={14} color={C.accent} />
                            <Text style={{ fontSize: 13, fontWeight: '800', color: C.accent }}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onClose} style={s.closeIconBtn}><X size={18} color={C.sub} /></TouchableOpacity>
                    </View>
                    <View style={{ padding: 24, paddingBottom: 40, gap: 16 }}>
                        {/* Meal */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                            <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: C.accentBg, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 42 }}>{emoji}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 20, fontWeight: '900', color: C.text }}>{dayMenu?.recipeName ?? mt.label}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                    <View style={{ backgroundColor: mt.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: mt.color }}>{mt.label}</Text>
                                    </View>
                                    {recipe && <Text style={{ fontSize: 11, fontWeight: '600', color: C.sub }}>{recipe.prepTime}</Text>}
                                </View>
                            </View>
                        </View>
                        {/* Cook */}
                        {dayMenu?.cook && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <ChefHat size={16} color={C.sub} />
                                <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>Chef: <Text style={{ color: C.accent }}>{dayMenu.cook}</Text></Text>
                            </View>
                        )}
                        {/* Note */}
                        {dayMenu?.note && (
                            <View style={{ backgroundColor: C.muted, borderRadius: 12, padding: 14 }}>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: C.sub }}>{dayMenu.note}</Text>
                            </View>
                        )}
                        {/* Recipe ingredients */}
                        {recipe?.ingredients && recipe.ingredients.length > 0 && (
                            <View>
                                <Text style={s.sectionLabel}>Ingredients</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                    {recipe.ingredients.map(ing => (
                                        <View key={ing} style={{ backgroundColor: C.muted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                                            <Text style={{ fontSize: 12, fontWeight: '600', color: C.text }}>{ing}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ─── Modal: Manage / Edit Day ─────────────────────────────────────────────────
function ManageDayModal({ visible, day, isPast, onClose }: { visible: boolean; day: string; isPast?: boolean; onClose: () => void }) {
    const { weekMenu, recipes, updateDayMenu, familyMembers } = useHuddleStore();
    const dayMenu = weekMenu[day];
    const [bankOpen, setBankOpen] = useState(false);
    const [homeCookedMode, setHomeCookedMode] = useState<'topVoted' | 'browse' | null>(null);
    const [browseSearch, setBrowseSearch] = useState('');
    const [browseCuisine, setBrowseCuisine] = useState<string | null>(null);
    const [note, setNote] = useState(dayMenu?.note ?? '');
    const [editingNote, setEditingNote] = useState(false);
    const [localCook, setLocalCook] = useState<string | undefined>(dayMenu?.cook);

    // Slide-up animation
    const translateY = useRef(new Animated.Value(600)).current;
    useEffect(() => {
        if (visible) {
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }).start();
        } else {
            translateY.setValue(600);
        }
    }, [visible]);

    // Swipe-to-close — handle only
    const panResponder = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.setValue(g.dy); },
        onPanResponderRelease: (_, g) => {
            if (g.dy > 80 || g.vy > 0.5) {
                Animated.timing(translateY, { toValue: 700, useNativeDriver: true, duration: 220 }).start(onClose);
            } else {
                Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }).start();
            }
        },
    })).current;

    useEffect(() => { setNote(dayMenu?.note ?? ''); setHomeCookedMode(null); }, [dayMenu?.note, visible]);

    // Top 7 voted recipes (sorted by votes, >0)
    const topVotedRecipes = useMemo(() =>
        [...recipes].sort((a, b) => b.votes - a.votes).slice(0, 7).filter(r => r.votes > 0),
        [recipes]
    );

    // Existing meals scheduled on other days (for reference badges)
    const scheduledRecipeIds = useMemo(() =>
        Object.entries(weekMenu)
            .filter(([d]) => d !== day)
            .map(([, m]) => m?.recipeId)
            .filter(Boolean) as string[],
        [weekMenu, day]
    );

    if (!dayMenu) return null;
    const recipe = recipes.find(r => r.id === dayMenu.recipeId || r.name === dayMenu.recipeName);
    const mt = mealTypeConfig(dayMenu.type);

    const changeType = (type: DayMenu['type']) => {
        updateDayMenu(day, { type, recipeId: type !== 'home' ? undefined : dayMenu.recipeId, recipeName: type !== 'home' ? undefined : dayMenu.recipeName });
        if (type !== 'home') setHomeCookedMode(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const changeCook = (name: string) => {
        setLocalCook(name);
        updateDayMenu(day, { cook: name });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const saveNote = () => {
        updateDayMenu(day, { note: note.trim() || undefined });
        setEditingNote(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const clearDay = () => {
        Alert.alert('Clear Day', "Reset this day's meal plan?", [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear', style: 'destructive', onPress: () => { updateDayMenu(day, { type: 'home', recipeId: undefined, recipeName: undefined, cook: undefined, note: undefined }); onClose(); } },
        ]);
    };

    const dayIdx = DAYS.indexOf(day);

    return (
        <>
            <Modal visible={visible} animationType="none" transparent statusBarTranslucent onRequestClose={onClose}>
                <View style={s.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
                    <Animated.View style={[s.manageDaySheet, { transform: [{ translateY }] }]}>
                        <View style={{ paddingVertical: 14, alignItems: 'center' }} {...panResponder.panHandlers}>
                            <View style={s.sheetHandle} />
                        </View>

                        {/* Header */}
                        <View style={s.manageDayHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: C.sub, textTransform: 'uppercase', letterSpacing: 1 }}>{DAY_FULL[dayIdx]}</Text>
                                <Text style={{ fontSize: 22, fontWeight: '900', color: C.text, marginTop: 2 }}>
                                    {isPast ? 'Edit Menu' : 'Plan Your Dinner'}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity onPress={clearDay} style={[s.closeIconBtn, { backgroundColor: '#FEF2F2' }]}>
                                    <RotateCcw size={16} color={C.red} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={onClose} style={s.closeIconBtn}><X size={18} color={C.sub} /></TouchableOpacity>
                            </View>
                        </View>

                        <ScrollView contentContainerStyle={{ padding: 24, gap: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            {/* Meal type selector */}
                            <View>
                                <Text style={s.sectionLabel}>Meal Type</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                                    {MEAL_TYPES.map(t => {
                                        const active = dayMenu.type === t.id;
                                        return (
                                            <TouchableOpacity key={t.id} onPress={() => changeType(t.id)}
                                                style={[s.typeChip, active && { backgroundColor: t.color, borderColor: t.color }]}>
                                                <Text style={{ fontSize: 18 }}>{t.emoji}</Text>
                                                <Text style={[s.typeChipText, active && { color: '#fff' }]}>{t.label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Recipe picker — Home Cooked only */}
                            {dayMenu.type === 'home' && (
                                <View>
                                    <Text style={s.sectionLabel}>Recipe</Text>

                                    {/* Selected recipe card */}
                                    {recipe ? (
                                        <View style={s.selectedRecipeCard}>
                                            <Text style={{ fontSize: 36 }}>{recipe.emoji}</Text>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 16, fontWeight: '900', color: C.text }}>{recipe.name}</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                                    <Clock size={11} color={C.sub} />
                                                    <Text style={{ fontSize: 11, fontWeight: '700', color: C.sub }}>{recipe.prepTime}</Text>
                                                </View>
                                                {recipe.ingredients.length > 0 && (
                                                    <Text style={{ fontSize: 11, color: C.sub, marginTop: 2 }} numberOfLines={1}>
                                                        {recipe.ingredients.slice(0, 3).join(' · ')}
                                                    </Text>
                                                )}
                                            </View>
                                            <TouchableOpacity onPress={() => { updateDayMenu(day, { recipeId: undefined, recipeName: undefined }); setHomeCookedMode(null); }} style={s.changeBtn}>
                                                <Text style={s.changeBtnText}>Change</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : homeCookedMode == null ? (
                                        /* Two-option picker */
                                        <View style={{ gap: 10 }}>
                                            <TouchableOpacity onPress={() => setHomeCookedMode('topVoted')}
                                                style={[s.pickRecipeBtn, { backgroundColor: C.accentBg, borderColor: C.accent }]}>
                                                <Sparkles size={20} color={C.accent} />
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 14, fontWeight: '800', color: C.accent }}>Top Voted Meals</Text>
                                                    <Text style={{ fontSize: 11, color: C.sub, marginTop: 1 }}>From this week&apos;s poll results</Text>
                                                </View>
                                                <ChevronRight size={16} color={C.accent} />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => setHomeCookedMode('browse')}
                                                style={s.pickRecipeBtn}>
                                                <BookOpen size={20} color={C.accent} />
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 14, fontWeight: '800', color: C.accent }}>Browse All Meals</Text>
                                                    <Text style={{ fontSize: 11, color: C.sub, marginTop: 1 }}>Search the full meal bank</Text>
                                                </View>
                                                <ChevronRight size={16} color={C.accent} />
                                            </TouchableOpacity>
                                        </View>
                                    ) : homeCookedMode === 'topVoted' ? (
                                        /* Top voted inline list */
                                        <View style={{ gap: 8 }}>
                                            <TouchableOpacity onPress={() => setHomeCookedMode(null)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                                <X size={14} color={C.sub} />
                                                <Text style={{ fontSize: 12, fontWeight: '700', color: C.sub }}>Back</Text>
                                            </TouchableOpacity>
                                            {topVotedRecipes.length === 0 ? (
                                                <Text style={{ fontSize: 13, color: C.sub, fontWeight: '600', textAlign: 'center', paddingVertical: 12 }}>No voted recipes yet. Browse all meals instead.</Text>
                                            ) : topVotedRecipes.map((r, i) => {
                                                const isScheduled = scheduledRecipeIds.includes(r.id);
                                                return (
                                                    <TouchableOpacity key={r.id} onPress={() => { updateDayMenu(day, { type: 'home', recipeId: r.id, recipeName: r.name }); setHomeCookedMode(null); }}
                                                        style={[s.recipeCard, { paddingVertical: 10 }]}>
                                                        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: i === 0 ? '#FEF3C7' : C.muted, alignItems: 'center', justifyContent: 'center', marginRight: 2 }}>
                                                            <Text style={{ fontSize: 13, fontWeight: '900', color: i === 0 ? C.gold : C.sub }}>{i + 1}</Text>
                                                        </View>
                                                        <Text style={{ fontSize: 24, marginRight: 4 }}>{r.emoji}</Text>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={s.recipeName} numberOfLines={1}>{r.name}</Text>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                                                <Text style={{ fontSize: 10, fontWeight: '700', color: C.accent }}>{r.votes} votes</Text>
                                                                {isScheduled && (
                                                                    <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                                                                        <Text style={{ fontSize: 9, fontWeight: '900', color: '#92400E' }}>SCHEDULED</Text>
                                                                    </View>
                                                                )}
                                                            </View>
                                                        </View>
                                                        <ChevronRight size={14} color={C.accent} />
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    ) : homeCookedMode === 'browse' ? (
                                        /* Inline recipe bank — avoids nested modal issues */
                                        <View style={{ gap: 8 }}>
                                            <TouchableOpacity onPress={() => { setHomeCookedMode(null); setBrowseSearch(''); setBrowseCuisine(null); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                                <X size={14} color={C.sub} />
                                                <Text style={{ fontSize: 12, fontWeight: '700', color: C.sub }}>Back</Text>
                                            </TouchableOpacity>
                                            <View style={[s.searchBar, { marginBottom: 4 }]}>
                                                <Search size={14} color={C.sub} />
                                                <TextInput
                                                    value={browseSearch}
                                                    onChangeText={setBrowseSearch}
                                                    placeholder="Search meals…"
                                                    placeholderTextColor="#CBD5E1"
                                                    style={[s.searchInput, { fontSize: 13 }]}
                                                    autoFocus
                                                />
                                            </View>
                                            {/* Cuisine filter chips */}
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 4 }}>
                                                <TouchableOpacity onPress={() => setBrowseCuisine(null)} style={[s.filterChip, !browseCuisine && s.filterChipActive]}>
                                                    <Text style={[s.filterChipText, !browseCuisine && { color: '#fff' }]}>All</Text>
                                                </TouchableOpacity>
                                                {[...new Set(recipes.map(r => r.cuisine))].map(c => {
                                                    const active = browseCuisine === c;
                                                    return (
                                                        <TouchableOpacity key={c} onPress={() => setBrowseCuisine(active ? null : c)} style={[s.filterChip, active && { backgroundColor: C.dark, borderColor: C.dark }]}>
                                                            <Text style={[s.filterChipText, active && { color: '#fff' }]}>{c}</Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </ScrollView>
                                            {recipes
                                                .filter(r =>
                                                    (!browseSearch || r.name.toLowerCase().includes(browseSearch.toLowerCase()) || r.cuisine.toLowerCase().includes(browseSearch.toLowerCase())) &&
                                                    (!browseCuisine || r.cuisine === browseCuisine)
                                                )
                                                .slice(0, 12)
                                                .map(r => {
                                                    const cc = CUISINE_COLORS[r.cuisine] ?? { bg: '#F1F5F9', text: C.sub };
                                                    return (
                                                        <TouchableOpacity key={r.id}
                                                            onPress={() => { updateDayMenu(day, { type: 'home', recipeId: r.id, recipeName: r.name }); setHomeCookedMode(null); setBrowseSearch(''); setBrowseCuisine(null); }}
                                                            style={[s.recipeCard, { paddingVertical: 10 }]}>
                                                            <Text style={{ fontSize: 22, marginRight: 4 }}>{r.emoji}</Text>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={s.recipeName} numberOfLines={1}>{r.name}</Text>
                                                                <View style={{ backgroundColor: cc.bg, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5, alignSelf: 'flex-start', marginTop: 2 }}>
                                                                    <Text style={{ fontSize: 8, fontWeight: '900', color: cc.text }}>{r.cuisine.toUpperCase()}</Text>
                                                                </View>
                                                            </View>
                                                            <ChevronRight size={14} color={C.accent} />
                                                        </TouchableOpacity>
                                                    );
                                                })
                                            }
                                            {recipes.filter(r =>
                                                (!browseSearch || r.name.toLowerCase().includes(browseSearch.toLowerCase()) || r.cuisine.toLowerCase().includes(browseSearch.toLowerCase())) &&
                                                (!browseCuisine || r.cuisine === browseCuisine)
                                            ).length === 0 && (
                                                <Text style={{ fontSize: 13, color: C.sub, fontWeight: '600', textAlign: 'center', paddingVertical: 12 }}>No meals found</Text>
                                            )}
                                        </View>
                                    ) : null}

                                    {/* Existing meals on other days — reference badges */}
                                    {scheduledRecipeIds.length > 0 && !recipe && (
                                        <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                            <Text style={{ fontSize: 10, fontWeight: '700', color: C.sub, width: '100%', marginBottom: 2 }}>ALREADY SCHEDULED THIS WEEK</Text>
                                            {Object.entries(weekMenu)
                                                .filter(([d, m]) => d !== day && m?.recipeName)
                                                .map(([d, m]) => (
                                                    <View key={d} style={{ backgroundColor: C.muted, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                        <Text style={{ fontSize: 9, fontWeight: '900', color: C.sub }}>{d}</Text>
                                                        <Text style={{ fontSize: 10, fontWeight: '700', color: C.text }} numberOfLines={1}>{m?.recipeName}</Text>
                                                    </View>
                                                ))}
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* Cook selector */}
                            {dayMenu.type === 'home' && (
                                <View>
                                    <Text style={s.sectionLabel}>Who&apos;s Cooking?</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                                        {familyMembers.map(m => {
                                            const active = (localCook ?? dayMenu?.cook) === m.name;
                                            return (
                                                <TouchableOpacity key={m.name} onPress={() => changeCook(m.name)}
                                                    style={[s.cookChip, active && { borderColor: C.accent, backgroundColor: C.accentBg }]}>
                                                    <InitialsAvatar name={m.name} avatar={m.avatar} size={40} accentColor={active ? C.accent : C.sub} />
                                                    <Text style={[s.cookChipName, active && { color: C.accent }]}>{m.name}</Text>
                                                    {active && <CheckCircle2 size={14} color={C.accent} />}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            )}

                            {/* Dining out / takeout note */}
                            {dayMenu.type !== 'home' && (
                                <View>
                                    <Text style={s.sectionLabel}>{dayMenu.type === 'dining_out' ? 'Restaurant' : dayMenu.type === 'to_go' ? 'Order From' : 'Notes'}</Text>
                                    <TextInput
                                        value={note}
                                        onChangeText={setNote}
                                        onBlur={() => updateDayMenu(day, { note: note.trim() || undefined })}
                                        placeholder={dayMenu.type === 'dining_out' ? 'e.g. Nobu, Sushi Roku…' : dayMenu.type === 'to_go' ? 'e.g. DoorDash, Thai Palace…' : 'Any notes…'}
                                        placeholderTextColor="#CBD5E1"
                                        style={s.input}
                                    />
                                </View>
                            )}

                            {/* Note for home meals */}
                            {dayMenu.type === 'home' && (
                                <View>
                                    <Text style={s.sectionLabel}>Note</Text>
                                    {editingNote ? (
                                        <View style={{ gap: 10 }}>
                                            <TextInput value={note} onChangeText={setNote} multiline
                                                placeholder="Add a dinner note…" placeholderTextColor="#CBD5E1"
                                                style={[s.input, { height: 80, textAlignVertical: 'top' }]} autoFocus />
                                            <TouchableOpacity onPress={saveNote} style={s.saveNoteBtn}>
                                                <Text style={s.saveNoteBtnText}>Save Note</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <TouchableOpacity onPress={() => setEditingNote(true)} style={s.noteField}>
                                            <StickyNote size={16} color={note ? C.amber : C.sub} />
                                            <Text style={[s.noteFieldText, note && { color: C.text }]} numberOfLines={2}>
                                                {note || 'Add a note…'}
                                            </Text>
                                            <Edit2 size={14} color={C.sub} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </ScrollView>

                        {/* Done */}
                        <View style={s.manageDayFooter}>
                            <TouchableOpacity onPress={onClose} style={s.primaryBtn}>
                                <CheckCircle2 size={18} color="#fff" />
                                <Text style={s.primaryBtnText}>Save Plan</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
            <RecipeBankModal visible={bankOpen} onClose={() => setBankOpen(false)}
                onSelect={r => { updateDayMenu(day, { type: 'home', recipeId: r.id, recipeName: r.name }); setBankOpen(false); }} />
        </>
    );
}

// ─── Modal: Voting ────────────────────────────────────────────────────────────
function VotingModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const { recipes, voteForRecipe, currentUser, familyMembers, checkAndAdvanceVotingPhase, menuPhase } = useHuddleStore();
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [editingVote, setEditingVote] = useState(false);
    const NEEDS = Math.min(7, recipes.length);
    const userHasVoted = recipes.some(r => r.votedBy.includes(currentUser));
    const totalVoters = new Set(recipes.flatMap(r => r.votedBy)).size;
    const familySize = familyMembers.length;
    const progress = Math.min(totalVoters / Math.max(familySize, 1), 1);
    const maxVotes = useMemo(() => Math.max(...recipes.map(r => r.votes), 1), [recipes]);

    // Deadline: next Sunday 00:00
    const deadline = useMemo(() => {
        const now = new Date();
        const sun = new Date(now);
        sun.setDate(now.getDate() + (7 - now.getDay()) % 7 || 7);
        sun.setHours(0, 0, 0, 0);
        return sun;
    }, []);
    const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / 86400000);

    const toggle = (id: string) => {
        const next = new Set(selected);
        if (next.has(id)) { next.delete(id); } else if (next.size < NEEDS) { next.add(id); }
        setSelected(next);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const submitVotes = () => {
        selected.forEach(id => voteForRecipe(id, currentUser));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setEditingVote(false);
        checkAndAdvanceVotingPhase(familySize);
        onClose();
    };

    const startEditVote = () => {
        const currentVotes = new Set(recipes.filter(r => r.votedBy.includes(currentUser)).map(r => r.id));
        setSelected(currentVotes);
        setEditingVote(true);
    };

    if (userHasVoted && !editingVote) {
        return (
            <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
                <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
                    <View style={s.fullHeader}>
                        <View>
                            <Text style={s.fullTitle}>📊  Live Tally</Text>
                            <Text style={s.fullSub}>{totalVoters} of {familySize} voted · closes {daysLeft <= 1 ? 'tomorrow' : `in ${daysLeft} days`}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={s.closeIconBtn}><X size={20} color={C.sub} /></TouchableOpacity>
                    </View>

                    <View style={{ paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: C.sub }}>Family participation</Text>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: progress >= 1 ? C.green : C.accent }}>{Math.round(progress * 100)}%{progress >= 1 ? ' · Vote closed!' : ''}</Text>
                        </View>
                        <VoteBar pct={progress} color={progress >= 1 ? C.green : C.accent} />
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
                        {[...recipes].sort((a, b) => b.votes - a.votes).map((r, i) => (
                            <View key={r.id} style={s.liveResultRow}>
                                <View style={[s.rankBadge, i < 3 && r.votes > 0 && { backgroundColor: [C.gold, '#C0C0C0', '#CD7F32'][i] }]}>
                                    <Text style={{ fontSize: 11, fontWeight: '900', color: '#fff' }}>{i + 1}</Text>
                                </View>
                                <Text style={{ fontSize: 24 }}>{r.emoji}</Text>
                                <View style={{ flex: 1, gap: 4 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 14, fontWeight: '800', color: C.text }} numberOfLines={1}>{r.name}</Text>
                                        <Text style={{ fontSize: 12, fontWeight: '800', color: i === 0 && r.votes > 0 ? C.gold : C.accent }}>{r.votes}</Text>
                                    </View>
                                    <VoteBar pct={r.votes / maxVotes} color={i === 0 && r.votes > 0 ? C.gold : i < 3 ? C.accent : '#CBD5E1'} />
                                    {r.votedBy.length > 0 && <AvatarStack names={r.votedBy} size={16} />}
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                    <View style={s.votingFooter}>
                        <TouchableOpacity onPress={startEditVote} style={[s.primaryBtn, { backgroundColor: C.sub }]}>
                            <Edit2 size={18} color="#fff" />
                            <Text style={s.primaryBtnText}>Edit My Vote</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>
        );
    }

    return (
        <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
            <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
                <View style={s.fullHeader}>
                    <View>
                        <Text style={s.fullTitle}>🗳  Next Week&apos;s Vote</Text>
                        <Text style={s.fullSub}>Pick up to {NEEDS} meals · closes Sunday</Text>
                    </View>
                    <TouchableOpacity onPress={() => { setEditingVote(false); onClose(); }} style={s.closeIconBtn}><X size={20} color={C.sub} /></TouchableOpacity>
                </View>

                {/* Vote deadline banner */}
                <View style={{ paddingHorizontal: 24, paddingVertical: 12, backgroundColor: C.accentBg, borderBottomWidth: 1, borderBottomColor: C.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Clock size={12} color={C.accent} />
                            <Text style={{ fontSize: 11, fontWeight: '800', color: C.accent }}>Mon 00:00 → Sun 00:00 · {daysLeft <= 1 ? 'closes tomorrow' : `${daysLeft} days left`}</Text>
                        </View>
                        <Text style={{ fontSize: 11, fontWeight: '900', color: progress >= 1 ? C.green : C.accent }}>{totalVoters}/{familySize} voted{progress >= 1 ? ' ✓' : ''}</Text>
                    </View>
                    <VoteBar pct={progress} color={progress >= 1 ? C.green : C.accent} />
                </View>

                <View style={{ paddingHorizontal: 24, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
                    <View style={[s.selectionPill, selected.size >= NEEDS && { backgroundColor: C.accent }]}>
                        <Text style={[s.selectionPillText, selected.size >= NEEDS && { color: '#fff' }]}>
                            {selected.size} / {NEEDS} selected{selected.size >= NEEDS ? ' — Ready to submit!' : ''}
                        </Text>
                    </View>
                </View>

                <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
                    {recipes.map(r => {
                        const sel = selected.has(r.id);
                        return (
                            <TouchableOpacity key={r.id} onPress={() => toggle(r.id)}
                                style={[s.voteCard, sel && s.voteCardSelected]} activeOpacity={0.85}>
                                <Text style={{ fontSize: 28 }}>{r.emoji}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={[s.voteName, sel && { color: C.accent }]}>{r.name}</Text>
                                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 3 }}>
                                        <Text style={s.voteSub}>{r.cuisine}</Text>
                                        <Text style={s.voteSub}>·</Text>
                                        <Text style={s.voteSub}>{r.prepTime}</Text>
                                    </View>
                                </View>
                                <View style={[s.voteCheck, sel && { backgroundColor: C.accent, borderColor: C.accent }]}>
                                    {sel && <Check size={14} color="#fff" strokeWidth={3} />}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <View style={s.votingFooter}>
                    <TouchableOpacity onPress={selected.size > 0 ? submitVotes : undefined}
                        style={[s.primaryBtn, selected.size === 0 && { opacity: 0.4 }]}>
                        <Vote size={18} color="#fff" />
                        <Text style={s.primaryBtnText}>Submit My Votes ({selected.size})</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

// ─── Modal: Results / Schedule Next Week ─────────────────────────────────────
function ResultsModal({ visible, onClose, startOnSchedule }: { visible: boolean; onClose: () => void; startOnSchedule?: boolean }) {
    const { recipes, finalizeMenu, setMenuPhase, menuPhase, updateWeekMenu, startNextWeek } = useHuddleStore();
    const sorted = useMemo(() => [...recipes].filter(r => r.votes > 0).sort((a, b) => b.votes - a.votes), [recipes]);
    const totalVoters = new Set(recipes.flatMap(r => r.votedBy)).size;
    // day assignments: day → recipeId
    const [assignments, setAssignments] = useState<Record<string, string>>({});
    const [view, setView] = useState<'results' | 'schedule'>('results');

    useEffect(() => {
        if (visible) {
            // pre-populate with top voted
            const auto: Record<string, string> = {};
            ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].forEach((d, i) => {
                if (sorted[i]) auto[d] = sorted[i].id;
            });
            setAssignments(auto);
            setView(startOnSchedule ? 'schedule' : 'results');
        }
    }, [visible, sorted.length]);

    const confirmSchedule = () => {
        const updates: Record<string, DayMenu> = {};
        Object.entries(assignments).forEach(([d, rid]) => {
            const r = recipes.find(rec => rec.id === rid);
            if (r) updates[d] = { type: 'home', recipeId: r.id, recipeName: r.name };
        });
        // Also mark unassigned days as home
        DAYS.forEach(d => { if (!updates[d]) updates[d] = { type: 'home' }; });
        Object.entries(updates).forEach(([d, m]) => updateWeekMenu({ [d]: m }));
        finalizeMenu(new Date().toISOString().split('T')[0]);
        setMenuPhase('finalized');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onClose();
    };

    const [selectedDay, setSelectedDay] = useState(DAYS[0]);

    if (view === 'schedule') {
        const assigned = recipes.find(r => r.id === assignments[selectedDay]);
        return (
            <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
                <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
                    <View style={s.fullHeader}>
                        <TouchableOpacity onPress={() => setView('results')} style={s.closeIconBtn}>
                            <ChevronRight size={18} color={C.sub} style={{ transform: [{ rotate: '180deg' }] }} />
                        </TouchableOpacity>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={s.fullTitle}>📅  Schedule Next Week</Text>
                            <Text style={s.fullSub}>Select a day · tap a meal to assign</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={s.closeIconBtn}><X size={20} color={C.sub} /></TouchableOpacity>
                    </View>

                    {/* Day carousel */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 20, paddingVertical: 14 }}>
                        {DAYS.map(d => {
                            const r = recipes.find(rec => rec.id === assignments[d]);
                            const isSelected = selectedDay === d;
                            return (
                                <TouchableOpacity key={d} onPress={() => setSelectedDay(d)}
                                    style={{ width: 76, alignItems: 'center', gap: 4, backgroundColor: isSelected ? C.accentBg : C.card, borderRadius: 14, padding: 10, borderWidth: isSelected ? 2 : 1, borderColor: isSelected ? C.accent : C.border }}>
                                    <Text style={{ fontSize: 9, fontWeight: '900', color: isSelected ? C.accent : C.sub, textTransform: 'uppercase', letterSpacing: 0.8 }}>{d}</Text>
                                    <Text style={{ fontSize: 20 }}>{r ? r.emoji : '·'}</Text>
                                    <Text style={{ fontSize: 8, fontWeight: '700', color: r ? C.text : C.sub, textAlign: 'center' }} numberOfLines={2}>{r ? r.name : 'Free'}</Text>
                                    {r && (
                                        <TouchableOpacity onPress={() => setAssignments(p => { const n = { ...p }; delete n[d]; return n; })}
                                            style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                                            <X size={10} color="#ef4444" strokeWidth={3} />
                                        </TouchableOpacity>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Current day indicator */}
                    <View style={{ paddingHorizontal: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '900', color: C.accent }}>{DAY_FULL[DAYS.indexOf(selectedDay)]}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: C.sub }}>→</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: assigned ? C.text : C.sub }}>
                            {assigned ? `${assigned.emoji} ${assigned.name}` : 'Tap a meal to assign'}
                        </Text>
                    </View>

                    {/* Vote results list — tap to assign */}
                    <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }} showsVerticalScrollIndicator={false}>
                        <Text style={{ fontSize: 10, fontWeight: '900', color: C.sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Tap to assign to {selectedDay}</Text>
                        {sorted.map((r, i) => {
                            const active = assignments[selectedDay] === r.id;
                            const scheduledDays = DAYS.filter(d => d !== selectedDay && assignments[d] === r.id);
                            return (
                                <TouchableOpacity key={r.id} onPress={() => setAssignments(p => active ? (() => { const n = { ...p }; delete n[selectedDay]; return n; })() : ({ ...p, [selectedDay]: r.id }))}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: active ? C.accentBg : C.card, borderRadius: 14, padding: 14, borderWidth: active ? 2 : 1, borderColor: active ? C.accent : C.border }}>
                                    <View style={[s.rankBadge, i < 3 && { backgroundColor: ['#F59E0B', '#94A3B8', '#CD7F32'][i] }]}>
                                        <Text style={{ fontSize: 11, fontWeight: '900', color: '#fff' }}>{i + 1}</Text>
                                    </View>
                                    <Text style={{ fontSize: 22 }}>{r.emoji}</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '800', color: active ? C.accent : C.text }} numberOfLines={1}>{r.name}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                            <Text style={{ fontSize: 10, fontWeight: '700', color: C.sub }}>{r.votes} votes</Text>
                                            {scheduledDays.length > 0 && (
                                                <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 }}>
                                                    <Text style={{ fontSize: 8, fontWeight: '900', color: '#92400E' }}>Also: {scheduledDays.join(', ')}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                    {active && <CheckCircle2 size={18} color={C.accent} />}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                    <View style={s.votingFooter}>
                        <TouchableOpacity onPress={confirmSchedule} style={s.primaryBtn}>
                            <CheckCircle2 size={18} color="#fff" />
                            <Text style={s.primaryBtnText}>Set This Week&apos;s Menu</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>
        );
    }

    return (
        <Modal visible={visible} animationType="none" transparent statusBarTranslucent>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.45)' }}>
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
                <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '82%', overflow: 'hidden' }}>
                    {/* Handle */}
                    <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
                        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.border }} />
                    </View>
                    <View style={[s.fullHeader, { paddingBottom: 8 }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.fullTitle}>🏆  Vote Results</Text>
                            <Text style={s.fullSub}>{totalVoters} member{totalVoters !== 1 ? 's' : ''} voted</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={s.closeIconBtn}><X size={20} color={C.sub} /></TouchableOpacity>
                    </View>

                    {sorted.length === 0 ? (
                        <View style={{ alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                            <Text style={{ fontSize: 48 }}>🗳️</Text>
                            <Text style={{ fontSize: 15, fontWeight: '800', color: C.sub, marginTop: 12, textAlign: 'center' }}>No votes yet</Text>
                            <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 6, textAlign: 'center' }}>Voting closes Sunday midnight</Text>
                        </View>
                    ) : (
                        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 8, gap: 8 }} showsVerticalScrollIndicator={false}>
                            {sorted.map((r, i) => (
                                <View key={r.id} style={[s.liveResultRow, { paddingVertical: 10 }]}>
                                    <View style={[s.rankBadge, i < 3 && { backgroundColor: ['#F59E0B', '#94A3B8', '#CD7F32'][i] }]}>
                                        <Text style={{ fontSize: 11, fontWeight: '900', color: '#fff' }}>{i + 1}</Text>
                                    </View>
                                    <Text style={{ fontSize: 20 }}>{r.emoji}</Text>
                                    <View style={{ flex: 1, gap: 3 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text style={{ fontSize: 13, fontWeight: '800', color: C.text }} numberOfLines={1}>{r.name}</Text>
                                            <Text style={{ fontSize: 11, fontWeight: '800', color: i === 0 ? C.gold : C.accent }}>{r.votes} {r.votes === 1 ? 'vote' : 'votes'}</Text>
                                        </View>
                                        {r.votedBy.length > 0 && <AvatarStack names={r.votedBy} size={16} />}
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    )}

                    {menuPhase !== 'finalized' && (
                        <View style={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 28, borderTopWidth: 1, borderTopColor: C.border }}>
                            <TouchableOpacity onPress={() => setView('schedule')} style={s.primaryBtn} disabled={sorted.length === 0}>
                                <Sparkles size={18} color="#fff" />
                                <Text style={s.primaryBtnText}>Schedule Next Week →</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

// ─── Modal: Next Week Read-Only View ─────────────────────────────────────────
function NextWeekViewModal({ visible, onClose, onEdit }: { visible: boolean; onClose: () => void; onEdit: () => void }) {
    const { weekMenu, recipes } = useHuddleStore();
    return (
        <Modal visible={visible} animationType="none" transparent statusBarTranslucent>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.45)' }}>
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
                <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%', overflow: 'hidden' }}>
                    <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
                        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.border }} />
                    </View>
                    <View style={[s.fullHeader, { paddingBottom: 8 }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.fullTitle}>📅  Next Week&apos;s Menu</Text>
                            <Text style={s.fullSub}>Finalized plan</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={s.closeIconBtn}><X size={20} color={C.sub} /></TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
                        {DAYS.map(d => {
                            const dm = weekMenu?.[d as keyof typeof weekMenu];
                            const recipe = dm?.recipeId ? recipes.find(r => r.id === dm.recipeId) : null;
                            const mt = MEAL_TYPES.find(m => m.id === dm?.type);
                            return (
                                <View key={d} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border }}>
                                    <Text style={{ fontSize: 11, fontWeight: '900', color: C.sub, width: 28, textTransform: 'uppercase', letterSpacing: 0.6 }}>{d}</Text>
                                    <Text style={{ fontSize: 24 }}>{recipe?.emoji ?? mt?.emoji ?? '🍽️'}</Text>
                                    <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: C.text }} numberOfLines={1}>{recipe?.name ?? mt?.label ?? 'Free day'}</Text>
                                </View>
                            );
                        })}
                    </ScrollView>
                    <View style={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 28, borderTopWidth: 1, borderTopColor: C.border }}>
                        <TouchableOpacity onPress={onEdit} style={s.primaryBtn}>
                            <Sparkles size={18} color="#fff" />
                            <Text style={s.primaryBtnText}>Edit Plan</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ─── Modal: Archive ───────────────────────────────────────────────────────────
function ArchiveModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const { pastMenus, recipes } = useHuddleStore();
    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
                <View style={s.fullHeader}>
                    <View>
                        <Text style={s.fullTitle}>📅  Past Menus</Text>
                        <Text style={s.fullSub}>{pastMenus.length} archived weeks</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={s.closeIconBtn}><X size={20} color={C.sub} /></TouchableOpacity>
                </View>
                {pastMenus.length === 0 ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 48 }}>📭</Text>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: C.sub, marginTop: 12 }}>No past menus yet</Text>
                        <Text style={{ fontSize: 13, color: '#94A3B8', marginTop: 6 }}>Finalize a week&apos;s menu to archive it</Text>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
                        {pastMenus.map(pm => (
                            <View key={pm.id} style={s.archiveCard}>
                                <Text style={s.archiveWeek}>Week of {pm.weekStarting}</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                                    {DAYS.map(d => {
                                        const m = pm.menu[d];
                                        const r = m?.recipeId ? recipes.find(rec => rec.id === m.recipeId) : null;
                                        return (
                                            <View key={d} style={s.archiveDayPill}>
                                                <Text style={s.archiveDayLabel}>{d}</Text>
                                                <Text style={{ fontSize: 18 }}>{r ? r.emoji : mealTypeConfig(m?.type).emoji}</Text>
                                                <Text style={s.archiveDayName} numberOfLines={2}>{m?.recipeName ?? mealTypeConfig(m?.type).label ?? '—'}</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </SafeAreaView>
        </Modal>
    );
}

// ─── Day pill in the week strip ───────────────────────────────────────────────
function DayPill({ day, idx, isToday, isPast, onPress }: { day: string; idx: number; isToday: boolean; isPast: boolean; onPress: () => void }) {
    const { weekMenu, recipes } = useHuddleStore();
    const menu = weekMenu[day];
    const recipe = recipes.find(r => r.id === menu?.recipeId || r.name === menu?.recipeName);
    const mt = mealTypeConfig(menu?.type);
    const emoji = dayEmoji(menu, recipe);
    const hasContent = menu?.recipeName || menu?.type !== 'home';

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}
            style={[s.dayPill, isToday && s.dayPillToday, isPast && { opacity: 0.45 }]}>
            {/* Day label */}
            <Text style={[s.dayPillLabel, isToday && { color: C.accent }]}>{day}</Text>

            {/* Emoji */}
            <View style={[s.dayPillEmoji, isToday && { backgroundColor: C.accentBg }, isPast && { backgroundColor: '#CBD5E1' }]}>
                <Text style={{ fontSize: 22 }}>{emoji}</Text>
                {isToday && (
                    <View style={s.todayDot} />
                )}
            </View>

            {/* Meal name */}
            <Text style={[s.dayPillName, isToday && { color: C.text }]} numberOfLines={2}>
                {menu?.recipeName ?? (menu?.type ? mt.label : 'Plan')}
            </Text>

            {/* Cook name */}
            {menu?.cook && (
                <Text style={{ fontSize: 9, fontWeight: '700', color: isToday ? C.accent : C.sub, textAlign: 'center', marginTop: 2 }} numberOfLines={1}>
                    {menu.cook.split(' ')[0]}
                </Text>
            )}

            {/* Type badge */}
            {menu?.type && menu.type !== 'home' && (
                <View style={[s.typeMicroBadge, { backgroundColor: mt.bg }]}>
                    <Text style={{ fontSize: 8, fontWeight: '800', color: mt.color }}>{mt.label}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

// ─── Modal: Meal History (52-week dates this meal was served) ─────────────────
function MealHistoryModal({ visible, onClose, recipeName, emoji }: { visible: boolean; onClose: () => void; recipeName: string; emoji: string }) {
    const { pastMenus } = useHuddleStore();
    // Find all past weeks where this meal appeared
    const history = useMemo(() => {
        const results: { weekStarting: string; day: string; cook?: string }[] = [];
        pastMenus.forEach(pm => {
            DAYS.forEach(d => {
                const m = pm.menu[d];
                if (m?.recipeName === recipeName) {
                    results.push({ weekStarting: pm.weekStarting, day: d, cook: m.cook });
                }
            });
        });
        return results;
    }, [pastMenus, recipeName]);

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
                <View style={s.fullHeader}>
                    <View>
                        <Text style={s.fullTitle}>{emoji}  {recipeName}</Text>
                        <Text style={s.fullSub}>Served {history.length} time{history.length !== 1 ? 's' : ''} in the last year</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={s.closeIconBtn}><X size={20} color={C.sub} /></TouchableOpacity>
                </View>
                {history.length === 0 ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 40 }}>📅</Text>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: C.sub, marginTop: 12 }}>No history yet</Text>
                        <Text style={{ fontSize: 13, color: '#94A3B8', marginTop: 6 }}>This meal hasn&apos;t been tracked yet</Text>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={{ padding: 20, gap: 10 }}>
                        <Text style={[s.sectionLabel, { marginBottom: 4 }]}>Past dates served</Text>
                        {history.map((h, i) => (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border }}>
                                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.accentBg, alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ fontSize: 11, fontWeight: '900', color: C.accent, textAlign: 'center' }}>{h.day}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '800', color: C.text }}>Week of {h.weekStarting}</Text>
                                    {h.cook && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                                            <ChefHat size={11} color={C.sub} />
                                            <Text style={{ fontSize: 12, fontWeight: '600', color: C.sub }}>{h.cook}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </SafeAreaView>
        </Modal>
    );
}

// ─── Tonight Hero Card ────────────────────────────────────────────────────────
function TonightCard({ todayDay, todayIdx }: { todayDay: string; todayIdx: number }) {
    const { weekMenu, recipes } = useHuddleStore();
    const menu = weekMenu[todayDay];
    const recipe = recipes.find(r => r.id === menu?.recipeId || r.name === menu?.recipeName);
    const mt = mealTypeConfig(menu?.type);
    const emoji = dayEmoji(menu, recipe);
    const [showHistory, setShowHistory] = useState(false);
    const recipeName = menu?.recipeName ?? mt.label;

    return (
        <>
        <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowHistory(true); }}
            style={s.tonightCard}
        >
            <View style={{ flex: 1 }}>
                <Text style={s.tonightSubLabel}>{DAY_FULL[todayIdx]}</Text>
                <Text style={s.tonightMealName} numberOfLines={1}>{recipeName}</Text>
                {menu?.cook && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                        <ChefHat size={12} color={C.sub} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: C.sub }}>{menu.cook}</Text>
                    </View>
                )}
                <Text style={{ fontSize: 10, fontWeight: '600', color: C.sub, marginTop: 6, opacity: 0.6 }}>Tap to see history →</Text>
            </View>
            <View style={s.tonightEmojiWrap}>
                <Text style={{ fontSize: 44 }}>{emoji}</Text>
            </View>
        </TouchableOpacity>
        <MealHistoryModal visible={showHistory} onClose={() => setShowHistory(false)} recipeName={recipeName} emoji={emoji} />
        </>
    );
}

// ─── Vote Timeline Banner ─────────────────────────────────────────────────────
function VoteBanner({ onPress }: { onPress: () => void }) {
    const { menuPhase, recipes, familyMembers } = useHuddleStore();
    const totalVoters = new Set(recipes.flatMap(r => r.votedBy)).size;
    const familySize = familyMembers.length;
    const progress = Math.min(totalVoters / Math.max(familySize, 1), 1);

    const now = new Date();
    const todayDow = now.getDay(); // 0=Sun,1=Mon..6=Sat
    // Current day in Mon-indexed terms: Mon=0..Sun=6
    const monIdx = todayDow === 0 ? 6 : todayDow - 1;

    // Days to Sunday: Sun is end of vote week
    const daysToSun = todayDow === 0 ? 0 : 7 - todayDow;
    const closesDate = new Date(now);
    closesDate.setDate(now.getDate() + daysToSun);
    closesDate.setHours(0, 0, 0, 0);

    const timeline = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    if (menuPhase === 'finalized') return null;

    const bgColor = menuPhase === 'voting' ? '#EEF2FF' : menuPhase === 'results' ? '#FFFBEB' : '#F0FDF4';
    const accentColor = menuPhase === 'voting' ? C.accent : menuPhase === 'results' ? C.amber : C.green;
    const statusText = menuPhase === 'voting'
        ? `${totalVoters}/${familySize} voted · closes Sun 00:00`
        : 'Voting closed — results ready';

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.85}
            style={{ backgroundColor: bgColor, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: accentColor + '30' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <Vote size={14} color={accentColor} />
                    <Text style={{ fontSize: 13, fontWeight: '900', color: accentColor }}>
                        {menuPhase === 'voting' ? 'Vote for Next Week' : 'View Results'}
                    </Text>
                </View>
                <Text style={{ fontSize: 10, fontWeight: '700', color: accentColor + 'AA' }}>{statusText}</Text>
            </View>
            {menuPhase === 'voting' && (
                <>
                    {/* Participation bar */}
                    <VoteBar pct={progress} color={accentColor} />
                    {/* Mon→Sun timeline dots */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 2 }}>
                        {timeline.map((d, i) => {
                            const isPast = i < monIdx;
                            const isCurrent = i === monIdx;
                            const isSun = i === 6;
                            return (
                                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                                    <View style={{
                                        width: isCurrent ? 24 : 18, height: isCurrent ? 24 : 18,
                                        borderRadius: 12,
                                        backgroundColor: isCurrent ? accentColor : isPast ? accentColor + '50' : isSun ? C.amber + '30' : C.border,
                                        alignItems: 'center', justifyContent: 'center',
                                        borderWidth: isSun ? 1.5 : 0, borderColor: C.amber,
                                    }}>
                                        <Text style={{ fontSize: 8, fontWeight: '900', color: isCurrent ? '#fff' : isPast ? accentColor : isSun ? C.amber : C.sub }}>{d}</Text>
                                    </View>
                                    {i < 6 && (
                                        <View style={{ position: 'absolute', top: isCurrent ? 12 : 9, left: '50%', width: '100%', height: 2, backgroundColor: isPast ? accentColor + '40' : C.border, zIndex: -1 }} />
                                    )}
                                </View>
                            );
                        })}
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                        <Text style={{ fontSize: 8, fontWeight: '700', color: accentColor }}>Opens Mon 00:00</Text>
                        <Text style={{ fontSize: 8, fontWeight: '700', color: C.amber }}>Closes Sun 00:00</Text>
                    </View>
                </>
            )}
            {menuPhase === 'results' && (
                <Text style={{ fontSize: 12, fontWeight: '700', color: accentColor, marginTop: 4 }}>
                    Tap to view results and schedule next week&apos;s menu →
                </Text>
            )}
        </TouchableOpacity>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────
function DemoWeeklyMenuSection() {
    const { menuPhase, startNextWeek, checkAndAdvanceVotingPhase, familyMembers, weekMenu, recipes } = useHuddleStore();
    const [showBank, setShowBank] = useState(false);
    const [showArchive, setShowArchive] = useState(false);
    const [showVoting, setShowVoting] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [showResultsOnSchedule, setShowResultsOnSchedule] = useState(false);
    const [showNextWeekView, setShowNextWeekView] = useState(false);
    const [managingDay, setManagingDay] = useState<string | null>(null);
    const [managingDayIsPast, setManagingDayIsPast] = useState(false);
    const carouselRef = useRef<ScrollView>(null);

    const todayIdx = getTodayIdx();
    const todayDay = DAYS[todayIdx];

    useEffect(() => {
        const offset = todayIdx * (86 + 10);
        setTimeout(() => carouselRef.current?.scrollTo({ x: offset, animated: false }), 100);
        checkAndAdvanceVotingPhase(familyMembers.length);
    }, []);


    return (
        <View style={s.root}>
            {/* ── Header bar ──────────────────────────────────────── */}
            <View style={s.headerBar}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={s.headerIcon}>
                        <ChefHat size={18} color={C.accent} />
                    </View>
                    <View>
                        <Text style={s.headerTitle}>Dinner Planner</Text>
                        <Text style={s.headerSub}>This week&apos;s menu</Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TouchableOpacity
                        onPress={() => menuPhase === 'results' || menuPhase === 'finalized' ? setShowResults(true) : setShowVoting(true)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.accentBg, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: C.accent + '40' }}>
                        <Vote size={14} color={C.accent} />
                        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: menuPhase === 'voting' ? C.green : menuPhase === 'results' ? C.amber : C.accent }} />
                        <Text style={{ fontSize: 11, fontWeight: '800', color: C.accent }}>
                            {menuPhase === 'voting' ? 'Open' : menuPhase === 'results' ? 'Results' : 'Done'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowArchive(true)} style={s.headerActionBtn}>
                        <History size={16} color={C.sub} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowBank(true)} style={s.headerActionBtn}>
                        <BookOpen size={16} color={C.sub} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Tonight hero card ──────────────────────────────── */}
            <TonightCard todayDay={todayDay} todayIdx={todayIdx} />

            {/* ── Next Week preview — compact single-line strip (when finalized) ── */}
            {menuPhase === 'finalized' && (
                <TouchableOpacity onPress={() => setShowNextWeekView(true)} activeOpacity={0.8}
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.accentBg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12, borderWidth: 1, borderColor: C.accent + '30', gap: 8 }}>
                    <Sparkles size={12} color={C.accent} />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: C.accent, flexShrink: 0 }}>Next Week</Text>
                    <View style={{ flex: 1, flexDirection: 'row', gap: 4, overflow: 'hidden' }}>
                        {DAYS.map(d => {
                            const dm = weekMenu?.[d as keyof typeof weekMenu];
                            const recipe = dm?.recipeId ? recipes.find(r => r.id === dm.recipeId) : null;
                            const mt = MEAL_TYPES.find(m => m.id === dm?.type);
                            return (
                                <Text key={d} style={{ fontSize: 16 }}>{recipe?.emoji ?? mt?.emoji ?? '🍽️'}</Text>
                            );
                        })}
                    </View>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: C.accent }}>Edit</Text>
                    <ChevronRight size={12} color={C.accent} />
                </TouchableOpacity>
            )}

            {/* ── Weekly day strip ───────────────────────────────── */}
            <ScrollView ref={carouselRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
                {DAYS.map((d, i) => (
                    <DayPill key={d} day={d} idx={i} isToday={i === todayIdx} isPast={i < todayIdx}
                        onPress={() => {
                            if (i < todayIdx) {
                                Alert.alert('Past Day', 'Edit a past day\'s menu?', [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Edit', onPress: () => { setManagingDayIsPast(true); setManagingDay(d); } },
                                ]);
                            } else {
                                setManagingDayIsPast(false);
                                setManagingDay(d);
                            }
                        }}
                    />
                ))}
            </ScrollView>

            {/* ── Modals ────────────────────────────────────────── */}
            <RecipeBankModal visible={showBank} onClose={() => setShowBank(false)} />
            <ArchiveModal visible={showArchive} onClose={() => setShowArchive(false)} />
            <VotingModal visible={showVoting} onClose={() => setShowVoting(false)} />
            <ResultsModal visible={showResults} onClose={() => { setShowResults(false); setShowResultsOnSchedule(false); }} startOnSchedule={showResultsOnSchedule} />
            <NextWeekViewModal visible={showNextWeekView} onClose={() => setShowNextWeekView(false)} onEdit={() => { setShowNextWeekView(false); setShowResultsOnSchedule(true); setShowResults(true); }} />
            {managingDay && (
                <ManageDayModal visible={!!managingDay} day={managingDay} isPast={managingDayIsPast} onClose={() => setManagingDay(null)} />
            )}
        </View>
    );
}

// ─── Stylesheet ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { marginBottom: 8 },

    // ── Header ────────────────────────────────────────────────────
    headerBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14,
    },
    headerIcon: {
        width: 38, height: 38, borderRadius: 12,
        backgroundColor: C.accentBg, alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 17, fontWeight: '900', color: C.text },
    headerSub: { fontSize: 11, fontWeight: '600', color: C.sub, marginTop: 1 },
    headerActionBtn: {
        width: 36, height: 36, borderRadius: 10, backgroundColor: C.card,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: C.border, ...SHADOW_SM,
    },

    // ── Tonight hero ──────────────────────────────────────────────
    tonightCard: {
        backgroundColor: C.card, borderRadius: 20, overflow: 'hidden',
        marginBottom: 12, padding: 20,
        borderWidth: 1, borderColor: C.border,
        flexDirection: 'row', alignItems: 'center', gap: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    tonightSubLabel: {
        fontSize: 11, fontWeight: '800', color: C.sub,
        textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 2,
    },
    tonightEmojiWrap: {
        width: 72, height: 72, borderRadius: 20,
        backgroundColor: C.accentBg,
        alignItems: 'center', justifyContent: 'center',
    },
    tonightMealName: { fontSize: 20, fontWeight: '900', color: C.text, letterSpacing: -0.3 },
    tonightMeta: { fontSize: 12, fontWeight: '600', color: C.sub },

    // ── Chef of week ──────────────────────────────────────────────
    chefBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#FFFBEB', borderRadius: 16,
        paddingHorizontal: 14, paddingVertical: 10,
        borderWidth: 1, borderColor: '#FEF3C7',
        marginBottom: 14, ...SHADOW_SM,
    },
    chefBadgeLabel: { fontSize: 10, fontWeight: '700', color: '#92400E', textTransform: 'uppercase', letterSpacing: 0.8 },
    chefBadgeName: { fontSize: 13, fontWeight: '900', color: '#78350F' },

    // ── Day strip ─────────────────────────────────────────────────
    stripTitle: {
        fontSize: 12, fontWeight: '800', color: C.sub,
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
    },
    dayPill: {
        width: 86, backgroundColor: C.card, borderRadius: 20, padding: 12,
        alignItems: 'center', borderWidth: 1, borderColor: C.border,
        gap: 6, ...SHADOW_SM,
    },
    dayPillToday: { borderColor: C.accent, borderWidth: 2, backgroundColor: C.accentBg },
    dayPillLabel: { fontSize: 10, fontWeight: '900', color: C.sub, textTransform: 'uppercase' },
    dayPillEmoji: {
        width: 44, height: 44, borderRadius: 14, backgroundColor: C.muted,
        alignItems: 'center', justifyContent: 'center', position: 'relative',
    },
    todayDot: {
        position: 'absolute', bottom: -3, width: 6, height: 6, borderRadius: 3,
        backgroundColor: C.accent, borderWidth: 1.5, borderColor: C.accentBg,
    },
    dayPillName: { fontSize: 10, fontWeight: '700', color: C.sub, textAlign: 'center' },
    typeMicroBadge: {
        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginTop: 2,
    },

    // ── Vote action card ──────────────────────────────────────────
    voteActionCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.card, borderRadius: 20, padding: 16,
        borderWidth: 1, borderColor: C.border, marginTop: 12, gap: 12, ...SHADOW_SM,
    },
    voteBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: C.accent, paddingHorizontal: 16, paddingVertical: 10,
        borderRadius: 14,
    },
    voteBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },

    // ── Modals shared ─────────────────────────────────────────────
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end',
    },
    sheetHandle: {
        width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2,
        alignSelf: 'center', marginTop: 12, marginBottom: 4,
    },
    closeBtn: {
        width: 38, height: 38, borderRadius: 19, backgroundColor: C.muted,
        alignItems: 'center', justifyContent: 'center',
    },
    closeIconBtn: {
        width: 38, height: 38, borderRadius: 12, backgroundColor: C.muted,
        alignItems: 'center', justifyContent: 'center',
    },
    addIconBtn: {
        width: 38, height: 38, borderRadius: 12, backgroundColor: C.accent,
        alignItems: 'center', justifyContent: 'center', ...SHADOW_SM,
    },

    // ── Full-screen modal ─────────────────────────────────────────
    fullHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 20, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card,
    },
    fullTitle: { fontSize: 22, fontWeight: '900', color: C.text },
    fullSub: { fontSize: 12, fontWeight: '600', color: C.sub, marginTop: 2 },

    // ── Recipe bank ───────────────────────────────────────────────
    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: C.muted, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    },
    searchInput: { flex: 1, fontSize: 15, fontWeight: '600', color: C.text },
    filterChip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
        backgroundColor: C.muted, borderWidth: 1, borderColor: C.border,
        alignSelf: 'flex-start',
    },
    filterChipActive: { backgroundColor: C.dark, borderColor: C.dark },
    filterChipText: { fontSize: 12, fontWeight: '800', color: C.sub },
    recipeCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: C.card, borderRadius: 16, padding: 12,
        borderWidth: 1, borderColor: C.border,
    },
    recipeEmoji: {
        width: 48, height: 48, borderRadius: 12,
        backgroundColor: C.muted, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    recipeName: { fontSize: 16, fontWeight: '900', color: C.text },
    recipeIngredients: { fontSize: 11, fontWeight: '600', color: C.sub },
    iconActionBtn: {
        width: 32, height: 32, borderRadius: 10, backgroundColor: C.accentBg,
        alignItems: 'center', justifyContent: 'center',
    },
    selectChevron: {
        width: 32, height: 32, borderRadius: 10, backgroundColor: C.accentBg,
        alignItems: 'center', justifyContent: 'center',
    },

    // ── Recipe form ───────────────────────────────────────────────
    formSheet: {
        backgroundColor: C.card, borderTopLeftRadius: 32, borderTopRightRadius: 32,
        maxHeight: '92%',
    },
    formHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: C.border,
    },
    formTitle: { fontSize: 20, fontWeight: '900', color: C.text },
    fieldLabel: {
        fontSize: 11, fontWeight: '800', color: C.sub,
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
    },
    input: {
        backgroundColor: C.muted, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
        fontSize: 15, fontWeight: '600', color: C.text, borderWidth: 1, borderColor: C.border,
    },
    diffChip: {
        flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10,
        backgroundColor: C.muted, borderWidth: 1, borderColor: C.border,
    },
    diffChipText: { fontSize: 12, fontWeight: '800', color: C.sub },

    // ── Manage day ────────────────────────────────────────────────
    manageDaySheet: {
        backgroundColor: C.card, borderTopLeftRadius: 32, borderTopRightRadius: 32,
        maxHeight: '92%', paddingBottom: 34,
    },
    manageDayHeader: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24,
        paddingTop: 8, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12,
    },
    manageDayFooter: {
        padding: 20, paddingBottom: Platform.OS === 'android' ? 20 : 0,
        borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.card,
    },
    sectionLabel: {
        fontSize: 11, fontWeight: '800', color: C.sub,
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
    },
    typeChip: {
        flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: C.muted, padding: 14, borderRadius: 16,
        borderWidth: 1, borderColor: C.border,
    },
    typeChipText: { fontSize: 12, fontWeight: '800', color: C.sub },
    selectedRecipeCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: C.accentBg, borderRadius: 18, padding: 14,
        borderWidth: 1, borderColor: C.accent + '40',
    },
    changeBtn: {
        backgroundColor: C.card, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
        borderWidth: 1, borderColor: C.border,
    },
    changeBtnText: { fontSize: 12, fontWeight: '700', color: C.text },
    pickRecipeBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: C.accentBg, borderRadius: 16, padding: 16,
        borderWidth: 1, borderStyle: 'dashed', borderColor: C.accent + '60',
    },
    cookChip: {
        alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: C.muted, borderRadius: 16, borderWidth: 1.5, borderColor: C.border,
    },
    cookChipName: { fontSize: 11, fontWeight: '800', color: C.sub },
    noteField: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: C.muted, borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: C.border,
    },
    noteFieldText: { flex: 1, fontSize: 14, fontWeight: '600', color: C.sub },
    saveNoteBtn: {
        backgroundColor: C.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center',
    },
    saveNoteBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },

    // ── Voting ────────────────────────────────────────────────────
    votingSheet: {
        backgroundColor: C.card, borderTopLeftRadius: 32, borderTopRightRadius: 32,
        maxHeight: '92%',
    },
    votingHeader: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: C.border, gap: 12,
    },
    votingFooter: {
        padding: 20, paddingBottom: Platform.OS === 'android' ? 20 : 0,
        borderTopWidth: 1, borderTopColor: C.border,
    },
    selectionPill: {
        backgroundColor: C.muted, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
        alignSelf: 'flex-start', borderWidth: 1, borderColor: C.border,
    },
    selectionPillText: { fontSize: 13, fontWeight: '800', color: C.sub },
    voteCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: C.muted, borderRadius: 18, padding: 14,
        borderWidth: 1.5, borderColor: 'transparent',
    },
    voteCardSelected: { backgroundColor: C.accentBg, borderColor: C.accent },
    voteName: { fontSize: 15, fontWeight: '800', color: C.text },
    voteSub: { fontSize: 11, fontWeight: '600', color: C.sub },
    voteCheck: {
        width: 26, height: 26, borderRadius: 13,
        borderWidth: 2, borderColor: C.border,
        backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
    },
    liveResultRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: C.muted, borderRadius: 16, padding: 12,
    },
    rankBadge: {
        width: 26, height: 26, borderRadius: 13, backgroundColor: '#CBD5E1',
        alignItems: 'center', justifyContent: 'center',
    },

    // ── Results podium ────────────────────────────────────────────
    podium: {
        flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
        paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20, gap: 8,
    },
    podiumItem: { alignItems: 'center', flex: 1, gap: 6 },
    podiumBar: {
        width: '100%', borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    },
    podiumBarText: { fontSize: 14, fontWeight: '900', color: '#fff', paddingVertical: 8 },
    podiumName: { fontSize: 11, fontWeight: '700', color: C.sub, textAlign: 'center' },

    // ── Archive ───────────────────────────────────────────────────
    archiveCard: {
        backgroundColor: C.card, borderRadius: 20, padding: 16,
        borderWidth: 1, borderColor: C.border, ...SHADOW_SM,
    },
    archiveWeek: { fontSize: 14, fontWeight: '800', color: C.text },
    archiveDayPill: {
        width: (CARD_W - 40 - 6 * 8) / 7, alignItems: 'center', gap: 4,
        backgroundColor: C.muted, borderRadius: 12, padding: 6,
    },
    archiveDayLabel: { fontSize: 8, fontWeight: '900', color: C.sub, textTransform: 'uppercase' },
    archiveDayName: { fontSize: 8, fontWeight: '700', color: C.text, textAlign: 'center' },

    // ── Shared ────────────────────────────────────────────────────
    primaryBtn: {
        backgroundColor: C.accent, borderRadius: 16, paddingVertical: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        shadowColor: C.accent, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
