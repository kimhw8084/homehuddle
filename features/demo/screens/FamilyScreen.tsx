import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Image, Dimensions,
    Modal, Pressable, StyleSheet, TextInput, Alert, Clipboard, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
    Users, Sparkles, Trophy, Heart, Zap,
    ChevronRight, ArrowUpRight, Star,
    Calendar, Info, X, Bell, Shield, Wifi,
    Dog, Cat, Gift, Target, Megaphone,
    Smile, Activity, Globe, MapPin, Phone,
    Clock, CheckCircle2, AlertTriangle, CloudSun,
    Leaf, Monitor, ShoppingBag, Quote, ExternalLink,
    Maximize2, Minimize2, ArrowLeft, ArrowRight, Settings2, Trash2,
    Pencil, MessageCircle, Send, Check, Plus, List, LayoutGrid,
    TrendingUp, Coins
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    FadeInDown, FadeInRight, useSharedValue, useAnimatedStyle,
    withSpring, withTiming, Layout, withRepeat, withSequence, Easing, FadeOut,
    SlideInRight, SlideOutLeft, runOnJS
} from 'react-native-reanimated';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useHuddleStore, WidgetConfig, WidgetSize, Announcement, AnnouncementStyle, FamilyMember, WishlistItem } from '../../../store/huddleStore';
import { Chore } from '../../../types/chores';
import { WeeklyMenuSection } from '../../../components/WeeklyMenuSection';
import { useAuthStore } from '../../../store/authStore';


const { width, height } = Dimensions.get('window');

const GOLDEN_SHADOW = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
};

// --- ANNOUNCEMENT STYLE COMPONENTS ---

const AnnouncementBox = ({ announcement, onReaction }: { announcement: Announcement, onReaction: (emoji: string) => void }) => {
    const renderStyle = () => {
        switch (announcement.style) {
            case 'instagram':
                return (
                    <LinearGradient
                        colors={['#833AB4', '#FD1D1D', '#F56040']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ borderRadius: 12, padding: 2, marginBottom: 12 }}
                    >
                        <View style={{ backgroundColor: 'white', borderRadius: 10, padding: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ fontSize: 14 }}>👤</Text>
                                </View>
                                <Text style={{ fontWeight: '900', color: '#0F172A', fontSize: 13 }}>{announcement.author}</Text>
                            </View>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B', lineHeight: 22 }}>{announcement.content}</Text>
                        </View>
                    </LinearGradient>
                );
            case 'imessage':
                return (
                    <View style={{ alignSelf: 'flex-start', maxWidth: '90%', marginBottom: 12 }}>
                        <View style={{ backgroundColor: '#007AFF', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, borderBottomLeftRadius: 4 }}>
                            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>{announcement.content}</Text>
                        </View>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8', marginTop: 4, marginLeft: 4 }}>{announcement.author} • DELIVERED</Text>
                    </View>
                );
            case 'neon':
                return (
                    <View style={{ backgroundColor: '#0F172A', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: announcement.color, shadowColor: announcement.color, shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 }}>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: 'white', textShadowColor: announcement.color, textShadowRadius: 5 }}>{announcement.content}</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: announcement.color }}>{announcement.type.toUpperCase()}</Text>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: 'white', opacity: 0.6 }}>{announcement.author}</Text>
                        </View>
                    </View>
                );
            case 'glass':
                return (
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>{announcement.content}</Text>
                        <View style={{ height: 1, backgroundColor: '#E2E8F0', marginVertical: 12 }} />
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 10 }}>👤</Text>
                            </View>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>{announcement.author}</Text>
                        </View>
                    </View>
                );
            default:
                return (
                    <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 6, borderLeftColor: announcement.color }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B' }}>{announcement.content}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginTop: 8 }}>{announcement.author} • {new Date(announcement.timestamp).toLocaleDateString()}</Text>
                    </View>
                );
        }
    };

    return (
        <View>
            {renderStyle()}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: -4, marginBottom: 16, marginLeft: 8 }}>
                {['❤️', '🎉', '🔥', '👍'].map(emoji => (
                    <TouchableOpacity
                        key={emoji}
                        onPress={() => onReaction(emoji)}
                        style={{
                            backgroundColor: (announcement.reactions?.[emoji]?.length ?? 0) > 0 ? '#EEF2FF' : 'white',
                            paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1,
                            borderColor: (announcement.reactions?.[emoji]?.length ?? 0) > 0 ? '#6366F1' : '#F1F5F9',
                            flexDirection: 'row', alignItems: 'center', gap: 4
                        }}
                    >
                        <Text style={{ fontSize: 12 }}>{emoji}</Text>
                        {(announcement.reactions?.[emoji]?.length ?? 0) > 0 && (
                            <Text style={{ fontSize: 10, fontWeight: '900', color: '#6366F1' }}>{announcement.reactions![emoji].length}</Text>
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

// --- MODAL: MANAGE ANNOUNCEMENTS ---

const ManageAnnouncementsModal = ({ visible, onClose }: { visible: boolean, onClose: () => void }) => {
    const { announcements, deleteAnnouncement, addAnnouncementReaction, currentUser } = useHuddleStore();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingAnn, setEditingAnn] = useState<Announcement | null>(null);

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
                <SafeAreaView style={{ flex: 1 }}>
                    <View style={{ padding: 24, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                            <Text style={{ fontSize: 28, fontWeight: '900', color: '#0F172A' }}>Bulletin Board</Text>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#94A3B8' }}>{announcements.length} active announcements</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24 }}>
                        {announcements.map(a => (
                            <View key={a.id}>
                                <AnnouncementBox
                                    announcement={a}
                                    onReaction={(emoji) => addAnnouncementReaction(a.id, emoji, currentUser)}
                                />
                                <View style={{ flexDirection: 'row', gap: 12, marginTop: -8, marginBottom: 24, justifyContent: 'flex-end' }}>
                                    <TouchableOpacity onPress={() => { setEditingAnn(a); setIsAddOpen(true); }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                                        <Pencil size={16} color="#64748B" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => deleteAnnouncement(a.id)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' }}>
                                        <Trash2 size={16} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </ScrollView>

                    <View style={{ padding: 24, paddingBottom: 40, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                        <TouchableOpacity
                            onPress={() => { setEditingAnn(null); setIsAddOpen(true); }}
                            style={{ backgroundColor: '#0F172A', paddingVertical: 18, borderRadius: 24, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 }}
                        >
                            <Plus size={20} color="white" strokeWidth={3} />
                            <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>Post Announcement</Text>
                        </TouchableOpacity>
                    </View>

                    <AddAnnouncementModal visible={isAddOpen} onClose={() => setIsAddOpen(false)} announcement={editingAnn} />
                </SafeAreaView>
            </View>
        </Modal>
    );
};

// --- MODAL: ADD/EDIT ANNOUNCEMENT ---

const AddAnnouncementModal = ({ visible, onClose, announcement }: { visible: boolean, onClose: () => void, announcement?: Announcement | null }) => {
    const { addAnnouncement, updateAnnouncement, currentUser } = useHuddleStore();
    const [content, setContent] = useState('');
    const [style, setStyle] = useState<AnnouncementStyle>('classic');
    const [type, setType] = useState<Announcement['type']>('info');
    const [days, setDays] = useState('7');

    useEffect(() => {
        if (announcement) {
            setContent(announcement.content || '');
            setStyle(announcement.style);
            setType(announcement.type);
            setDays('7');
        } else {
            setContent('');
            setStyle('classic');
            setType('info');
            setDays('7');
        }
    }, [announcement, visible]);

    const handleSave = () => {
        if (!content.trim()) return Alert.alert("Required", "Please enter some content");

        const data = {
            title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
            content: content.trim(),
            type,
            style,
            author: currentUser,
            color: type === 'alert' ? '#EF4444' : type === 'reminder' ? '#F59E0B' : type === 'meeting' ? '#10B981' : '#6366F1',
            expiresAt: Date.now() + (parseInt(days) || 7) * 24 * 60 * 60 * 1000
        };

        if (announcement) {
            updateAnnouncement(announcement.id, data);
        } else {
            addAnnouncement(data);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.7)', justifyContent: 'flex-end' }}>
                <SafeAreaView style={{ backgroundColor: 'white', borderTopLeftRadius: 40, borderTopRightRadius: 40, maxHeight: '95%' }}>
                    <View style={{ padding: 24 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <Text style={{ fontSize: 24, fontWeight: '900', color: '#0F172A' }}>{announcement ? 'Edit Post' : 'New Post'}</Text>
                            <TouchableOpacity onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 24, paddingBottom: 100 }}>
                            <View>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: '#64748B', marginBottom: 8, textTransform: 'uppercase' }}>Message</Text>
                                <TextInput
                                    value={content}
                                    onChangeText={setContent}
                                    placeholder="What's happening?"
                                    multiline
                                    style={{ backgroundColor: '#F8FAFC', borderRadius: 20, padding: 20, fontSize: 16, fontWeight: '700', color: '#0F172A', borderWidth: 1, borderColor: '#E2E8F0', minHeight: 120 }}
                                />
                            </View>

                            <View>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: '#64748B', marginBottom: 12, textTransform: 'uppercase' }}>Visual Style</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                                    {[
                                        { id: 'classic', label: 'Classic', icon: List },
                                        { id: 'instagram', label: 'Gradient', icon: Sparkles },
                                        { id: 'imessage', label: 'Bubble', icon: MessageCircle },
                                        { id: 'neon', label: 'Neon', icon: Zap },
                                        { id: 'glass', label: 'Glass', icon: LayoutGrid },
                                    ].map(s => (
                                        <TouchableOpacity key={s.id} onPress={() => setStyle(s.id as any)} style={{
                                            backgroundColor: style === s.id ? '#0F172A' : '#F1F5F9',
                                            paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16,
                                            flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1,
                                            borderColor: style === s.id ? '#0F172A' : '#E2E8F0'
                                        }}>
                                            <s.icon size={16} color={style === s.id ? 'white' : '#64748B'} />
                                            <Text style={{ fontSize: 13, fontWeight: '800', color: style === s.id ? 'white' : '#64748B' }}>{s.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#64748B', marginBottom: 8, textTransform: 'uppercase' }}>Type</Text>
                                    <View style={{ backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 4, flexDirection: 'row' }}>
                                        {['info', 'alert', 'fun'].map(t => (
                                            <TouchableOpacity key={t} onPress={() => setType(t as any)} style={{
                                                flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                                                backgroundColor: type === t ? 'white' : 'transparent',
                                                shadowColor: '#000', shadowOpacity: type === t ? 0.05 : 0, shadowRadius: 2, elevation: type === t ? 1 : 0
                                            }}>
                                                <Text style={{ fontSize: 11, fontWeight: '900', color: type === t ? '#0F172A' : '#94A3B8', textTransform: 'uppercase' }}>{t}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                                <View style={{ width: 100 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#64748B', marginBottom: 8, textTransform: 'uppercase' }}>Expires (Days)</Text>
                                    <TextInput
                                        value={days}
                                        onChangeText={setDays}
                                        keyboardType="numeric"
                                        style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, fontSize: 16, fontWeight: '700', textAlign: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity onPress={handleSave} style={{ backgroundColor: '#0F172A', paddingVertical: 18, borderRadius: 24, alignItems: 'center', marginTop: 12 }}>
                                <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>{announcement ? 'Save Changes' : 'Post to Bulletin'}</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
};

// --- SUB-COMPONENTS ---

const SectionHeader = ({ title, icon: Icon, rightAction }: any) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {Icon && <Icon size={20} color="#0F172A" strokeWidth={2.5} />}
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 }}>{title}</Text>
        </View>
        {rightAction}
    </View>
);

const FeatureCard = ({ children, style, delay = 0 }: any) => (
    <Animated.View
        entering={FadeInDown.delay(delay).springify()}
        layout={Layout.springify()}
        style={[{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 20,
            borderWidth: 1,
            borderColor: '#F1F5F9',
        }, style]}
    >
        {children}
    </Animated.View>
);

// --- WIDGET WRAPPER FOR EDIT MODE ---
const WidgetWrapper = ({
    widget, index, total, isEditing, children, onResize, onMove, onRemove
}: {
    widget: WidgetConfig, index: number, total: number, isEditing: boolean, children: React.ReactNode,
    onResize: () => void, onMove: (dir: number) => void, onRemove: () => void
}) => {
    const rotation = useSharedValue(0);

    useEffect(() => {
        if (isEditing) {
            rotation.value = withRepeat(
                withSequence(
                    withTiming(-1, { duration: 120, easing: Easing.linear }),
                    withTiming(1, { duration: 120, easing: Easing.linear })
                ),
                -1,
                true
            );
        } else {
            rotation.value = withTiming(0);
        }
    }, [isEditing]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }]
    }));

    const wStyle = widget.size === 'full' ? { width: '100%' as const } : { width: '48%' as const };

    return (
        <Animated.View layout={Layout.springify()} style={[wStyle, { marginBottom: 16 }, animatedStyle]}>
            <View style={{ flex: 1, pointerEvents: isEditing ? 'none' : 'auto' }}>
                {children}
            </View>

            {isEditing && (
                <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOut.duration(200)} style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 12, borderWidth: 2, borderColor: '#6366F1', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                    <TouchableOpacity onPress={onRemove} style={{ position: 'absolute', top: -8, right: -8, width: 28, height: 28, borderRadius: 14, backgroundColor: '#E11D48', alignItems: 'center', justifyContent: 'center', ...GOLDEN_SHADOW }}>
                        <X size={16} color="white" strokeWidth={3} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onResize} style={{ position: 'absolute', bottom: -8, right: -8, width: 32, height: 32, borderRadius: 16, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', ...GOLDEN_SHADOW }}>
                        {widget.size === 'full' ? <Minimize2 size={16} color="white" /> : <Maximize2 size={16} color="white" />}
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', gap: 16 }}>
                        <TouchableOpacity disabled={index === 0} onPress={() => onMove(-1)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: index === 0 ? '#E2E8F0' : '#6366F1', alignItems: 'center', justifyContent: 'center', opacity: index === 0 ? 0.5 : 1 }}>
                            <ArrowLeft size={20} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity disabled={index === total - 1} onPress={() => onMove(1)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: index === total - 1 ? '#E2E8F0' : '#6366F1', alignItems: 'center', justifyContent: 'center', opacity: index === total - 1 ? 0.5 : 1 }}>
                            <ArrowRight size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            )}
        </Animated.View>
    );
};

// --- MAIN SCREEN ---

const MEMBER_COLORS: Record<string, string> = { Dad: '#4F46E5', Mom: '#EC4899', Alex: '#10B981', Lily: '#F59E0B' };

function FamilyFinancialWidget({ allChores, familyMembers, totalPoints }: {
    allChores: import('../../../types/chores').Chore[];
    familyMembers: import('../../../store/huddleStore').FamilyMember[];
    totalPoints: number;
}) {
    const [expanded, setExpanded] = useState(false);
    const sortedByPts = [...familyMembers].sort((a, b) => b.stats.pointsEarned - a.stats.pointsEarned);
    const maxPts = sortedByPts[0]?.stats.pointsEarned || 1;
    const allCompleted = [...allChores]
        .filter(c => c.status === 'completed' && c.completedAt)
        .sort((a, b) => {
            const ta = typeof a.completedAt === 'number' ? a.completedAt : new Date(a.completedAt as string).getTime();
            const tb = typeof b.completedAt === 'number' ? b.completedAt : new Date(b.completedAt as string).getTime();
            return tb - ta;
        });
    const visibleCount = expanded ? 20 : 5;
    const visible = allCompleted.slice(0, visibleCount);
    const hasMore = allCompleted.length > 5 && !expanded;

    return (
        <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
                    <Coins size={16} color="#4F46E5" />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#0F172A', textTransform: 'uppercase', letterSpacing: 1 }}>Family Points</Text>
            </View>

            {/* Family total */}
            <View style={{ backgroundColor: '#EEF2FF', borderRadius: 12, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#6366F1', textTransform: 'uppercase', letterSpacing: 0.8 }}>Family Total</Text>
                    <Text style={{ fontSize: 28, fontWeight: '900', color: '#4F46E5', marginTop: 2 }}>{totalPoints.toLocaleString()} <Text style={{ fontSize: 14 }}>pts</Text></Text>
                </View>
                <TrendingUp size={28} color="#6366F1" />
            </View>

            {/* Per-member bars */}
            <View style={{ gap: 10, marginBottom: 20 }}>
                {sortedByPts.map(m => {
                    const pct = maxPts > 0 ? m.stats.pointsEarned / maxPts : 0;
                    const color = MEMBER_COLORS[m.name] ?? '#64748B';
                    return (
                        <View key={m.name}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={{ fontSize: 16 }}>{m.avatar}</Text>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>{m.name}</Text>
                                    <Text style={{ fontSize: 11, color: '#94A3B8' }}>{m.stats.choresCompleted} chores</Text>
                                </View>
                                <Text style={{ fontSize: 13, fontWeight: '900', color }}>{m.stats.pointsEarned.toLocaleString()} pts</Text>
                            </View>
                            <View style={{ height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                                <View style={{ height: 6, width: `${Math.round(pct * 100)}%`, backgroundColor: color, borderRadius: 3 }} />
                            </View>
                        </View>
                    );
                })}
            </View>

            {/* Recent activity */}
            {allCompleted.length > 0 && (
                <View>
                    <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Recent Activity</Text>
                    <View style={{ gap: 6 }}>
                        {visible.map(c => {
                            const who = c.completedBy ?? c.assignee ?? '?';
                            const color = MEMBER_COLORS[who] ?? '#64748B';
                            const m = familyMembers.find(fm => fm.name === who);
                            const dateLabel = (() => {
                                const ts = typeof c.completedAt === 'number' ? c.completedAt : new Date(c.completedAt as string).getTime();
                                const today = new Date(); today.setHours(0,0,0,0);
                                const d = new Date(ts); d.setHours(0,0,0,0);
                                const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
                                if (diff === 0) return 'Today';
                                if (diff === 1) return 'Yesterday';
                                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            })();
                            return (
                                <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                                    <View style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={{ fontSize: 15 }}>{m?.avatar ?? '👤'}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }} numberOfLines={1}>{c.title}</Text>
                                        <Text style={{ fontSize: 11, color: '#94A3B8' }}>{who} · {dateLabel}</Text>
                                    </View>
                                    <View style={{ backgroundColor: '#D1FAE5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                                        <Text style={{ fontSize: 12, fontWeight: '900', color: '#059669' }}>+{c.points}</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                    {(hasMore || expanded) && (
                        <TouchableOpacity
                            onPress={() => setExpanded(e => !e)}
                            style={{ marginTop: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' }}
                        >
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>
                                {expanded ? 'Show less' : `Show more · ${allCompleted.length - 5} more`}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
}

const HEATMAP_COLORS = ['#F1F5F9', '#C7D2FE', '#818CF8', '#6366F1', '#4338CA'];

function HeatmapModal({ visible, onClose, allChores, familyMembers }: {
    visible: boolean; onClose: () => void;
    allChores: Chore[];
    familyMembers: FamilyMember[];
}) {
    const [filterMember, setFilterMember] = useState<string | null>(null);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const popupWidth = width - 48;
    const GAP = 3;
    // 7 days as columns, weeks as rows — full popup width
    const CELL = Math.floor((popupWidth - GAP * 6) / 7);

    const filtered = allChores.filter(c =>
        c.status === 'completed' && c.completedAt &&
        (!filterMember || c.assignee === filterMember || c.completedBy === filterMember)
    );

    const countByDay: Record<string, { count: number; chores: typeof allChores }> = {};
    filtered.forEach(c => {
        const ts = typeof c.completedAt === 'number' ? c.completedAt : new Date(c.completedAt as string).getTime();
        const d = new Date(ts); d.setHours(0, 0, 0, 0);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!countByDay[key]) countByDay[key] = { count: 0, chores: [] };
        countByDay[key].count++;
        countByDay[key].chores.push(c);
    });

    const maxCount = Math.max(1, ...Object.values(countByDay).map(v => v.count));

    // 52 weeks grid — aligned to end of current week (Sat)
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const gridEnd = new Date(today); gridEnd.setDate(today.getDate() + (6 - today.getDay()));
    const gridStart = new Date(gridEnd); gridStart.setDate(gridEnd.getDate() - 52 * 7 + 1);

    // Build weeks: each week = 7 days (Sun→Sat)
    const weeks: { key: string; date: Date }[][] = [];
    const cur = new Date(gridStart);
    for (let w = 0; w < 52; w++) {
        const week: { key: string; date: Date }[] = [];
        for (let d = 0; d < 7; d++) {
            const k = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
            week.push({ key: k, date: new Date(cur) });
            cur.setDate(cur.getDate() + 1);
        }
        weeks.push(week);
    }

    const cellColor = (key: string) => {
        const n = countByDay[key]?.count ?? 0;
        if (n === 0) return HEATMAP_COLORS[0];
        const pct = n / maxCount;
        if (pct < 0.25) return HEATMAP_COLORS[1];
        if (pct < 0.5) return HEATMAP_COLORS[2];
        if (pct < 0.75) return HEATMAP_COLORS[3];
        return HEATMAP_COLORS[4];
    };

    // Month labels: find which row each month starts at
    const months: { label: string; weekIdx: number }[] = [];
    weeks.forEach((week, wi) => {
        const firstDay = week[0].date;
        if (firstDay.getDate() <= 7) {
            const prev = months.length > 0 ? months[months.length - 1].label : null;
            const label = firstDay.toLocaleDateString('en-US', { month: 'short' });
            if (label !== prev) {
                months.push({ label, weekIdx: wi });
            }
        }
    });

    // Stats
    const totalCompleted = filtered.length;
    let currentStreak = 0;
    for (let i = 0; i < 365; i++) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (countByDay[k]?.count) currentStreak++; else break;
    }
    let longestStreak = 0, runStreak = 0;
    for (let i = 363; i >= 0; i--) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (countByDay[k]?.count) { runStreak++; longestStreak = Math.max(longestStreak, runStreak); } else runStreak = 0;
    }
    const activeDays = Object.keys(countByDay).length;

    const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const selectedData = selectedDay ? countByDay[selectedDay] : null;

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top', 'bottom']}>
                    {/* Header */}
                    <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                        <View>
                            <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A' }}>Chore Heatmap</Text>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#94A3B8' }}>52 weeks of family activity</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={20} color="#0F172A" />
                        </TouchableOpacity>
                    </View>

                    {/* Stats bar */}
                    <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 10, paddingVertical: 12 }}>
                        {[
                            { label: 'Total', value: totalCompleted, color: '#6366F1', bg: '#EEF2FF' },
                            { label: 'Streak', value: `${currentStreak}d`, color: '#D97706', bg: '#FEF3C7' },
                            { label: 'Best', value: `${longestStreak}d`, color: '#059669', bg: '#D1FAE5' },
                            { label: 'Active Days', value: activeDays, color: '#0F172A', bg: '#F1F5F9' },
                        ].map(s => (
                            <View key={s.label} style={{ flex: 1, backgroundColor: s.bg, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center' }}>
                                <Text style={{ fontSize: 15, fontWeight: '900', color: s.color }}>{s.value}</Text>
                                <Text style={{ fontSize: 8, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', marginTop: 1 }}>{s.label}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Member filter */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 10 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, alignItems: 'center', paddingVertical: 4 }}>
                        <TouchableOpacity
                            onPress={() => setFilterMember(null)}
                            style={{ minHeight: 34, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: !filterMember ? '#6366F1' : '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}
                        >
                            <Text style={{ fontSize: 13, fontWeight: '800', color: !filterMember ? 'white' : '#64748B', lineHeight: 16 }}>All</Text>
                        </TouchableOpacity>
                        {familyMembers.map(m => (
                            <TouchableOpacity
                                key={m.name}
                                onPress={() => setFilterMember(prev => prev === m.name ? null : m.name)}
                                style={{ minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: filterMember === m.name ? (MEMBER_COLORS[m.name] ?? '#6366F1') : '#F1F5F9', justifyContent: 'center' }}
                            >
                                <Text style={{ fontSize: 14, lineHeight: 18 }}>{m.avatar}</Text>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: filterMember === m.name ? 'white' : '#64748B', lineHeight: 16 }}>{m.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Day labels row */}
                    <View style={{ paddingHorizontal: 20, flexDirection: 'row', gap: GAP, marginBottom: 4 }}>
                        {DAY_LABELS.map((l, i) => (
                            <View key={i} style={{ width: CELL, alignItems: 'center' }}>
                                <Text style={{ fontSize: 9, fontWeight: '700', color: '#CBD5E1' }}>{l}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Legend — above the grid */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 20, marginBottom: 8 }}>
                        <Text style={{ fontSize: 9, color: '#CBD5E1', fontWeight: '600' }}>Less</Text>
                        {HEATMAP_COLORS.map(c => (
                            <View key={c} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c }} />
                        ))}
                        <Text style={{ fontSize: 9, color: '#CBD5E1', fontWeight: '600' }}>More</Text>
                    </View>

                    {/* Grid — vertical scroll, weeks as rows */}
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
                    >
                        {weeks.map((week, wi) => {
                            const monthLabel = months.find(m => m.weekIdx === wi);
                            return (
                                <View key={wi}>
                                    {monthLabel && (
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#6366F1', marginTop: wi === 0 ? 0 : 6, marginBottom: 3 }}>
                                            {monthLabel.label} {week[0].date.getFullYear()}
                                        </Text>
                                    )}
                                    <View style={{ flexDirection: 'row', gap: GAP, marginBottom: GAP }}>
                                        {week.map(({ key, date }) => {
                                            const isSelected = selectedDay === key;
                                            const isFuture = date.getTime() > today.getTime();
                                            const bg = isFuture ? '#F8FAFC' : cellColor(key);
                                            return (
                                                <TouchableOpacity
                                                    key={key}
                                                    activeOpacity={0.8}
                                                    onPress={() => {
                                                        if (!isFuture) {
                                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                            setSelectedDay(prev => prev === key ? null : key);
                                                        }
                                                    }}
                                                    style={{
                                                        width: CELL, height: Math.round(CELL * 0.55), borderRadius: 3,
                                                        backgroundColor: bg,
                                                        borderWidth: isSelected ? 2 : 0,
                                                        borderColor: isSelected ? '#6366F1' : 'transparent',
                                                    }}
                                                />
                                            );
                                        })}
                                    </View>
                                </View>
                            );
                        })}

                    </ScrollView>

                    {/* Day detail panel */}
                    {selectedDay && (
                        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32, borderTopWidth: 1, borderTopColor: '#F1F5F9', maxHeight: height * 0.45 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                <View>
                                    <Text style={{ fontSize: 15, fontWeight: '900', color: '#0F172A' }}>
                                        {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </Text>
                                    <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700' }}>
                                        {selectedData ? `${selectedData.count} chore${selectedData.count !== 1 ? 's' : ''} completed` : 'Rest day'}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setSelectedDay(null)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                                    <X size={15} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {selectedData ? selectedData.chores.map((c, i) => {
                                    const who = c.completedBy ?? c.assignee ?? '?';
                                    const m = familyMembers.find(fm => fm.name === who);
                                    const color = MEMBER_COLORS[who] ?? '#6366F1';
                                    return (
                                        <View key={c.id ?? i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' }}>
                                            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center' }}>
                                                <Text style={{ fontSize: 15 }}>{m?.avatar ?? '👤'}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }} numberOfLines={1}>{c.title}</Text>
                                                <Text style={{ fontSize: 11, color: '#94A3B8' }}>{who}</Text>
                                            </View>
                                            <View style={{ backgroundColor: '#D1FAE5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                                                <Text style={{ fontSize: 12, fontWeight: '900', color: '#059669' }}>+{c.points}</Text>
                                            </View>
                                        </View>
                                    );
                                }) : (
                                    <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                                        <Text style={{ fontSize: 24 }}>🌙</Text>
                                        <Text style={{ fontSize: 13, color: '#94A3B8', fontWeight: '600', marginTop: 8 }}>No chores completed</Text>
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    )}
            </SafeAreaView>
        </Modal>
    );
}

function WishlistModal({ visible, onClose, wishlist, familyMembers, currentUser, onAdd, onDelete }: {
    visible: boolean; onClose: () => void;
    wishlist: WishlistItem[]; familyMembers: FamilyMember[];
    currentUser: string; onAdd: (item: Omit<WishlistItem, 'id' | 'addedAt'>) => void;
    onDelete: (id: string) => void;
}) {
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [pts, setPts] = useState('');
    const [reason, setReason] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const reset = () => { setName(''); setDesc(''); setPts(''); setReason(''); setIsAdding(false); };

    const handleSave = () => {
        if (!name.trim() || !pts.trim()) return;
        onAdd({ name: name.trim(), description: desc.trim(), desiredPts: parseInt(pts) || 0, reason: reason.trim(), addedBy: currentUser });
        reset();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
                <SafeAreaView style={{ flex: 1 }}>
                    <View style={{ padding: 24, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                            <Text style={{ fontSize: 24, fontWeight: '900', color: '#0F172A' }}>Wishlist</Text>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#94A3B8' }}>{wishlist.length} {wishlist.length === 1 ? 'wish' : 'wishes'}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24 }}>
                        {wishlist.map(w => {
                            const m = familyMembers.find(fm => fm.name === w.addedBy);
                            const date = new Date(w.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            return (
                                <View key={w.id} style={{ backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', padding: 16, marginBottom: 12 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
                                            <Text style={{ fontSize: 20 }}>{m?.avatar ?? '👤'}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 15, fontWeight: '900', color: '#0F172A' }}>{w.name}</Text>
                                            <Text style={{ fontSize: 11, color: '#94A3B8' }}>{w.addedBy} · {date}</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                                            <View style={{ backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                                                <Text style={{ fontSize: 13, fontWeight: '900', color: '#D97706' }}>{w.desiredPts} pts</Text>
                                            </View>
                                            {w.addedBy === currentUser && (
                                                <TouchableOpacity onPress={() => onDelete(w.id)} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Trash2 size={13} color="#EF4444" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                    {!!w.description && <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>{w.description}</Text>}
                                    {!!w.reason && (
                                        <View style={{ backgroundColor: '#F8FAFC', borderRadius: 8, padding: 8 }}>
                                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8' }}>Because: <Text style={{ color: '#475569' }}>{w.reason}</Text></Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                        {wishlist.length === 0 && (
                            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                                <Gift size={40} color="#E2E8F0" />
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#CBD5E1', marginTop: 12 }}>Nothing here yet.</Text>
                                <Text style={{ fontSize: 12, color: '#CBD5E1', marginTop: 4 }}>Add your first wish below!</Text>
                            </View>
                        )}
                    </ScrollView>
                    {isAdding ? (
                        <View style={{ padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 10 }}>
                            <TextInput value={name} onChangeText={setName} placeholder="Item name *" placeholderTextColor="#94A3B8" style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#E2E8F0' }} />
                            <TextInput value={desc} onChangeText={setDesc} placeholder="Description (optional)" placeholderTextColor="#94A3B8" style={{ fontSize: 13, color: '#0F172A', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#E2E8F0' }} />
                            <TextInput value={pts} onChangeText={setPts} placeholder="Desired point price *" placeholderTextColor="#94A3B8" keyboardType="numeric" style={{ fontSize: 13, color: '#0F172A', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#E2E8F0' }} />
                            <TextInput value={reason} onChangeText={setReason} placeholder="Why do you want this?" placeholderTextColor="#94A3B8" style={{ fontSize: 13, color: '#0F172A', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#E2E8F0' }} />
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity onPress={reset} style={{ flex: 1, backgroundColor: '#F1F5F9', borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}>
                                    <Text style={{ fontWeight: '700', color: '#64748B' }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleSave} style={{ flex: 2, backgroundColor: '#0F172A', borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}>
                                    <Text style={{ fontWeight: '900', color: 'white' }}>Add Wish</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={{ padding: 20, paddingBottom: 36, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                            <TouchableOpacity onPress={() => setIsAdding(true)} style={{ backgroundColor: '#0F172A', borderRadius: 12, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                                <Plus size={18} color="white" strokeWidth={3} />
                                <Text style={{ fontWeight: '900', color: 'white', fontSize: 15 }}>Add a Wish</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </SafeAreaView>
            </View>
        </Modal>
    );
}

export default function FamilyScreen() {
    const {
        familyMembers, recipes, weekMenu, menuPhase,
        currentUser, announcements, goals, pets,
        birthdays, wifi, voteForRecipe, familyWidgets,
        updateWidgetSize, reorderWidgets, setFamilyWidgets,
        addAnnouncementReaction, chores, wishlist, addWishlistItem, deleteWishlistItem
    } = useHuddleStore();

    const [isEditing, setIsEditing] = useState(false);
    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [sheetVisible, setSheetVisible] = useState(false);
    const [showAnnouncements, setShowAnnouncements] = useState(false);
    const [showWishlist, setShowWishlist] = useState(false);
    const [heatmapMember, setHeatmapMember] = useState<string | null>(null);
    const [activityExpanded, setActivityExpanded] = useState(false);
    const [showHeatmapModal, setShowHeatmapModal] = useState(false);
    // HAR-36: history view toggle ('list' | 'stats')
    const [historyView, setHistoryView] = useState<'list' | 'stats'>('list');
    const [historyFilter, setHistoryFilter] = useState<string | null>(null);
    const [historySearchQuery, setHistorySearchQuery] = useState('');

    // HAR-36: sheet animation — backdrop instant, sheet slides up
    const sheetTranslateY = useSharedValue(800);
    const sheetAnimStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheetTranslateY.value }] }));

    const openSheet = (member: any) => {
        setSelectedMember(member);
        setSheetVisible(true);
        sheetTranslateY.value = 800;
        sheetTranslateY.value = withSpring(0, { damping: 28, stiffness: 260, mass: 0.6 });
    };

    const closeSheet = () => {
        sheetTranslateY.value = withTiming(800, { duration: 220, easing: Easing.in(Easing.ease) }, () => {
            runOnJS(setSheetVisible)(false);
            runOnJS(setSelectedMember)(null);
        });
    };

    // HAR-36: swipe-down to dismiss
    const sheetPanGesture = Gesture.Pan()
        .onUpdate(e => { if (e.translationY > 0) sheetTranslateY.value = e.translationY; })
        .onEnd(e => {
            if (e.translationY > 80 || e.velocityY > 600) {
                sheetTranslateY.value = withTiming(800, { duration: 200, easing: Easing.in(Easing.ease) }, () => {
                    runOnJS(setSheetVisible)(false);
                    runOnJS(setSelectedMember)(null);
                });
            } else {
                sheetTranslateY.value = withSpring(0, { damping: 28, stiffness: 260, mass: 0.6 });
            }
        });

    const totalPoints = useMemo(() => familyMembers.reduce((acc, m) => acc + m.stats.pointsEarned, 0), [familyMembers]);
    const leader = useMemo(() => [...familyMembers].sort((a, b) => b.stats.pointsEarned - a.stats.pointsEarned)[0], [familyMembers]);

    const handleCopyWifi = () => {
        Clipboard.setString(wifi.password);
        Alert.alert("Copied", "Wi-Fi password copied to clipboard!");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleResize = (id: string, currentSize: WidgetSize) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        updateWidgetSize(id, currentSize === 'full' ? 'half' : 'full');
    };

    const handleMove = (index: number, dir: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        reorderWidgets(index, index + dir);
    };

    const handleRemove = (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setFamilyWidgets(familyWidgets.filter(w => w.id !== id));
    };

    const allChores = useHuddleStore(s => s.chores);

    const renderWidget = (widget: WidgetConfig) => {
        switch (widget.id) {
            case 'hero_dinner':
                return <WeeklyMenuSection />;
            case 'recent_activity': {
                const allCompleted = [...allChores]
                    .filter(c => c.status === 'completed' && c.completedAt)
                    .sort((a, b) => {
                        const ta = typeof a.completedAt === 'number' ? a.completedAt : new Date(a.completedAt as string).getTime();
                        const tb = typeof b.completedAt === 'number' ? b.completedAt : new Date(b.completedAt as string).getTime();
                        return tb - ta;
                    });
                const visible = allCompleted.slice(0, activityExpanded ? 20 : 3);
                return (
                    <FeatureCard>
                        <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>Recent Activity</Text>
                        {allCompleted.length === 0 && <Text style={{ fontSize: 13, color: '#94A3B8', fontWeight: '600' }}>No completed chores yet.</Text>}
                        <View style={{ gap: 6 }}>
                            {visible.map(c => {
                                const who = c.completedBy ?? c.assignee ?? '?';
                                const color = MEMBER_COLORS[who] ?? '#64748B';
                                const m = familyMembers.find(fm => fm.name === who);
                                const ts = typeof c.completedAt === 'number' ? c.completedAt : new Date(c.completedAt as string).getTime();
                                const today = new Date(); today.setHours(0,0,0,0);
                                const d = new Date(ts); d.setHours(0,0,0,0);
                                const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
                                const dateLabel = diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                return (
                                    <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                                        <View style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center' }}>
                                            <Text style={{ fontSize: 15 }}>{m?.avatar ?? '👤'}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }} numberOfLines={1}>{c.title}</Text>
                                            <Text style={{ fontSize: 11, color: '#94A3B8' }}>{who} · {dateLabel}</Text>
                                        </View>
                                        <View style={{ backgroundColor: '#D1FAE5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                                            <Text style={{ fontSize: 12, fontWeight: '900', color: '#059669' }}>+{c.points}</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                        {allCompleted.length > 3 && (
                            <TouchableOpacity onPress={() => setActivityExpanded(e => !e)} style={{ marginTop: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F8FAFC', alignItems: 'center' }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>
                                    {activityExpanded ? 'Show less' : `Show more · ${Math.min(allCompleted.length, 20) - 3} more`}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </FeatureCard>
                );
            }
            case 'chore_heatmap': {
                // 52 weeks, fit all in card width — no scroll
                // card width ≈ screen width - 48px padding. cell = (cardW - gaps) / 52
                const CARD_W = width - 48 - 40; // subtract screen padding + card padding
                const GAP = 2;
                const CELL = Math.floor((CARD_W - GAP * 51) / 52);
                const DAY_MS = 86400000;
                const countByDay: Record<string, number> = {};
                allChores.filter(c => c.status === 'completed' && c.completedAt).forEach(c => {
                    const ts = typeof c.completedAt === 'number' ? c.completedAt : new Date(c.completedAt as string).getTime();
                    if (heatmapMember && c.assignee !== heatmapMember && c.completedBy !== heatmapMember) return;
                    const d = new Date(ts); d.setHours(0,0,0,0);
                    const key = d.toISOString().slice(0,10);
                    countByDay[key] = (countByDay[key] ?? 0) + 1;
                });
                const maxCount = Math.max(1, ...Object.values(countByDay));
                const today = new Date(); today.setHours(0,0,0,0);
                // Align grid end to end of current week (Saturday)
                const gridEnd = new Date(today); gridEnd.setDate(today.getDate() + (6 - today.getDay()));
                const gridStart = new Date(gridEnd); gridStart.setDate(gridEnd.getDate() - 52 * 7 + 1);
                const weeks: string[][] = [];
                const cur = new Date(gridStart);
                for (let w = 0; w < 52; w++) {
                    const week: string[] = [];
                    for (let d = 0; d < 7; d++) {
                        week.push(cur.toISOString().slice(0,10));
                        cur.setDate(cur.getDate() + 1);
                    }
                    weeks.push(week);
                }
                // Label week 0 (oldest) and week 51 (newest)
                const oldestLabel = new Date(weeks[0][0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const newestLabel = 'Now';
                const cellColor = (key: string) => {
                    const c = countByDay[key] ?? 0;
                    if (c === 0) return '#F1F5F9';
                    const pct = c / maxCount;
                    if (pct < 0.25) return '#C7D2FE';
                    if (pct < 0.5) return '#818CF8';
                    if (pct < 0.75) return '#6366F1';
                    return '#4338CA';
                };
                return (
                    <FeatureCard style={{ padding: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <Text style={{ fontSize: 13, fontWeight: '900', color: '#0F172A' }}>Chore Heatmap</Text>
                            <TouchableOpacity
                                onPress={() => !isEditing && setShowHeatmapModal(true)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                            >
                                <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: '700' }}>52 weeks</Text>
                                <Maximize2 size={12} color="#6366F1" />
                            </TouchableOpacity>
                        </View>
                        {/* Member filter */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                            <TouchableOpacity
                                onPress={() => setHeatmapMember(null)}
                                style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: !heatmapMember ? '#0F172A' : '#F1F5F9' }}
                            >
                                <Text style={{ fontSize: 10, fontWeight: '800', color: !heatmapMember ? 'white' : '#64748B' }}>All</Text>
                            </TouchableOpacity>
                            {familyMembers.map(m => (
                                <TouchableOpacity
                                    key={m.name}
                                    onPress={() => setHeatmapMember(prev => prev === m.name ? null : m.name)}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: heatmapMember === m.name ? MEMBER_COLORS[m.name] ?? '#6366F1' : '#F1F5F9' }}
                                >
                                    <Text style={{ fontSize: 10 }}>{m.avatar}</Text>
                                    <Text style={{ fontSize: 10, fontWeight: '800', color: heatmapMember === m.name ? 'white' : '#64748B' }}>{m.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {/* Grid — 52 columns × 7 rows, no scroll, full width */}
                        <View style={{ width: '100%', flexDirection: 'row', gap: GAP }}>
                            {weeks.map((week, wi) => (
                                <View key={wi} style={{ flex: 1, gap: GAP }}>
                                    {week.map(day => (
                                        <View key={day} style={{ aspectRatio: 1, borderRadius: 2, backgroundColor: cellColor(day) }} />
                                    ))}
                                </View>
                            ))}
                        </View>
                        {/* Legend — compact inline */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 }}>
                            <Text style={{ fontSize: 8, color: '#CBD5E1', fontWeight: '600' }}>Less</Text>
                            {['#F1F5F9','#C7D2FE','#818CF8','#6366F1','#4338CA'].map(c => (
                                <View key={c} style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: c }} />
                            ))}
                            <Text style={{ fontSize: 8, color: '#CBD5E1', fontWeight: '600' }}>More</Text>
                        </View>
                    </FeatureCard>
                );
            }
            case 'chore_weekly': {
                const now = new Date(); now.setHours(0,0,0,0);
                // Week boundaries (Sun=start, Sat=end midnight)
                const thisSun = new Date(now); thisSun.setDate(now.getDate() - now.getDay());
                const lastSun = new Date(thisSun); lastSun.setDate(thisSun.getDate() - 7);
                const nextSun = new Date(thisSun); nextSun.setDate(thisSun.getDate() + 7);
                const nextNextSun = new Date(nextSun); nextNextSun.setDate(nextSun.getDate() + 7);

                const inW = (ts: number, s: Date, e: Date) => ts >= s.getTime() && ts < e.getTime();
                const getTs = (c: (typeof allChores)[0]) => typeof c.completedAt === 'number' ? c.completedAt : new Date((c.completedAt ?? 0) as string).getTime();
                const getDue = (c: (typeof allChores)[0]) => {
                    const s = (c.dueDate ?? (c as any).due ?? '') as string;
                    const parts = s.split('-');
                    return parts.length === 3 ? new Date(+parts[0], +parts[1] - 1, +parts[2]).getTime() : 0;
                };

                // ── LAST WEEK ──
                const lwAll = allChores.filter(c => !c.deletedAt && c.dueDate && inW(getDue(c), lastSun, thisSun));
                const lwDone = allChores.filter(c => c.status === 'completed' && c.completedAt && inW(getTs(c), lastSun, thisSun)).length;
                const lwPlanned = lwAll.length;
                const lwMissed = Math.max(0, lwPlanned - lwDone);

                // ── THIS WEEK ──
                const twAll = allChores.filter(c => !c.deletedAt && c.dueDate && inW(getDue(c), thisSun, nextSun));
                const twDone = allChores.filter(c => c.status === 'completed' && c.completedAt && inW(getTs(c), thisSun, nextSun)).length;
                const twPlanned = twAll.length;
                const twOverdue = allChores.filter(c => !c.deletedAt && c.isOverdue && getDue(c) < now.getTime()).length;
                // Time left until Sunday midnight
                const endOfWeek = new Date(nextSun); // nextSun is midnight next Sunday
                const msLeft = endOfWeek.getTime() - Date.now();
                const dLeft = Math.floor(msLeft / 86400000);
                const hLeft = Math.floor((msLeft % 86400000) / 3600000);
                const mLeft = Math.floor((msLeft % 3600000) / 60000);
                const timeLeft = dLeft > 0 ? `${dLeft}d ${hLeft}h left` : hLeft > 0 ? `${hLeft}h ${mLeft}m left` : `${mLeft}m left`;

                // ── NEXT WEEK ──
                const nwAll = allChores.filter(c => !c.deletedAt && c.dueDate && inW(getDue(c), nextSun, nextNextSun));
                const nwTotal = nwAll.length;
                const nwRecurring = nwAll.filter(c => c.isRecurring || !!c.recurringGroupId).length;
                const nwOneOff = nwTotal - nwRecurring;

                const BAR_H = 90;
                const maxVal = Math.max(lwPlanned, twPlanned, nwTotal, 1);

                return (
                    <FeatureCard style={{ padding: 16 }}>
                        <Text style={{ fontSize: 13, fontWeight: '900', color: '#0F172A', marginBottom: 16 }}>Weekly Chores</Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            {/* LAST WEEK */}
                            <View style={{ flex: 1, alignItems: 'center' }}>
                                <View style={{ width: '100%', height: BAR_H, backgroundColor: '#F1F5F9', borderRadius: 8, overflow: 'hidden', justifyContent: 'flex-end' }}>
                                    {/* total planned */}
                                    <View style={{ width: '100%', height: `${Math.round((lwPlanned / maxVal) * 100)}%`, backgroundColor: '#CBD5E1', borderRadius: 8 }} />
                                    {/* completed (overlay from bottom) */}
                                    <View style={{ position: 'absolute', bottom: 0, width: '100%', height: `${Math.round((lwDone / maxVal) * 100)}%`, backgroundColor: '#6366F1', borderRadius: 8 }} />
                                    {/* missed (red top slice) */}
                                    {lwMissed > 0 && (
                                        <View style={{ position: 'absolute', bottom: `${Math.round((lwDone / maxVal) * 100)}%`, width: '100%', height: `${Math.round((lwMissed / maxVal) * 100)}%`, backgroundColor: '#EF4444', borderRadius: 8 }} />
                                    )}
                                </View>
                                <Text style={{ fontSize: 13, fontWeight: '900', color: '#0F172A', marginTop: 6 }}>{lwPlanned}</Text>
                                <Text style={{ fontSize: 9, fontWeight: '700', color: '#94A3B8', textAlign: 'center' }}>Last Week</Text>
                                <View style={{ marginTop: 6, gap: 2, width: '100%' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#6366F1' }} />
                                        <Text style={{ fontSize: 9, color: '#64748B' }}>{lwDone} done</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' }} />
                                        <Text style={{ fontSize: 9, color: '#64748B' }}>{lwMissed} missed</Text>
                                    </View>
                                </View>
                            </View>
                            {/* THIS WEEK */}
                            <View style={{ flex: 1, alignItems: 'center' }}>
                                <View style={{ width: '100%', height: BAR_H, backgroundColor: '#F1F5F9', borderRadius: 8, overflow: 'hidden', justifyContent: 'flex-end' }}>
                                    <View style={{ width: '100%', height: `${Math.round((twPlanned / maxVal) * 100)}%`, backgroundColor: '#A5B4FC', borderRadius: 8 }} />
                                    <View style={{ position: 'absolute', bottom: 0, width: '100%', height: `${Math.round((twDone / maxVal) * 100)}%`, backgroundColor: '#6366F1', borderRadius: 8 }} />
                                    {/* overdue stacked on top in red */}
                                    {twOverdue > 0 && (
                                        <View style={{ position: 'absolute', top: 0, width: '100%', height: `${Math.round((twOverdue / maxVal) * 100)}%`, backgroundColor: '#FCA5A5', borderRadius: 8 }} />
                                    )}
                                </View>
                                <Text style={{ fontSize: 13, fontWeight: '900', color: '#6366F1', marginTop: 6 }}>{twPlanned}</Text>
                                <Text style={{ fontSize: 9, fontWeight: '700', color: '#94A3B8', textAlign: 'center' }}>This Week</Text>
                                <View style={{ marginTop: 6, gap: 2, width: '100%' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#6366F1' }} />
                                        <Text style={{ fontSize: 9, color: '#64748B' }}>{twDone} done</Text>
                                    </View>
                                    {twOverdue > 0 && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' }} />
                                            <Text style={{ fontSize: 9, color: '#EF4444', fontWeight: '700' }}>{twOverdue} pending overdue</Text>
                                        </View>
                                    )}
                                    <Text style={{ fontSize: 9, color: '#94A3B8' }}>{timeLeft}</Text>
                                </View>
                            </View>
                            {/* NEXT WEEK */}
                            <View style={{ flex: 1, alignItems: 'center' }}>
                                <View style={{ width: '100%', height: BAR_H, backgroundColor: '#F1F5F9', borderRadius: 8, overflow: 'hidden', justifyContent: 'flex-end' }}>
                                    <View style={{ width: '100%', height: `${Math.round((nwTotal / maxVal) * 100)}%`, backgroundColor: '#D1FAE5', borderRadius: 8 }} />
                                    {/* recurring portion */}
                                    <View style={{ position: 'absolute', bottom: 0, width: '100%', height: `${Math.round((nwRecurring / maxVal) * 100)}%`, backgroundColor: '#10B981', borderRadius: 8 }} />
                                </View>
                                <Text style={{ fontSize: 13, fontWeight: '900', color: '#10B981', marginTop: 6 }}>{nwTotal}</Text>
                                <Text style={{ fontSize: 9, fontWeight: '700', color: '#94A3B8', textAlign: 'center' }}>Next Week</Text>
                                <View style={{ marginTop: 6, gap: 2, width: '100%' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />
                                        <Text style={{ fontSize: 9, color: '#64748B' }}>{nwRecurring} recurring</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: '#10B981' }} />
                                        <Text style={{ fontSize: 9, color: '#64748B' }}>{nwOneOff} one-off</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </FeatureCard>
                );
            }
            case 'wishlist': {
                return (
                    <TouchableOpacity activeOpacity={0.9} onPress={() => !isEditing && setShowWishlist(true)}>
                        <FeatureCard>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <Star size={20} color="#F59E0B" fill="#F59E0B" />
                                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>Wishlist</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    {wishlist.length > 0 && (
                                        <View style={{ backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                                            <Text style={{ fontSize: 11, fontWeight: '900', color: '#D97706' }}>{wishlist.length}</Text>
                                        </View>
                                    )}
                                    <ChevronRight size={18} color="#CBD5E1" />
                                </View>
                            </View>
                            {wishlist.length === 0 ? (
                                <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                                    <Gift size={28} color="#E2E8F0" />
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#CBD5E1', marginTop: 8 }}>No wishes yet — add your first!</Text>
                                </View>
                            ) : (
                                <View style={{ gap: 8 }}>
                                    {wishlist.slice(0, 3).map(w => {
                                        const m = familyMembers.find(fm => fm.name === w.addedBy);
                                        return (
                                            <View key={w.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFBEB', borderRadius: 10, padding: 10 }}>
                                                <Text style={{ fontSize: 16 }}>{m?.avatar ?? '👤'}</Text>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }} numberOfLines={1}>{w.name}</Text>
                                                    <Text style={{ fontSize: 11, color: '#94A3B8' }}>{w.addedBy}</Text>
                                                </View>
                                                <Text style={{ fontSize: 12, fontWeight: '900', color: '#D97706' }}>{w.desiredPts} pts</Text>
                                            </View>
                                        );
                                    })}
                                    {wishlist.length > 3 && (
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', textAlign: 'center' }}>+{wishlist.length - 3} more</Text>
                                    )}
                                </View>
                            )}
                        </FeatureCard>
                    </TouchableOpacity>
                );
            }
            case 'the_crew': {
                const weekStart = (() => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); return d.getTime(); })();
                const weeklyChoreCount = (name: string) => allChores.filter(c => c.assignee === name && c.completedAt && (typeof c.completedAt === 'number' ? c.completedAt : new Date(c.completedAt as string).getTime()) >= weekStart).length;
                if (widget.size === 'half') {
                    return (
                        <FeatureCard style={{ height: 180, alignItems: 'center', justifyContent: 'center' }}>
                            <View style={{ flexDirection: 'row', gap: -10 }}>
                                {familyMembers.slice(0,3).map(m => (
                                    <View key={m.name} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' }}>
                                        <Text style={{ fontSize: 20 }}>{m.avatar}</Text>
                                    </View>
                                ))}
                            </View>
                        </FeatureCard>
                    );
                }
                return (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 10 }}>
                        {familyMembers.map((m, i) => (
                            <TouchableOpacity key={m.name} onPress={() => !isEditing && openSheet(m)}>
                                <FeatureCard style={{ width: 175, paddingVertical: 20, paddingHorizontal: 16 }} delay={i * 80}>
                                    <View style={{ alignItems: 'center', marginBottom: 14 }}>
                                        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#E2E8F0', marginBottom: 8 }}>
                                            <Text style={{ fontSize: 32 }}>{m.avatar}</Text>
                                        </View>
                                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>{m.name}</Text>
                                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.8 }}>{m.role}</Text>
                                    </View>
                                    <View style={{ gap: 8 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                                <Coins size={11} color="#6366F1" />
                                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B' }}>Points</Text>
                                            </View>
                                            <Text style={{ fontSize: 13, fontWeight: '900', color: '#6366F1' }}>{m.stats.pointsEarned.toLocaleString()}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                                <CheckCircle2 size={11} color="#10B981" />
                                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B' }}>This week</Text>
                                            </View>
                                            <Text style={{ fontSize: 13, fontWeight: '900', color: '#10B981' }}>{weeklyChoreCount(m.name)}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                                <Zap size={11} color="#F59E0B" />
                                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B' }}>Streak</Text>
                                            </View>
                                            <Text style={{ fontSize: 13, fontWeight: '900', color: '#F59E0B' }}>{m.stats.streak}d</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                                <Trophy size={11} color="#94A3B8" />
                                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B' }}>Total</Text>
                                            </View>
                                            <Text style={{ fontSize: 13, fontWeight: '900', color: '#0F172A' }}>{m.stats.choresCompleted}</Text>
                                        </View>
                                    </View>
                                </FeatureCard>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                );
            }
            case 'announcements':
                const active = announcements.filter(a => a.expiresAt > Date.now());
                return (
                    <TouchableOpacity activeOpacity={0.9} onPress={() => !isEditing && setShowAnnouncements(true)}>
                        <FeatureCard style={{ height: widget.size === 'half' ? 180 : 'auto' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <Megaphone size={20} color="#F59E0B" />
                                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>Bulletin</Text>
                                </View>
                                <ChevronRight size={18} color="#CBD5E1" />
                            </View>
                            <View style={{ gap: 8 }}>
                                {active.slice(0, widget.size === 'half' ? 1 : 2).map(a => (
                                    <View key={a.id} style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: a.color }}>
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }} numberOfLines={2}>{a.content}</Text>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#94A3B8' }}>{a.author}</Text>
                                            <View style={{ flexDirection: 'row', gap: 4 }}>
                                                {Object.keys(a.reactions || {}).slice(0, 2).map(emoji => (
                                                    <Text key={emoji} style={{ fontSize: 10 }}>{emoji}</Text>
                                                ))}
                                            </View>
                                        </View>
                                    </View>
                                ))}
                                {active.length === 0 && (
                                    <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                                        <MessageCircle size={24} color="#E2E8F0" />
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#CBD5E1', marginTop: 4 }}>No announcements</Text>
                                    </View>
                                )}
                            </View>
                        </FeatureCard>
                    </TouchableOpacity>
                );
            case 'family_goals':
                return (
                    <FeatureCard style={{ height: widget.size === 'half' ? 180 : 'auto' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <Target size={20} color="#EC4899" />
                            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>Goals</Text>
                        </View>
                        {goals.slice(0, widget.size === 'half' ? 1 : 2).map(g => (
                            <View key={g.id} style={{ marginBottom: 12 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <Text style={{ fontWeight: '800', color: '#1E293B', fontSize: 12 }} numberOfLines={1}>{g.title}</Text>
                                    {widget.size === 'full' && <Text style={{ fontWeight: '900', color: g.color, fontSize: 12 }}>${g.current}</Text>}
                                </View>
                                <View style={{ height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                                    <View style={{ width: `${(g.current / g.target) * 100}%`, height: '100%', backgroundColor: g.color }} />
                                </View>
                            </View>
                        ))}
                    </FeatureCard>
                );
            case 'pet_tracker_buddy':
            case 'pet_tracker_luna':
                const pet = pets.find(p => p.id === (widget.id.includes('buddy') ? 'p1' : 'p2'));
                if (!pet) return null;
                return (
                    <FeatureCard style={{ height: 180 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            {pet.type === 'Dog' ? <Dog size={24} color="#6366F1" /> : <Cat size={24} color="#EC4899" />}
                            <Text style={{ fontSize: 24 }}>{pet.avatar}</Text>
                        </View>
                        <Text style={{ fontWeight: '900', color: '#0F172A', marginTop: 12 }}>{pet.name}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginTop: 4 }}>Last fed {new Date(pet.lastFed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        <TouchableOpacity style={{ marginTop: 'auto', backgroundColor: '#F1F5F9', paddingVertical: 8, borderRadius: 12, alignItems: 'center' }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569' }}>Feed Now</Text>
                        </TouchableOpacity>
                    </FeatureCard>
                );
            case 'emergency_contacts':
                return (
                    <FeatureCard style={{ backgroundColor: '#FFF1F2', borderColor: '#FECDD3', height: widget.size === 'half' ? 180 : 'auto' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <Shield size={20} color="#E11D48" />
                            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>Emergency</Text>
                        </View>
                        <View style={{ flexDirection: widget.size === 'full' ? 'row' : 'column', gap: 12 }}>
                            <View style={{ flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 16, alignItems: 'center', flexDirection: 'row', gap: 8 }}>
                                <Phone size={14} color="#E11D48" />
                                <Text style={{ fontWeight: '800', color: '#1E293B', fontSize: 13 }}>Doctor</Text>
                            </View>
                            <View style={{ flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 16, alignItems: 'center', flexDirection: 'row', gap: 8 }}>
                                <Phone size={14} color="#E11D48" />
                                <Text style={{ fontWeight: '800', color: '#1E293B', fontSize: 13 }}>Plumber</Text>
                            </View>
                        </View>
                    </FeatureCard>
                );
            case 'quick_links':
                return (
                    <FeatureCard style={{ height: widget.size === 'half' ? 180 : 'auto' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <ExternalLink size={20} color="#64748B" />
                            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>Links</Text>
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {['School', 'Health'].map(l => (
                                <View key={l} style={{ backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9' }}>
                                    <Text style={{ fontWeight: '800', color: '#475569', fontSize: 12 }}>{l}</Text>
                                </View>
                            ))}
                        </View>
                    </FeatureCard>
                );
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
            <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 }}>Family Hub</Text>
                <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setIsEditing(!isEditing); }} style={{ backgroundColor: isEditing ? '#0F172A' : '#F1F5F9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
                    <Text style={{ fontWeight: '900', color: isEditing ? 'white' : '#64748B' }}>{isEditing ? 'Done' : 'Edit'}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 140 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    {familyWidgets.map((widget, index) => (
                        <WidgetWrapper
                            key={widget.id}
                            widget={widget}
                            index={index}
                            total={familyWidgets.length}
                            isEditing={isEditing}
                            onResize={() => handleResize(widget.id, widget.size)}
                            onMove={(dir) => handleMove(index, dir)}
                            onRemove={() => handleRemove(widget.id)}
                        >
                            {renderWidget(widget)}
                        </WidgetWrapper>
                    ))}
                </View>

                {isEditing && (
                    <TouchableOpacity onPress={() => Alert.alert("Add Widget", "Widget catalog would open here.")} style={{ backgroundColor: '#EEF2FF', borderStyle: 'dashed', borderWidth: 2, borderColor: '#C7D2FE', borderRadius: 12, padding: 24, alignItems: 'center', justifyContent: 'center', marginTop: 16 }}>
                        <Text style={{ fontWeight: '900', color: '#6366F1' }}>+ Add Widget</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>

            {/* HAR-36: Custom animated member detail sheet */}
            {sheetVisible && (
            <Modal visible={sheetVisible} transparent animationType="none">
                {/* Backdrop — appears instantly */}
                <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.7)', justifyContent: 'flex-end' }}>
                    <GestureDetector gesture={sheetPanGesture}>
                    <Animated.View style={[{ backgroundColor: 'white', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 32, height: '85%' }, sheetAnimStyle]}>
                    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                        <View style={{ width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 10, alignSelf: 'center', marginBottom: 24 }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', ...GOLDEN_SHADOW }}>
                                    <Text style={{ fontSize: 48 }}>{selectedMember?.avatar}</Text>
                                </View>
                                <View>
                                    <Text style={{ fontSize: 28, fontWeight: '900', color: '#0F172A' }}>{selectedMember?.name}</Text>
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B' }}>{selectedMember?.role}</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={closeSheet} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A', marginBottom: 16 }}>Statistics</Text>
                        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 24 }}>
                            <View style={{ flex: 1, backgroundColor: '#F8FAFC', padding: 20, borderRadius: 12, alignItems: 'center' }}>
                                <Text style={{ fontSize: 24, fontWeight: '900', color: '#6366F1' }}>{selectedMember?.stats.choresCompleted}</Text>
                                <Text style={{ fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginTop: 4 }}>Chores Done</Text>
                            </View>
                            <View style={{ flex: 1, backgroundColor: '#F8FAFC', padding: 20, borderRadius: 12, alignItems: 'center' }}>
                                <Text style={{ fontSize: 24, fontWeight: '900', color: '#F59E0B' }}>{selectedMember?.stats.streak}d</Text>
                                <Text style={{ fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginTop: 4 }}>Active Streak</Text>
                            </View>
                        </View>

                        {/* HAR-36: Chore History with List/Stats analytics */}
                        {(() => {
                            const memberName: string = selectedMember?.name;
                            const allCompleted = chores
                                .filter(c => c.status === 'completed' && (c.assignee === memberName || c.completedBy === memberName))
                                .sort((a, b) => {
                                    const aTime = a.completedAt ? new Date(a.completedAt as string).getTime() : 0;
                                    const bTime = b.completedAt ? new Date(b.completedAt as string).getTime() : 0;
                                    return bTime - aTime;
                                });

                            if (allCompleted.length === 0) return null;

                            const filtered = historyFilter ? allCompleted.filter(c => c.title === historyFilter) : allCompleted;
                            const totalPts = allCompleted.reduce((s, c) => s + c.points, 0);

                            // Stats: group by chore name
                            const statMap: Record<string, { count: number; pts: number }> = {};
                            allCompleted.forEach(c => {
                                if (!statMap[c.title]) statMap[c.title] = { count: 0, pts: 0 };
                                statMap[c.title].count++;
                                statMap[c.title].pts += c.points;
                            });
                            const statEntries = Object.entries(statMap).sort((a, b) => b[1].pts - a[1].pts);
                            const maxPts = statEntries[0]?.[1].pts ?? 1;

                            // Streak: consecutive days with completions
                            const daySet = new Set(allCompleted.map(c => c.completedAt ? new Date(c.completedAt as string).toDateString() : ''));
                            let streak = 0;
                            const today = new Date();
                            for (let i = 0; i < 30; i++) {
                                const d = new Date(today); d.setDate(d.getDate() - i);
                                if (daySet.has(d.toDateString())) streak++; else break;
                            }

                            const uniqueTitles = Array.from(new Set(allCompleted.map(c => c.title)));

                            return (
                                <View style={{ flex: 1, minHeight: 0 }}>
                                    {/* Header row */}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                        <Clock size={16} color="#6366F1" />
                                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A', flex: 1 }}>Chore History</Text>
                                        <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#6366F1' }}>{allCompleted.length}</Text>
                                        </View>
                                        {/* List / Stats toggle */}
                                        <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 2 }}>
                                            <TouchableOpacity onPress={() => { setHistoryView('list'); setHistoryFilter(null); }} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: historyView === 'list' ? 'white' : 'transparent' }}>
                                                <List size={14} color={historyView === 'list' ? '#6366F1' : '#94A3B8'} />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => { setHistoryView('stats'); setHistoryFilter(null); }} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: historyView === 'stats' ? 'white' : 'transparent' }}>
                                                <LayoutGrid size={14} color={historyView === 'stats' ? '#6366F1' : '#94A3B8'} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {historyView === 'list' ? (
                                        <>
                                            {/* Search bar */}
                                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8, gap: 8 }}>
                                                <TextInput
                                                    placeholder="Search…"
                                                    value={historySearchQuery}
                                                    onChangeText={setHistorySearchQuery}
                                                    style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#1E293B' }}
                                                    placeholderTextColor="#94A3B8"
                                                />
                                                {!!historySearchQuery && (
                                                    <TouchableOpacity onPress={() => setHistorySearchQuery('')}>
                                                        <X size={13} color="#94A3B8" />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                            {/* Filter chips */}
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10, flexGrow: 0 }}>
                                                <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 2 }}>
                                                    <TouchableOpacity onPress={() => setHistoryFilter(null)} style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: !historyFilter ? '#6366F1' : '#F1F5F9' }}>
                                                        <Text style={{ fontSize: 11, fontWeight: '800', color: !historyFilter ? 'white' : '#64748B' }}>All</Text>
                                                    </TouchableOpacity>
                                                    {uniqueTitles.map(t => (
                                                        <TouchableOpacity key={t} onPress={() => setHistoryFilter(t === historyFilter ? null : t)} style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: historyFilter === t ? '#6366F1' : '#F1F5F9' }}>
                                                            <Text style={{ fontSize: 11, fontWeight: '800', color: historyFilter === t ? 'white' : '#64748B' }} numberOfLines={1}>{t}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            </ScrollView>
                                            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                                                {filtered.filter(c => !historySearchQuery || c.title.toLowerCase().includes(historySearchQuery.toLowerCase())).map(c => {
                                                    const completedAt = c.completedAt ? new Date(c.completedAt as string) : null;
                                                    const dateStr = completedAt ? completedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : c.dueDate;
                                                    return (
                                                        <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                                                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B', flex: 1 }} numberOfLines={1}>{c.title}</Text>
                                                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#94A3B8', marginHorizontal: 10 }}>{dateStr}</Text>
                                                            <View style={{ backgroundColor: '#F5F3FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                                                                <Text style={{ fontSize: 12, fontWeight: '900', color: '#7C3AED' }}>+{c.points}</Text>
                                                            </View>
                                                        </View>
                                                    );
                                                })}
                                            </ScrollView>
                                        </>
                                    ) : (
                                        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                                            {/* Summary cards */}
                                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                                                <View style={{ flex: 1, backgroundColor: '#EEF2FF', borderRadius: 16, padding: 14, alignItems: 'center' }}>
                                                    <Text style={{ fontSize: 22, fontWeight: '900', color: '#6366F1' }}>{allCompleted.length}</Text>
                                                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginTop: 2 }}>Total Done</Text>
                                                </View>
                                                <View style={{ flex: 1, backgroundColor: '#F5F3FF', borderRadius: 16, padding: 14, alignItems: 'center' }}>
                                                    <Text style={{ fontSize: 22, fontWeight: '900', color: '#7C3AED' }}>{totalPts}</Text>
                                                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginTop: 2 }}>Total Pts</Text>
                                                </View>
                                                <View style={{ flex: 1, backgroundColor: '#FFF7ED', borderRadius: 16, padding: 14, alignItems: 'center' }}>
                                                    <Text style={{ fontSize: 22, fontWeight: '900', color: '#F59E0B' }}>{streak}🔥</Text>
                                                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginTop: 2 }}>Streak</Text>
                                                </View>
                                            </View>
                                            {/* Per-chore bars */}
                                            <Text style={{ fontSize: 12, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>By Chore Type</Text>
                                            {statEntries.map(([title, { count, pts }]) => (
                                                <View key={title} style={{ marginBottom: 14 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                                                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B', flex: 1 }} numberOfLines={1}>{title}</Text>
                                                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#6366F1' }}>{count}× = {pts}pts</Text>
                                                    </View>
                                                    <View style={{ height: 8, backgroundColor: '#EEF2FF', borderRadius: 4, overflow: 'hidden' }}>
                                                        <View style={{ height: 8, width: `${Math.round((pts / maxPts) * 100)}%` as any, backgroundColor: '#6366F1', borderRadius: 4 }} />
                                                    </View>
                                                </View>
                                            ))}
                                        </ScrollView>
                                    )}
                                </View>
                            );
                        })()}

                        <TouchableOpacity
                            style={{ backgroundColor: '#0F172A', paddingVertical: 18, borderRadius: 24, alignItems: 'center', marginTop: 16 }}
                            onPress={closeSheet}
                        >
                            <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>Close Profile</Text>
                        </TouchableOpacity>
                        {/* HAR-36: drag handle for swipe-down */}
                        <View style={{ width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 10, alignSelf: 'center', marginBottom: 16, marginTop: 8 }} />
                    </KeyboardAvoidingView>
                    </Animated.View>
                    </GestureDetector>
                </View>
            </Modal>
            )}

            <ManageAnnouncementsModal visible={showAnnouncements} onClose={() => setShowAnnouncements(false)} />
            <HeatmapModal
                visible={showHeatmapModal}
                onClose={() => setShowHeatmapModal(false)}
                allChores={allChores}
                familyMembers={familyMembers}
            />
            <WishlistModal
                visible={showWishlist}
                onClose={() => setShowWishlist(false)}
                wishlist={wishlist}
                familyMembers={familyMembers}
                currentUser={currentUser}
                onAdd={addWishlistItem}
                onDelete={deleteWishlistItem}
            />
        </SafeAreaView >
    );
}
