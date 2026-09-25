/**
 * RandomAssignmentGames
 *
 * 5 completely unique, visually rich fairness games:
 *  1. Lightning Auction — live bidding war with animated lightning bolts + voltage meter
 *  2. Crystal Ball      — swirling galaxy particle field, ball reveals winner in mist
 *  3. Lava Lamp         — blobs float & collide, last blob standing is the winner
 *  4. Horse Race        — 8-lane animated horse track with crowd, jumps & photo finish
 *  5. Bubble Pop        — fill the screen with floating bubbles, all pop in a chain except winner
 *
 * Every run is seeded and logged. Winner is decided BEFORE animation.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet,
    Dimensions, Animated, Easing as RNEasing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
    Circle, Path, Rect, Line, Polygon, G, Text as SvgText,
    Defs, LinearGradient as SvgGradient, Stop, Ellipse, RadialGradient,
} from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import {
    X, Shuffle, RotateCcw, Trophy, History, ChevronRight,
    Clock, Zap, Dices,
} from 'lucide-react-native';
import { useRandomGamesStore, GameId, GameRun } from '../../store/randomGamesStore';
import { useHuddleStore, FamilyMember } from '../../store/huddleStore';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Color palette per player (up to 8) ─────────────────────────────────────
const PLAYER_COLORS = [
    '#6366F1', '#EC4899', '#10B981', '#F59E0B',
    '#06B6D4', '#8B5CF6', '#F97316', '#EF4444',
];

const BG_COLORS = [
    '#EEF2FF', '#FDF2F8', '#F0FDF4', '#FFFBEB',
    '#ECFEFF', '#F5F3FF', '#FFF7ED', '#FEF2F2',
];

const C = {
    bg: '#F8FAFC', card: '#FFFFFF', text: '#0F172A', sub: '#64748B',
    border: '#E2E8F0', muted: '#F1F5F9', accent: '#6366F1',
    gold: '#F59E0B', green: '#10B981', red: '#EF4444',
};

// ─── Game definitions ────────────────────────────────────────────────────────
const GAME_DEFS: Array<{ id: GameId; name: string; tagline: string; duration: number; icon: string; description: string }> = [
    {
        id: 'rocket_race',
        name: 'Horse Race',
        tagline: 'Down the track! Photo finish decides.',
        duration: 24000,
        icon: '🏆',
        description: 'Each player rides a horse down a multi-lane track. Horses surge forward in bursts of speed, jockey for position, leap hurdles, and trade the lead. Wind gusts and obstacles add chaos. At the finish line, a dramatic photo finish reveals the winner.',
    },
];

// ─── Seed / RNG ──────────────────────────────────────────────────────────────
function makeSeed(): number {
    return Math.floor(Math.random() * 2 ** 31);
}

function seededRand(seed: number): { next: () => number; nextInt: (max: number) => number } {
    let s = seed >>> 0;
    const next = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; };
    const nextInt = (max: number) => Math.floor(next() * max);
    return { next, nextInt };
}

function formatTime(ms: number): string {
    const d = new Date(ms);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
        ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ─── Player avatar chip ───────────────────────────────────────────────────────
function PlayerChip({ member, color, bgColor, size = 40 }: {
    member: FamilyMember; color: string; bgColor: string; size?: number;
}) {
    return (
        <View style={{ alignItems: 'center', gap: 4 }}>
            <View style={{
                width: size, height: size, borderRadius: size / 2,
                backgroundColor: bgColor, borderWidth: 2, borderColor: color,
                alignItems: 'center', justifyContent: 'center',
            }}>
                <Text style={{ fontSize: size * 0.52 }}>{member.avatar}</Text>
            </View>
            <Text style={{ fontSize: 11, fontWeight: '800', color }}>{member.name}</Text>
        </View>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME 1: LIGHTNING AUCTION
// 5 rounds of live bidding. Animated bolts arc between voltage meters.
// ═══════════════════════════════════════════════════════════════════════════
function LightningAuctionGame({ members, winnerIdx, seed, onDone }: {
    members: FamilyMember[]; winnerIdx: number; seed: number; onDone: () => void;
}) {
    const rng = useMemo(() => seededRand(seed), [seed]);
    const ROUNDS = 5;
    const ROUND_MS = 4000;

    // Pre-compute voltages: winner always ends highest
    const voltages = useMemo(() => {
        const v: number[][] = members.map(() => [0]);
        for (let r = 0; r < ROUNDS; r++) {
            members.forEach((_, i) => {
                const prev = v[i][r];
                const jump = rng.next() * 0.25 + 0.05;
                v[i].push(Math.min(1, prev + jump));
            });
        }
        // Ensure winner leads after final round
        const finals = v.map(arr => arr[ROUNDS]);
        const maxOther = Math.max(...finals.filter((_, i) => i !== winnerIdx));
        if (finals[winnerIdx] <= maxOther) {
            v[winnerIdx][ROUNDS] = Math.min(1, maxOther + 0.08 + rng.next() * 0.05);
        }
        return v;
    }, []);

    const [phase, setPhase] = useState<'idle' | 'bidding' | 'done'>('idle');
    const [round, setRound] = useState(0);
    const voltAnims = useRef(members.map(() => new Animated.Value(0))).current;
    const boltOpacity = useRef(new Animated.Value(0)).current;
    const roundAnim = useRef(new Animated.Value(0)).current;
    const [displayVolt, setDisplayVolt] = useState(members.map(() => 0));

    const start = useCallback(() => {
        if (phase !== 'idle') return;
        setPhase('bidding');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        let currentRound = 0;
        const runRound = () => {
            if (currentRound >= ROUNDS) {
                setPhase('done');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setTimeout(onDone, 2500);
                return;
            }
            currentRound++;
            setRound(currentRound);

            // Animate bolt flash
            Animated.sequence([
                Animated.timing(boltOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.timing(boltOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
            ]).start();

            // Animate voltage meters
            members.forEach((_, i) => {
                Animated.timing(voltAnims[i], {
                    toValue: voltages[i][currentRound],
                    duration: 1200,
                    easing: RNEasing.out(RNEasing.back(1.2)),
                    useNativeDriver: false,
                }).start();
            });

            // Update display values
            const listeners = members.map((_, i) => {
                return voltAnims[i].addListener(({ value }) => {
                    setDisplayVolt(prev => {
                        const next = [...prev];
                        next[i] = value;
                        return next;
                    });
                });
            });

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            setTimeout(() => {
                listeners.forEach((id, i) => voltAnims[i].removeListener(id));
                runRound();
            }, ROUND_MS);
        };

        setTimeout(runRound, 600);
    }, [phase]);

    const W = SW - 48;

    return (
        <View style={gs.gameArea}>
            <Text style={gs.gameSubtitle}>5 bidding rounds · Highest voltage wins</Text>

            {/* Bolt flash overlay */}
            <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#FEF9C3', opacity: boltOpacity, zIndex: 5, pointerEvents: 'none' }} />

            {/* Round indicator */}
            {phase === 'bidding' && (
                <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '900', color: C.sub }}>
                        Round {round} of {ROUNDS}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                        {Array.from({ length: ROUNDS }).map((_, i) => (
                            <View key={i} style={{ width: 24, height: 4, borderRadius: 2, backgroundColor: i < round ? '#F59E0B' : C.muted }} />
                        ))}
                    </View>
                </View>
            )}

            {/* Voltage meters */}
            <View style={{ paddingHorizontal: 24, gap: 14, marginTop: 16 }}>
                {members.map((m, i) => {
                    const color = PLAYER_COLORS[i % PLAYER_COLORS.length];
                    const pct = displayVolt[i];
                    const isDone = phase === 'done';
                    const isWinner = isDone && i === winnerIdx;
                    return (
                        <View key={m.name} style={{
                            backgroundColor: isWinner ? '#FFFBEB' : C.card,
                            borderRadius: 16, padding: 14,
                            borderWidth: isWinner ? 2 : 1, borderColor: isWinner ? '#F59E0B' : C.border,
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: color + '20', alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ fontSize: 20 }}>{m.avatar}</Text>
                                </View>
                                <Text style={{ flex: 1, fontSize: 14, fontWeight: '900', color: isWinner ? '#78350F' : C.text }}>{m.name}</Text>
                                {isWinner && <Text style={{ fontSize: 16 }}>⚡</Text>}
                                <Text style={{ fontSize: 13, fontWeight: '900', color }}>{Math.round(pct * 100)}V</Text>
                            </View>
                            {/* Voltage bar */}
                            <View style={{ height: 12, backgroundColor: C.muted, borderRadius: 6, overflow: 'hidden' }}>
                                <Animated.View style={{
                                    height: 12, borderRadius: 6,
                                    width: voltAnims[i].interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                                    backgroundColor: color,
                                }} />
                            </View>
                            {/* Bolt sparks along bar when active */}
                            {phase === 'bidding' && (
                                <Animated.View style={{
                                    position: 'absolute', right: 14, top: 50,
                                    opacity: boltOpacity,
                                }}>
                                    <Text style={{ fontSize: 14 }}>⚡</Text>
                                </Animated.View>
                            )}
                        </View>
                    );
                })}
            </View>

            {phase === 'idle' && (
                <TouchableOpacity onPress={start} style={[gs.launchBtn, { backgroundColor: '#F59E0B' }]}>
                    <Text style={gs.launchBtnText}>⚡  Start the Auction!</Text>
                </TouchableOpacity>
            )}
            {phase === 'bidding' && (
                <View style={gs.statusPill}>
                    <Text style={gs.statusText}>Live bidding in progress…</Text>
                </View>
            )}
            {phase === 'done' && (
                <View style={[gs.statusPill, { backgroundColor: '#FFFBEB', borderColor: '#F59E0B' }]}>
                    <Trophy size={14} color="#F59E0B" fill="#F59E0B" />
                    <Text style={[gs.statusText, { color: '#78350F' }]}>
                        {members[winnerIdx].name} wins the auction!
                    </Text>
                </View>
            )}
        </View>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME 2: CRYSTAL BALL
// 400 animated particles swirl. After buildup, mist clears → winner revealed.
// ═══════════════════════════════════════════════════════════════════════════
type Particle = {
    x: Animated.Value;
    y: Animated.Value;
    opacity: Animated.Value;
    scale: Animated.Value;
    color: string;
};

function CrystalBallGame({ members, winnerIdx, seed, onDone }: {
    members: FamilyMember[]; winnerIdx: number; seed: number; onDone: () => void;
}) {
    const rng = useMemo(() => seededRand(seed), [seed]);
    const CX = SW / 2;
    const CY = 160;
    const BALL_R = 110;
    const N_PARTICLES = 60;

    const [phase, setPhase] = useState<'idle' | 'swirling' | 'revealing' | 'done'>('idle');

    // Generate particles
    const particles = useMemo(() => {
        return Array.from({ length: N_PARTICLES }).map((_, i) => {
            const angle = rng.next() * Math.PI * 2;
            const dist = rng.next() * BALL_R * 0.85;
            const startX = CX + Math.cos(angle) * dist;
            const startY = CY + Math.sin(angle) * dist;
            const colorIdx = Math.floor(rng.next() * members.length);
            return {
                x: new Animated.Value(startX),
                y: new Animated.Value(startY),
                opacity: new Animated.Value(0),
                scale: new Animated.Value(0.5 + rng.next() * 1.5),
                color: PLAYER_COLORS[colorIdx % PLAYER_COLORS.length],
            } as Particle;
        });
    }, []);

    const mistOpacity = useRef(new Animated.Value(1)).current;
    const revealScale = useRef(new Animated.Value(0)).current;
    const glowOpacity = useRef(new Animated.Value(0)).current;
    const [displayedParticles, setDisplayedParticles] = useState<Array<{ cx: number; cy: number; r: number; color: string; opacity: number }>>([]);

    const start = useCallback(() => {
        if (phase !== 'idle') return;
        setPhase('swirling');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        // Animate particles swirling
        const SWIRL_DURATION = 16000;
        const animations = particles.map((p, i) => {
            const delay = (i / N_PARTICLES) * 800;
            // Orbit path: 3-5 full rotations
            return Animated.sequence([
                Animated.delay(delay),
                Animated.parallel([
                    Animated.timing(p.opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
                    Animated.timing(p.scale, { toValue: 1, duration: 600, useNativeDriver: true }),
                ]),
            ]);
        });

        Animated.parallel(animations).start();

        // Animate orbiting positions via JS listener loop
        let startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed > SWIRL_DURATION) return;

            const pts = particles.map((p, i) => {
                const angle0 = (i / N_PARTICLES) * Math.PI * 2;
                const speed = 0.8 + (i % 3) * 0.4;
                const t = elapsed / 1000;
                const angle = angle0 + t * speed;
                const dist = (60 + (i % 5) * 10) * (0.7 + 0.3 * Math.sin(t * 0.5 + i));
                const cx = CX + Math.cos(angle) * dist;
                const cy = CY + Math.sin(angle) * dist * 0.6;
                return { cx, cy, r: 3 + (i % 3), color: PLAYER_COLORS[(i + winnerIdx) % PLAYER_COLORS.length], opacity: 1 };
            });
            setDisplayedParticles(pts);
            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);

        // After SWIRL_DURATION: reveal
        setTimeout(() => {
            setPhase('revealing');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

            // Fade mist, scale in winner name
            Animated.sequence([
                Animated.timing(mistOpacity, { toValue: 0, duration: 1500, useNativeDriver: true }),
                Animated.parallel([
                    Animated.spring(revealScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
                    Animated.timing(glowOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
                ]),
            ]).start(() => {
                setPhase('done');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setTimeout(onDone, 3000);
            });
        }, SWIRL_DURATION);
    }, [phase]);

    return (
        <View style={gs.gameArea}>
            <Text style={gs.gameSubtitle}>The cosmos decides…</Text>

            <View style={{ alignItems: 'center', marginTop: 8 }}>
                <Svg width={SW} height={340}>
                    {/* Deep space background */}
                    <Rect x={0} y={0} width={SW} height={340} fill="#0A0A1A" rx={0} />
                    {/* Stars */}
                    {Array.from({ length: 40 }).map((_, i) => (
                        <Circle key={i} cx={(i * 57 + 13) % SW} cy={(i * 31 + 7) % 340} r={0.8 + (i % 3) * 0.4} fill="white" opacity={0.3 + (i % 5) * 0.1} />
                    ))}

                    {/* Glow ring */}
                    <Defs>
                        <RadialGradient id="ballGlow" cx="50%" cy="50%" r="50%">
                            <Stop offset="0%" stopColor="#818CF8" stopOpacity="0.3" />
                            <Stop offset="100%" stopColor="#818CF8" stopOpacity="0" />
                        </RadialGradient>
                        <RadialGradient id="ballCore" cx="40%" cy="35%" r="60%">
                            <Stop offset="0%" stopColor="#E0E7FF" stopOpacity="0.9" />
                            <Stop offset="60%" stopColor="#6366F1" stopOpacity="0.7" />
                            <Stop offset="100%" stopColor="#1E1B4B" stopOpacity="1" />
                        </RadialGradient>
                        <RadialGradient id="mistGlow" cx="50%" cy="50%" r="50%">
                            <Stop offset="0%" stopColor="#E0E7FF" stopOpacity="0.8" />
                            <Stop offset="100%" stopColor="#818CF8" stopOpacity="0.1" />
                        </RadialGradient>
                    </Defs>

                    {/* Outer glow */}
                    <Circle cx={CX} cy={CY} r={BALL_R + 30} fill="url(#ballGlow)" />

                    {/* Particles */}
                    {displayedParticles.map((p, i) => (
                        <Circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={p.color} opacity={0.85} />
                    ))}

                    {/* Crystal ball */}
                    <Circle cx={CX} cy={CY} r={BALL_R} fill="url(#ballCore)" />
                    {/* Highlight */}
                    <Ellipse cx={CX - 28} cy={CY - 30} rx={22} ry={14} fill="white" opacity={0.25} />

                    {/* Mist inside ball */}
                    {phase !== 'done' && (
                        <Circle cx={CX} cy={CY} r={BALL_R - 4} fill="url(#mistGlow)" opacity={0.6} />
                    )}

                    {/* Stand */}
                    <Ellipse cx={CX} cy={CY + BALL_R + 8} rx={36} ry={8} fill="#2D1B69" opacity={0.8} />
                    <Rect x={CX - 8} y={CY + BALL_R} width={16} height={16} rx={4} fill="#3730A3" />

                    {/* Winner name (revealed) */}
                    {(phase === 'revealing' || phase === 'done') && (
                        <G>
                            <SvgText x={CX} y={CY + 6} fontSize={18} fontWeight="900"
                                fill="white" textAnchor="middle" alignmentBaseline="middle"
                                opacity={phase === 'done' ? 1 : 0.8}>
                                {members[winnerIdx].name}
                            </SvgText>
                        </G>
                    )}

                    {/* Mist overlay */}
                    {phase === 'swirling' && (
                        <Circle cx={CX} cy={CY} r={BALL_R - 4} fill="white" opacity={0.15} />
                    )}
                </Svg>

                {/* Animated mist overlay */}
                {phase === 'swirling' && (
                    <Animated.View style={{
                        position: 'absolute', top: 50, left: CX - BALL_R,
                        width: BALL_R * 2, height: BALL_R * 2, borderRadius: BALL_R,
                        backgroundColor: '#E0E7FF',
                        opacity: mistOpacity,
                    }} />
                )}
            </View>

            {/* Member avatars */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingHorizontal: 24, paddingVertical: 8 }}>
                {members.map((m, i) => (
                    <PlayerChip key={m.name} member={m}
                        color={PLAYER_COLORS[i % PLAYER_COLORS.length]}
                        bgColor={BG_COLORS[i % BG_COLORS.length]}
                    />
                ))}
            </ScrollView>

            {phase === 'idle' && (
                <TouchableOpacity onPress={start} style={[gs.launchBtn, { backgroundColor: '#4F46E5' }]}>
                    <Text style={gs.launchBtnText}>🔮  Consult the Crystal Ball</Text>
                </TouchableOpacity>
            )}
            {phase === 'swirling' && (
                <View style={gs.statusPill}>
                    <Text style={gs.statusText}>The cosmos is aligning…</Text>
                </View>
            )}
            {phase === 'revealing' && (
                <View style={[gs.statusPill, { backgroundColor: '#EEF2FF', borderColor: '#6366F1' }]}>
                    <Text style={[gs.statusText, { color: '#4F46E5' }]}>The mist is clearing…</Text>
                </View>
            )}
            {phase === 'done' && (
                <View style={[gs.statusPill, { backgroundColor: '#F0FDF4', borderColor: C.green }]}>
                    <Trophy size={14} color={C.green} fill={C.green} />
                    <Text style={[gs.statusText, { color: C.green }]}>
                        Destiny chose {members[winnerIdx].name}!
                    </Text>
                </View>
            )}
        </View>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME 3: LAVA LAMP
// Blobs float, collide, get eliminated one by one. Last blob wins.
// ═══════════════════════════════════════════════════════════════════════════
type Blob = {
    x: number; y: number; vx: number; vy: number;
    r: number; color: string; name: string; memberIdx: number;
    alive: boolean;
};

function LavaLampGame({ members, winnerIdx, seed, onDone }: {
    members: FamilyMember[]; winnerIdx: number; seed: number; onDone: () => void;
}) {
    const rng = useMemo(() => seededRand(seed), [seed]);
    const W = SW - 48;
    const H = 320;
    const ELIM_INTERVAL = 4000;

    const [phase, setPhase] = useState<'idle' | 'floating' | 'done'>('idle');
    const [blobs, setBlobs] = useState<Blob[]>([]);
    const [eliminatedOrder, setEliminatedOrder] = useState<number[]>([]);
    const blobsRef = useRef<Blob[]>([]);
    const animFrameRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);

    const initBlobs = useCallback(() => {
        const b: Blob[] = members.map((m, i) => ({
            x: 24 + rng.next() * (W - 48),
            y: 24 + rng.next() * (H - 48),
            vx: (rng.next() - 0.5) * 1.5,
            vy: (rng.next() - 0.5) * 1.5,
            r: 28 + rng.next() * 14,
            color: PLAYER_COLORS[i % PLAYER_COLORS.length],
            name: m.name,
            memberIdx: i,
            alive: true,
        }));
        blobsRef.current = b;
        setBlobs([...b]);
    }, [members]);

    const start = useCallback(() => {
        if (phase !== 'idle') return;
        setPhase('floating');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        initBlobs();

        let lastElim = Date.now();
        // Elimination order: all except winner, reversed (winner last)
        const elimOrder = members.map((_, i) => i).filter(i => i !== winnerIdx);
        // Shuffle elimination order
        for (let i = elimOrder.length - 1; i > 0; i--) {
            const j = rng.nextInt(i + 1);
            [elimOrder[i], elimOrder[j]] = [elimOrder[j], elimOrder[i]];
        }
        let elimIdx = 0;
        const eliminated: number[] = [];

        const totalElimTime = elimOrder.length * ELIM_INTERVAL;

        const animate = (time: number) => {
            const dt = time - (lastTimeRef.current || time);
            lastTimeRef.current = time;
            const now = Date.now();

            // Eliminate one blob every ELIM_INTERVAL ms
            if (elimIdx < elimOrder.length && now - lastElim >= ELIM_INTERVAL) {
                const toElim = elimOrder[elimIdx];
                blobsRef.current[toElim].alive = false;
                eliminated.push(toElim);
                setEliminatedOrder([...eliminated]);
                elimIdx++;
                lastElim = now;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }

            // Move blobs
            blobsRef.current.forEach(b => {
                if (!b.alive) return;
                b.x += b.vx * (dt / 16);
                b.y += b.vy * (dt / 16);
                // Bounce off walls
                if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); }
                if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
                if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy); }
                if (b.y + b.r > H) { b.y = H - b.r; b.vy = -Math.abs(b.vy); }
                // Slight random drift
                b.vx += (rng.next() - 0.5) * 0.05;
                b.vy += (rng.next() - 0.5) * 0.05;
                b.vx = Math.max(-2, Math.min(2, b.vx));
                b.vy = Math.max(-2, Math.min(2, b.vy));
            });

            setBlobs([...blobsRef.current]);

            if (elimIdx >= elimOrder.length) {
                // All eliminated except winner
                setTimeout(() => {
                    setPhase('done');
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setTimeout(onDone, 2500);
                }, 2000);
                return;
            }

            animFrameRef.current = requestAnimationFrame(animate);
        };

        animFrameRef.current = requestAnimationFrame(animate);
    }, [phase, members, winnerIdx]);

    useEffect(() => {
        return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
    }, []);

    return (
        <View style={gs.gameArea}>
            <Text style={gs.gameSubtitle}>Last blob glowing wins the chore</Text>

            <View style={{ paddingHorizontal: 24, marginTop: 12 }}>
                <View style={{ width: W, height: H, backgroundColor: '#1E1B4B', borderRadius: 20, overflow: 'hidden' }}>
                    <Svg width={W} height={H}>
                        <Defs>
                            {members.map((_, i) => (
                                <RadialGradient key={i} id={`blobGrad${i}`} cx="40%" cy="35%" r="65%">
                                    <Stop offset="0%" stopColor="white" stopOpacity="0.4" />
                                    <Stop offset="100%" stopColor={PLAYER_COLORS[i % PLAYER_COLORS.length]} stopOpacity="1" />
                                </RadialGradient>
                            ))}
                        </Defs>

                        {/* Lamp interior glow */}
                        <Rect x={0} y={0} width={W} height={H} fill="#1E1B4B" />
                        <Ellipse cx={W / 2} cy={H} rx={W * 0.6} ry={80} fill="#312E81" opacity={0.5} />

                        {/* Blobs */}
                        {blobs.map((b, i) => {
                            if (!b.alive) {
                                return null; // Eliminated blobs disappear
                            }
                            const isDone = phase === 'done';
                            const isWinner = b.memberIdx === winnerIdx;
                            return (
                                <G key={i}>
                                    {/* Glow halo */}
                                    <Circle cx={b.x} cy={b.y} r={b.r + 8} fill={b.color} opacity={0.2} />
                                    {/* Main blob */}
                                    <Circle cx={b.x} cy={b.y} r={b.r} fill={`url(#blobGrad${b.memberIdx})`} />
                                    {/* Winner crown in done phase */}
                                    {isDone && isWinner && (
                                        <SvgText x={b.x} y={b.y - b.r - 8} fontSize={18} textAnchor="middle">👑</SvgText>
                                    )}
                                    {/* Name */}
                                    <SvgText x={b.x} y={b.y + 4} fontSize={Math.min(11, b.r * 0.35)}
                                        fill="white" textAnchor="middle" alignmentBaseline="middle"
                                        fontWeight="900">
                                        {b.name.length > 6 ? b.name.slice(0, 5) + '…' : b.name}
                                    </SvgText>
                                </G>
                            );
                        })}
                    </Svg>
                </View>
            </View>

            {/* Elimination log */}
            {eliminatedOrder.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 24, gap: 8, paddingVertical: 10 }}>
                    {eliminatedOrder.map((idx, pos) => (
                        <View key={idx} style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                            <Text style={{ fontSize: 13 }}>{members[idx].avatar}</Text>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#991B1B' }}>Out #{pos + 1}</Text>
                        </View>
                    ))}
                </ScrollView>
            )}

            {phase === 'idle' && (
                <TouchableOpacity onPress={start} style={[gs.launchBtn, { backgroundColor: '#4F46E5' }]}>
                    <Text style={gs.launchBtnText}>🫧  Light the Lamp!</Text>
                </TouchableOpacity>
            )}
            {phase === 'floating' && (
                <View style={gs.statusPill}>
                    <Text style={gs.statusText}>{blobs.filter(b => b.alive).length} blobs remaining…</Text>
                </View>
            )}
            {phase === 'done' && (
                <View style={[gs.statusPill, { backgroundColor: '#F0FDF4', borderColor: C.green }]}>
                    <Trophy size={14} color={C.green} fill={C.green} />
                    <Text style={[gs.statusText, { color: C.green }]}>
                        {members[winnerIdx].name}'s blob survives!
                    </Text>
                </View>
            )}
        </View>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME 4: HORSE RACE
// Dynamic SVG horse silhouettes, wind streaks, obstacles, photo finish.
// ═══════════════════════════════════════════════════════════════════════════

// SVG horse silhouette — realistic thoroughbred, no rider/jockey
function HorseSilhouette({ x, y, color, scale = 1, stride = 0 }: {
    x: number; y: number; color: string; scale?: number; stride?: number;
}) {
    const s = scale;
    const swing = Math.sin(stride * Math.PI * 2);
    const swing2 = Math.sin(stride * Math.PI * 2 + Math.PI);
    // Leg angles for full gallop (4 legs, alternating pairs)
    const fl1 = swing * 10;   // front-left
    const fl2 = swing2 * 10;  // front-right
    const bl1 = swing2 * 9;   // back-left
    const bl2 = swing * 9;    // back-right
    // Body bob
    const bob = Math.abs(swing) * 2;
    const darkColor = color + 'BB';
    const shadowColor = color + '55';
    return (
        <G transform={`translate(${x},${y - bob}) scale(${s})`}>
            {/* Shadow beneath horse */}
            <Ellipse cx={0} cy={14} rx={18} ry={3} fill="rgba(0,0,0,0.18)" />
            {/* Back legs (drawn first, behind body) */}
            <Path
                d={`M -10,6 L ${-13 + bl1},18 L ${-13 + bl1},22`}
                stroke={darkColor} strokeWidth={3.5} strokeLinecap="round" fill="none"
            />
            <Path
                d={`M -14,6 L ${-17 + bl2},18 L ${-17 + bl2},22`}
                stroke={color} strokeWidth={3.5} strokeLinecap="round" fill="none"
            />
            {/* Hooves back */}
            <Ellipse cx={-13 + bl1} cy={22} rx={3} ry={1.5} fill="#1a0a00" />
            <Ellipse cx={-17 + bl2} cy={22} rx={3} ry={1.5} fill="#1a0a00" />
            {/* Body — main torso with muscle shading */}
            <Path
                d={`M -18,2 Q -20,-4 -14,-7 Q -4,-10 8,-8 Q 16,-6 18,-1 Q 20,4 16,8 Q 8,12 -4,12 Q -14,12 -18,8 Z`}
                fill={color}
            />
            {/* Barrel highlight */}
            <Path
                d={`M -6,-8 Q 4,-10 12,-7 Q 14,-4 10,-2 Q 2,-6 -6,-5 Z`}
                fill="rgba(255,255,255,0.12)"
            />
            {/* Neck — muscular curve */}
            <Path
                d={`M 10,-5 Q 16,-10 18,-18 Q 19,-23 17,-26`}
                stroke={color} strokeWidth={8} strokeLinecap="round" fill="none"
            />
            <Path
                d={`M 12,-5 Q 18,-9 20,-18`}
                stroke="rgba(255,255,255,0.1)" strokeWidth={3} strokeLinecap="round" fill="none"
            />
            {/* Head */}
            <Path
                d={`M 17,-26 Q 22,-28 24,-25 Q 26,-21 24,-18 Q 21,-15 18,-16 Q 15,-18 15,-22 Q 15,-25 17,-26 Z`}
                fill={color}
            />
            {/* Nostril */}
            <Ellipse cx={24} cy={-20} rx={1.5} ry={1} fill="#1a0a00" opacity={0.6} />
            {/* Eye */}
            <Circle cx={19} cy={-24} r={1.4} fill="#1a0a00" />
            <Circle cx={19.5} cy={-24.5} r={0.5} fill="rgba(255,255,255,0.7)" />
            {/* Ear */}
            <Path d={`M 16,-28 L 15,-33 L 19,-30`} fill={color} stroke={darkColor} strokeWidth={1} />
            {/* Mane — flowing strands */}
            <Path
                d={`M 16,-27 Q 12,-24 10,-20 Q 8,-16 10,-12`}
                stroke={shadowColor} strokeWidth={4} strokeLinecap="round" fill="none"
            />
            <Path
                d={`M 15,-26 Q 11,-22 9,-18 Q 7,-14 9,-10`}
                stroke="rgba(255,255,255,0.15)" strokeWidth={2} strokeLinecap="round" fill="none"
            />
            {/* Tail — multi-strand flowing */}
            <Path
                d={`M -18,0 Q -26,6 -24,14 Q -22,20 -25,26`}
                stroke={color} strokeWidth={4.5} strokeLinecap="round" fill="none"
            />
            <Path
                d={`M -18,2 Q -28,8 -26,16 Q -24,22 -27,28`}
                stroke={darkColor} strokeWidth={3} strokeLinecap="round" fill="none"
            />
            <Path
                d={`M -17,4 Q -23,10 -22,18 Q -21,24 -23,28`}
                stroke="rgba(255,255,255,0.12)" strokeWidth={2} strokeLinecap="round" fill="none"
            />
            {/* Front legs (drawn last, in front of body) */}
            <Path
                d={`M 8,8 L ${10 + fl1},18 L ${10 + fl1},22`}
                stroke={color} strokeWidth={3.5} strokeLinecap="round" fill="none"
            />
            <Path
                d={`M 4,8 L ${6 + fl2},18 L ${6 + fl2},22`}
                stroke={darkColor} strokeWidth={3.5} strokeLinecap="round" fill="none"
            />
            {/* Hooves front */}
            <Ellipse cx={10 + fl1} cy={22} rx={3} ry={1.5} fill="#1a0a00" />
            <Ellipse cx={6 + fl2} cy={22} rx={3} ry={1.5} fill="#1a0a00" />
        </G>
    );
}

// Mario-style track item: banana peel, coin, or star
function TrackItem({ x, y, kind }: { x: number; y: number; kind: number }) {
    if (kind === 0) {
        // Banana peel — yellow crescent — SLOWS horse
        return (
            <G transform={`translate(${x},${y})`}>
                <Ellipse cx={0} cy={0} rx={9} ry={5} fill="#F59E0B" opacity={0.95} />
                <Ellipse cx={0} cy={0} rx={7} ry={3} fill="#FDE68A" opacity={0.8} />
                <Path d="M -8,0 Q -4,-8 0,-5 Q 4,-2 8,0" stroke="#D97706" strokeWidth={1.5} fill="none" opacity={0.7} />
                <Rect x={-13} y={7} width={26} height={10} rx={5} fill="#92400E" opacity={0.85} />
                <SvgText x={0} y={15} fontSize={6} fontWeight="900" fill="#FEF3C7" textAnchor="middle">SLOWS!</SvgText>
            </G>
        );
    }
    if (kind === 1) {
        // Coin — gold circle with shine — SPEED BOOST
        return (
            <G transform={`translate(${x},${y})`}>
                <Circle cx={0} cy={0} r={7} fill="#F59E0B" />
                <Circle cx={0} cy={0} r={5} fill="#FDE68A" />
                <Circle cx={-2} cy={-2} r={1.5} fill="rgba(255,255,255,0.6)" />
                <SvgText x={0} y={3} fontSize={7} fontWeight="900" fill="#92400E" textAnchor="middle">$</SvgText>
                <Rect x={-13} y={9} width={26} height={10} rx={5} fill="#D97706" opacity={0.9} />
                <SvgText x={0} y={17} fontSize={6} fontWeight="900" fill="#FEF3C7" textAnchor="middle">BOOST!</SvgText>
            </G>
        );
    }
    // Star — spiky star shape — INVINCIBLE
    return (
        <G transform={`translate(${x},${y})`}>
            <Polygon points="0,-8 2,-3 7,-3 3,1 5,6 0,3 -5,6 -3,1 -7,-3 -2,-3" fill="#F59E0B" />
            <Polygon points="0,-6 1.5,-2 5,-2 2,1 3.5,5 0,2 -3.5,5 -2,1 -5,-2 -1.5,-2" fill="#FDE68A" opacity={0.7} />
            <Rect x={-16} y={9} width={32} height={10} rx={5} fill="#7C3AED" opacity={0.9} />
            <SvgText x={0} y={17} fontSize={6} fontWeight="900" fill="#F5F3FF" textAnchor="middle">INVINCIBLE!</SvgText>
        </G>
    );
}

function HorseRaceGame({ members, winnerIdx, seed, onDone }: {
    members: FamilyMember[]; winnerIdx: number; seed: number; onDone: (finishOrder: number[]) => void;
}) {
    const rng = useMemo(() => seededRand(seed), [seed]);
    const TRACK_W = SW - 32;
    const LANE_H = Math.min(80, Math.floor((SH * 0.44) / members.length));
    const HEADER_H = 36;
    const TOTAL_H = members.length * LANE_H + HEADER_H;
    const TOTAL_MS = 26000;
    const STEPS = 130;
    const STEP_MS = TOTAL_MS / STEPS;
    const FINISH_PCT = 0.86;
    const FINISH_X = TRACK_W * FINISH_PCT;

    // Pre-placed obstacles: 3 per lane — position + mario item kind (0=banana,1=coin,2=star)
    const obstacles = useMemo(() => members.map((_, li) => [
        { pct: 0.20 + rng.next() * 0.10, kind: (li + 0) % 3 },
        { pct: 0.38 + rng.next() * 0.12, kind: (li + 1) % 3 },
        { pct: 0.56 + rng.next() * 0.12, kind: (li + 2) % 3 },
    ]), []);

    // Per-step effect state: [horse][step] = null | 'slow' | 'boost' | 'star'
    const horseEffectSteps = useRef<(null | 'slow' | 'boost' | 'star')[][]>([]);

    // Pre-compute position path — winner first, loser last — item effects applied
    const horsePaths = useMemo(() => {
        const paths: number[][] = members.map(() => [0]);
        const speedRanks: number[] = members.map((_, i) => i === winnerIdx ? 1.0 : 0.7 + rng.next() * 0.25);
        const sortedRanks = [...speedRanks].sort((a, b) => b - a);
        speedRanks[winnerIdx] = sortedRanks[0];

        // Track which items each horse has already consumed (to not double-apply)
        const consumed: boolean[][] = members.map((_, li) => obstacles[li].map(() => false));
        // Per-horse active effect: { mult: number, stepsLeft: number, kind: null|'slow'|'boost'|'star' }
        const activeEffect: { mult: number; stepsLeft: number; kind: null | 'slow' | 'boost' | 'star' }[] =
            members.map(() => ({ mult: 1.0, stepsLeft: 0, kind: null }));
        // Parallel per-step effect tracking for visual overlay
        const effectSteps: (null | 'slow' | 'boost' | 'star')[][] = members.map(() => [null]);

        for (let step = 1; step <= STEPS; step++) {
            members.forEach((_, i) => {
                const prev = paths[i][step - 1];

                // Check if horse just reached any item in its lane
                obstacles[i].forEach((obs, oi) => {
                    if (!consumed[i][oi] && prev < obs.pct && prev + 0.015 >= obs.pct) {
                        consumed[i][oi] = true;
                        if (obs.kind === 0) {
                            activeEffect[i] = { mult: 0.3, stepsLeft: 12, kind: 'slow' };
                        } else if (obs.kind === 1) {
                            activeEffect[i] = { mult: 2.4, stepsLeft: 10, kind: 'boost' };
                        } else {
                            activeEffect[i] = { mult: 2.8, stepsLeft: 14, kind: 'star' };
                        }
                    }
                });

                // Tick effect
                let effectMult = 1.0;
                if (activeEffect[i].stepsLeft > 0) {
                    effectMult = activeEffect[i].mult;
                    effectSteps[i].push(activeEffect[i].kind);
                    activeEffect[i].stepsLeft--;
                } else {
                    effectSteps[i].push(null);
                }

                const burst = rng.next() < 0.18 ? 0.016 : 0;
                const base = 0.0095 * speedRanks[i];
                const speed = (base + burst + rng.next() * 0.004 - 0.001) * effectMult;
                paths[i].push(Math.min(FINISH_PCT + 0.12, prev + Math.max(0, speed)));
            });
        }
        horseEffectSteps.current = effectSteps;
        // Ensure winner reaches finish first
        const finals = members.map((_, i) => paths[i][STEPS - 1]);
        const maxOther = Math.max(...finals.filter((_, i) => i !== winnerIdx));
        if (finals[winnerIdx] <= maxOther) {
            for (let s = STEPS - 20; s < STEPS; s++) {
                paths[winnerIdx][s] = Math.min(FINISH_PCT + 0.12, paths[winnerIdx][s] + 0.018);
            }
        }
        return paths;
    }, []);

    const [phase, setPhase] = useState<'idle' | 'countdown' | 'racing' | 'photofinish' | 'done'>('idle');
    const [positions, setPositions] = useState<number[]>(members.map(() => 0));
    const [strideStep, setStrideStep] = useState(0);
    // HAR-129: per-horse active effect for visual overlay
    const [horseEffects, setHorseEffects] = useState<(null | 'slow' | 'boost' | 'star')[]>(members.map(() => null));
    const horseEffectsRef = useRef<(null | 'slow' | 'boost' | 'star')[]>(members.map(() => null));
    const stepRef = useRef(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [windPhase, setWindPhase] = useState(0);
    const [countdown, setCountdown] = useState(3);
    const windRef = useRef(0);
    const [finishOrder, setFinishOrder] = useState<number[]>([]);
    const finishOrderRef = useRef<number[]>([]);

    const startRace = useCallback(() => {
        setPhase('racing');
        finishOrderRef.current = [];
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        stepRef.current = 0;
        intervalRef.current = setInterval(() => {
            stepRef.current++;
            const s = stepRef.current;
            const newPositions = members.map((_, i) => {
                if (s < STEPS) return horsePaths[i][s];
                // extend path for horses that haven't crossed yet
                const last = horsePaths[i][STEPS - 1];
                if (last >= FINISH_PCT) return last;
                return Math.min(FINISH_PCT + 0.12, last + (s - STEPS + 1) * 0.008);
            });
            setPositions(newPositions);
            setStrideStep(s);
            // Update per-horse effect for visual overlay
            const newEffects = members.map((_, i) => horseEffectSteps.current[i]?.[Math.min(s, STEPS - 1)] ?? null);
            setHorseEffects(newEffects);
            windRef.current = (windRef.current + 1) % 60;
            setWindPhase(windRef.current);
            // Track finish order
            newPositions.forEach((pos, i) => {
                if (pos >= FINISH_PCT && !finishOrderRef.current.includes(i)) {
                    finishOrderRef.current = [...finishOrderRef.current, i];
                    setFinishOrder([...finishOrderRef.current]);
                    if (finishOrderRef.current.length === 1) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    }
                }
            });

            if (s % 12 === 0 && s > 0 && s < STEPS - 20) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }

            // Race ends when ALL horses have finished (or hard timeout at STEPS + 40)
            const allFinished = finishOrderRef.current.length >= members.length;
            const hardTimeout = s >= STEPS + 40;
            if (allFinished || hardTimeout) {
                clearInterval(intervalRef.current!);
                // Any remaining horses that haven't crossed — add in position order
                const remaining = members.map((_, i) => i).filter(i => !finishOrderRef.current.includes(i))
                    .sort((a, b) => (horsePaths[b][STEPS - 1] ?? 0) - (horsePaths[a][STEPS - 1] ?? 0));
                const finalOrder = [...finishOrderRef.current, ...remaining];
                finishOrderRef.current = finalOrder;
                setFinishOrder(finalOrder);
                setPhase('photofinish');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                setTimeout(() => {
                    setPhase('done');
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setTimeout(() => onDone(finishOrderRef.current), 3500);
                }, 2800);
            }
        }, STEP_MS);
    }, []);

    const handleStart = useCallback(() => {
        if (phase !== 'idle') return;
        setPhase('countdown');
        setCountdown(3);
        let c = 3;
        const cd = setInterval(() => {
            c--;
            if (c <= 0) {
                clearInterval(cd);
                startRace();
            } else {
                setCountdown(c);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
        }, 800);
    }, [phase, startRace]);

    useEffect(() => {
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, []);

    // Sort current standings for leaderboard
    const standings = useMemo(() => (
        [...members.map((m, i) => ({ m, i, pos: positions[i] }))]
            .sort((a, b) => b.pos - a.pos)
    ), [positions]);
    const loserIdx = finishOrder.length === members.length ? finishOrder[finishOrder.length - 1] : winnerIdx;

    // Wind streak positions (pseudo-random but stable per windPhase)
    const windStreaks = useMemo(() => {
        const streaks = [];
        for (let k = 0; k < 6; k++) {
            streaks.push({
                x: ((windPhase * 13 + k * 67) % TRACK_W),
                y: HEADER_H + ((windPhase * 7 + k * 41) % (TOTAL_H - HEADER_H)),
                len: 18 + (k % 3) * 12,
                op: 0.08 + (k % 4) * 0.05,
            });
        }
        return streaks;
    }, [windPhase, TRACK_W, TOTAL_H]);

    // Crowd person colors for variety
    const CROWD_COLORS = ['#EF4444','#F59E0B','#10B981','#6366F1','#EC4899','#06B6D4','#8B5CF6','#F97316'];
    const GRASS_TOP = HEADER_H;
    const TRACK_TOP = GRASS_TOP + 10; // thin grass strip above dirt
    const DIRT_H = members.length * LANE_H;
    const GRASS_BOT_H = 18; // spectator grass strip at bottom

    return (
        <View style={gs.gameArea}>
            {/* Track */}
            <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
                <View style={{ width: TRACK_W, height: TOTAL_H, borderRadius: 18, overflow: 'hidden' }}>
                    <Svg width={TRACK_W} height={TOTAL_H}>
                        <Defs>
                            {/* Sky */}
                            <SvgGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor="#1E3A5F" />
                                <Stop offset="0.5" stopColor="#2563EB" />
                                <Stop offset="1" stopColor="#60A5FA" />
                            </SvgGradient>
                            {/* Dirt track */}
                            <SvgGradient id="dirtGrad" x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor="#C4A882" />
                                <Stop offset="0.4" stopColor="#B8956A" />
                                <Stop offset="1" stopColor="#A07850" />
                            </SvgGradient>
                            {/* Grass infield */}
                            <SvgGradient id="grassGrad" x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor="#16A34A" />
                                <Stop offset="1" stopColor="#15803D" />
                            </SvgGradient>
                            {/* Grandstand */}
                            <SvgGradient id="standGrad" x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor="#374151" />
                                <Stop offset="1" stopColor="#1F2937" />
                            </SvgGradient>
                            {/* Lane highlight */}
                            <SvgGradient id="laneHL" x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor="rgba(255,255,255,0.08)" />
                                <Stop offset="1" stopColor="rgba(255,255,255,0)" />
                            </SvgGradient>
                        </Defs>

                        {/* ── SKY (header area) ── */}
                        <Rect x={0} y={0} width={TRACK_W} height={HEADER_H} fill="url(#skyGrad)" />

                        {/* Clouds */}
                        {[0.12, 0.38, 0.65, 0.82].map((cx, ci) => {
                            const cloudX = TRACK_W * cx + ((windPhase * 0.4) % (TRACK_W * 0.25));
                            const cloudY = 8 + (ci % 2) * 8;
                            return (
                                <G key={`cloud${ci}`} opacity={0.55}>
                                    <Ellipse cx={cloudX} cy={cloudY} rx={18} ry={7} fill="white" />
                                    <Ellipse cx={cloudX - 10} cy={cloudY + 2} rx={12} ry={5} fill="white" />
                                    <Ellipse cx={cloudX + 10} cy={cloudY + 2} rx={14} ry={6} fill="white" />
                                </G>
                            );
                        })}

                        {/* Status text in sky */}
                        <Rect x={TRACK_W / 2 - 72} y={6} width={144} height={20} rx={10} fill="rgba(0,0,0,0.35)" />
                        <SvgText x={TRACK_W / 2} y={20} fontSize={10} fontWeight="900" fill="white" textAnchor="middle">
                            {phase === 'racing' ? '🏁 RACE IN PROGRESS' : phase === 'photofinish' ? '📸 PHOTO FINISH' : phase === 'done' ? '🏆 FINISH!' : 'READY TO RACE'}
                        </SvgText>

                        {/* ── GRANDSTAND (top strip) ── */}
                        <Rect x={0} y={HEADER_H - 4} width={TRACK_W} height={14} fill="url(#standGrad)" />
                        {/* Grandstand rows */}
                        {[0, 1, 2].map(row => (
                            <Line key={`row${row}`} x1={0} y1={HEADER_H - 4 + row * 4} x2={TRACK_W} y2={HEADER_H - 4 + row * 4}
                                stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
                        ))}
                        {/* Grandstand people (colorful dots) */}
                        {Array.from({ length: Math.floor(TRACK_W / 8) }).map((_, k) => {
                            const px = k * 8 + 4;
                            const py = HEADER_H - 2 + (k % 3) * 4;
                            return <Circle key={`gp${k}`} cx={px} cy={py} r={3} fill={CROWD_COLORS[k % CROWD_COLORS.length]} opacity={0.7} />;
                        })}

                        {/* ── DIRT TRACK ── */}
                        <Rect x={0} y={GRASS_TOP} width={TRACK_W} height={DIRT_H} fill="url(#dirtGrad)" />

                        {/* Dirt texture lines */}
                        {Array.from({ length: 8 }).map((_, k) => (
                            <Line key={`dt${k}`} x1={0} y1={GRASS_TOP + k * (DIRT_H / 7)} x2={TRACK_W} y2={GRASS_TOP + k * (DIRT_H / 7)}
                                stroke="rgba(160,120,70,0.4)" strokeWidth={0.5} />
                        ))}

                        {/* Lane dividers — white dashed lines */}
                        {members.map((_, i) => i > 0 && (
                            <G key={`lane${i}`}>
                                {Array.from({ length: Math.floor(TRACK_W / 14) }).map((_, d) => (
                                    <Line key={d} x1={d * 14} y1={GRASS_TOP + i * LANE_H}
                                        x2={d * 14 + 7} y2={GRASS_TOP + i * LANE_H}
                                        stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
                                ))}
                            </G>
                        ))}

                        {/* Lane hover highlight alternate rows */}
                        {members.map((_, i) => i % 2 === 0 ? (
                            <Rect key={`lh${i}`} x={0} y={GRASS_TOP + i * LANE_H} width={TRACK_W} height={LANE_H}
                                fill="rgba(255,255,255,0.03)" />
                        ) : null)}

                        {/* ── RAIL FENCE (top and bottom of track) ── */}
                        {/* Top rail */}
                        <Rect x={0} y={GRASS_TOP - 2} width={TRACK_W} height={4} rx={2} fill="#E5E7EB" />
                        {/* Rail posts top */}
                        {Array.from({ length: Math.floor(TRACK_W / 32) }).map((_, k) => (
                            <Rect key={`rpt${k}`} x={k * 32 + 14} y={GRASS_TOP - 6} width={4} height={10} rx={1} fill="#D1D5DB" />
                        ))}
                        {/* Bottom rail */}
                        <Rect x={0} y={GRASS_TOP + DIRT_H - 2} width={TRACK_W} height={4} rx={2} fill="#E5E7EB" />
                        {/* Rail posts bottom */}
                        {Array.from({ length: Math.floor(TRACK_W / 32) }).map((_, k) => (
                            <Rect key={`rpb${k}`} x={k * 32 + 14} y={GRASS_TOP + DIRT_H - 4} width={4} height={10} rx={1} fill="#D1D5DB" />
                        ))}

                        {/* ── SPECTATOR STRIP (bottom) ── */}
                        <Rect x={0} y={GRASS_TOP + DIRT_H + 2} width={TRACK_W} height={GRASS_BOT_H} fill="url(#grassGrad)" />
                        {/* Spectators on grass — head + body silhouettes */}
                        {Array.from({ length: Math.floor(TRACK_W / 11) }).map((_, k) => {
                            const px = k * 11 + 5;
                            const pBaseY = TOTAL_H - 2;
                            const bodyH = 8 + (k % 3) * 3;
                            const color = CROWD_COLORS[k % CROWD_COLORS.length];
                            return (
                                <G key={`sp${k}`}>
                                    {/* Body */}
                                    <Rect x={px - 3} y={pBaseY - bodyH} width={6} height={bodyH} rx={2} fill={color} opacity={0.75} />
                                    {/* Head */}
                                    <Circle cx={px} cy={pBaseY - bodyH - 4} r={4} fill={color} opacity={0.8} />
                                    {/* Arms raised when racing */}
                                    {phase === 'racing' && k % 3 === (windPhase % 3) && (
                                        <>
                                            <Line x1={px - 3} y1={pBaseY - bodyH + 3} x2={px - 8} y2={pBaseY - bodyH - 4}
                                                stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.7} />
                                            <Line x1={px + 3} y1={pBaseY - bodyH + 3} x2={px + 8} y2={pBaseY - bodyH - 4}
                                                stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.7} />
                                        </>
                                    )}
                                </G>
                            );
                        })}

                        {/* ── STARTING GATE ── */}
                        <Rect x={24} y={GRASS_TOP} width={6} height={DIRT_H} fill="rgba(255,255,255,0.25)" />
                        {/* Gate bars */}
                        {members.map((_, i) => (
                            <Rect key={`g${i}`} x={22} y={GRASS_TOP + i * LANE_H + 4} width={10} height={3} rx={1}
                                fill={phase === 'idle' || phase === 'countdown' ? '#EF4444' : '#10B981'} opacity={0.9} />
                        ))}
                        <SvgText x={27} y={GRASS_TOP - 5} fontSize={7} fontWeight="900" fill="rgba(255,255,255,0.7)" textAnchor="middle">START</SvgText>

                        {/* ── FINISH LINE ── */}
                        {/* Pole */}
                        <Rect x={FINISH_X - 2} y={GRASS_TOP - 8} width={4} height={DIRT_H + 8} fill="#F9FAFB" opacity={0.9} />
                        {/* Checkered flag */}
                        {Array.from({ length: 8 }).map((_, k) => (
                            <Rect key={`ff${k}`} x={FINISH_X + (k % 2 === 0 ? 0 : 6)} y={GRASS_TOP - 8 + Math.floor(k / 2) * 6}
                                width={6} height={6} fill={k % 2 === 0 ? 'white' : 'black'} opacity={0.9} />
                        ))}
                        {/* Checkered stripes on track */}
                        {Array.from({ length: Math.floor(DIRT_H / 6) }).map((_, k) => (
                            <Rect key={`fl${k}`} x={FINISH_X - 3} y={GRASS_TOP + k * 6} width={6} height={3}
                                fill={k % 2 === 0 ? 'white' : 'rgba(0,0,0,0.4)'} opacity={0.85} />
                        ))}

                        {/* ── SPEED EFFECTS (wind streaks only) ── */}
                        {phase === 'racing' && windStreaks.map((w, k) => (
                            <Line key={k} x1={w.x} y1={w.y} x2={w.x - w.len} y2={w.y + 2}
                                stroke="rgba(255,255,255,0.9)" strokeWidth={0.8} opacity={w.op} />
                        ))}

                        {/* ── MARIO-STYLE TRACK ITEMS ── */}
                        {phase !== 'idle' && phase !== 'countdown' && members.map((_, i) => {
                            const laneY = GRASS_TOP + i * LANE_H + LANE_H * 0.62;
                            return obstacles[i].map((obs, oi) => {
                                const obsX = 32 + obs.pct * (FINISH_X - 32);
                                const passed = positions[i] > obs.pct + 0.03;
                                if (passed) return null;
                                return <TrackItem key={oi} x={obsX} y={laneY} kind={obs.kind} />;
                            });
                        })}

                        {/* ── HORSES ── */}
                        {members.map((_, i) => {
                            const pct = positions[i];
                            const horseX = 32 + pct * (FINISH_X - 32);
                            const laneY = GRASS_TOP + i * LANE_H + LANE_H * 0.62;
                            const color = PLAYER_COLORS[i % PLAYER_COLORS.length];
                            const isWinner = i === winnerIdx;
                            const isDone = phase === 'done' || phase === 'photofinish';
                            const strideAnim = phase === 'racing' ? (strideStep + i * 8) / 8 : 0;
                            const hScale = Math.min(0.7, LANE_H / 75);
                            const effect = horseEffects[i];

                            return (
                                <G key={i}>
                                    {/* HAR-129: Item effect visual aura */}
                                    {effect === 'slow' && (
                                        <>
                                            <Ellipse cx={horseX} cy={laneY} rx={28 * hScale} ry={18 * hScale} fill="#F59E0B" opacity={0.25} />
                                            <SvgText x={horseX} y={laneY - 22 * hScale} fontSize={8} fontWeight="900" fill="#D97706" textAnchor="middle">🍌 SLOW!</SvgText>
                                        </>
                                    )}
                                    {effect === 'boost' && (
                                        <>
                                            <Ellipse cx={horseX} cy={laneY} rx={32 * hScale} ry={20 * hScale} fill="#F59E0B" opacity={0.3} />
                                            <Line x1={horseX - 20 * hScale} y1={laneY - 6 * hScale} x2={horseX - 50 * hScale} y2={laneY - 4 * hScale} stroke="#F59E0B" strokeWidth={3} opacity={0.7} />
                                            <Line x1={horseX - 18 * hScale} y1={laneY + 2 * hScale} x2={horseX - 45 * hScale} y2={laneY + 4 * hScale} stroke="#F59E0B" strokeWidth={2} opacity={0.5} />
                                            <SvgText x={horseX} y={laneY - 24 * hScale} fontSize={8} fontWeight="900" fill="#D97706" textAnchor="middle">🪙 BOOST!</SvgText>
                                        </>
                                    )}
                                    {effect === 'star' && (
                                        <>
                                            <Ellipse cx={horseX} cy={laneY} rx={36 * hScale} ry={22 * hScale} fill="#7C3AED" opacity={0.3} />
                                            <Ellipse cx={horseX} cy={laneY} rx={28 * hScale} ry={16 * hScale} fill="#F59E0B" opacity={0.25} />
                                            <SvgText x={horseX} y={laneY - 26 * hScale} fontSize={9} fontWeight="900" fill="#7C3AED" textAnchor="middle">⭐ INVINCIBLE!</SvgText>
                                        </>
                                    )}
                                    {/* Dust cloud trail */}
                                    {phase === 'racing' && (
                                        <>
                                            <Ellipse cx={horseX - 24 * hScale} cy={laneY + 12 * hScale} rx={16 * hScale} ry={5 * hScale} fill="#C4A882" opacity={0.22} />
                                            <Ellipse cx={horseX - 40 * hScale} cy={laneY + 10 * hScale} rx={10 * hScale} ry={3 * hScale} fill="#C4A882" opacity={0.12} />
                                            {/* Speed lines — larger when boosted */}
                                            <Line x1={horseX - 26 * hScale} y1={laneY - 6 * hScale}
                                                x2={horseX - (effect === 'boost' || effect === 'star' ? 70 : 42) * hScale} y2={laneY - 6 * hScale}
                                                stroke={effect === 'star' ? '#7C3AED' : color} strokeWidth={effect ? 2.5 : 1.5} opacity={effect ? 0.55 : 0.25} />
                                            <Line x1={horseX - 24 * hScale} y1={laneY - 2 * hScale}
                                                x2={horseX - (effect === 'boost' || effect === 'star' ? 55 : 38) * hScale} y2={laneY - 2 * hScale}
                                                stroke={effect === 'star' ? '#7C3AED' : color} strokeWidth={1} opacity={effect ? 0.4 : 0.18} />
                                        </>
                                    )}
                                    {/* Horse */}
                                    <HorseSilhouette x={horseX} y={laneY} color={effect === 'star' ? '#F59E0B' : color} scale={hScale} stride={strideAnim} />
                                    {/* Winner crown */}
                                    {isDone && isWinner && (
                                        <G transform={`translate(${horseX},${laneY - 38 * hScale})`}>
                                            <Polygon points="-8,0 -5,-8 0,-4 5,-8 8,0" fill="#F59E0B" />
                                            <Ellipse cx={-8} cy={0} rx={2.5} ry={2.5} fill="#F59E0B" />
                                            <Ellipse cx={0} cy={-4} rx={2.5} ry={2.5} fill="#F59E0B" />
                                            <Ellipse cx={8} cy={0} rx={2.5} ry={2.5} fill="#F59E0B" />
                                        </G>
                                    )}
                                    {/* Finish badge — shown when horse crossed the line */}
                                    {finishOrder.includes(i) && (() => {
                                        const rank = finishOrder.indexOf(i);
                                        const badgeH = Math.max(24, LANE_H * 0.7);
                                        const badgeY = GRASS_TOP + i * LANE_H + (LANE_H - badgeH) / 2;
                                        const rankColors = ['#F59E0B', '#94A3B8', '#CD7F32'];
                                        const medalEmoji = rank === 0 ? '🥇' : rank === 1 ? '🥈' : '🥉';
                                        const rankNum = rank < 3 ? null : `#${rank + 1}`;
                                        return (
                                            <G>
                                                {/* Lane highlight behind finish line */}
                                                <Rect x={FINISH_X - 2} y={GRASS_TOP + i * LANE_H} width={TRACK_W - FINISH_X + 2} height={LANE_H} fill={rank < 3 ? rankColors[rank] : color} opacity={0.13} />
                                                {/* Badge pill on right */}
                                                <Rect x={TRACK_W - 30} y={badgeY} width={28} height={badgeH} rx={6} fill={rank < 3 ? rankColors[rank] : color} opacity={0.92} />
                                                <SvgText
                                                    x={TRACK_W - 16}
                                                    y={badgeY + badgeH * 0.5 + 5}
                                                    fontSize={rank < 3 ? 13 : 9}
                                                    fontWeight="900"
                                                    fill="white"
                                                    textAnchor="middle"
                                                >
                                                    {rank < 3 ? medalEmoji : rankNum}
                                                </SvgText>
                                            </G>
                                        );
                                    })()}
                                    {/* Lane number + name tag on left */}
                                    <Rect x={2} y={GRASS_TOP + i * LANE_H + 4} width={Math.min((members[i]?.name?.length ?? 4) * 5 + 18, 72)} height={13} rx={4} fill={`${color}DD`} />
                                    <SvgText x={8} y={GRASS_TOP + i * LANE_H + 14} fontSize={8} fontWeight="900" fill="white">{i + 1}. {members[i]?.name}</SvgText>
                                </G>
                            );
                        })}
                    </Svg>
                </View>
            </View>

            {/* Countdown overlay */}
            {phase === 'countdown' && (
                <View style={{ alignItems: 'center', marginTop: 16 }}>
                    <Text style={{ fontSize: 56, fontWeight: '900', color: '#15803D', lineHeight: 64 }}>{countdown}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: C.sub }}>Get ready…</Text>
                </View>
            )}

            {/* Live standings strip */}
            {phase === 'racing' && (
                <View style={{ paddingHorizontal: 16, marginTop: 10 }}>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                        {standings.map(({ m, i }, rank) => (
                            <View key={i} style={{
                                flexDirection: 'row', alignItems: 'center', gap: 6,
                                backgroundColor: rank === 0 ? '#FFFBEB' : C.card,
                                paddingHorizontal: 10, paddingVertical: 5,
                                borderRadius: 12, borderWidth: 1,
                                borderColor: rank === 0 ? '#F59E0B' : C.border,
                            }}>
                                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: PLAYER_COLORS[i % PLAYER_COLORS.length], alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#fff' }}>#{rank + 1}</Text>
                                </View>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: rank === 0 ? '#92400E' : C.text }}>{m.name}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Photo finish */}
            {phase === 'photofinish' && (
                <View style={{ alignItems: 'center', marginTop: 16, gap: 6 }}>
                    <View style={{ backgroundColor: '#FFFBEB', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1.5, borderColor: '#F59E0B' }}>
                        <Text style={{ fontSize: 15, fontWeight: '900', color: '#78350F', textAlign: 'center' }}>📸  Photo finish developing…</Text>
                    </View>
                </View>
            )}

            {/* Done — finish order reveal */}
            {phase === 'done' && (
                <View style={{ marginTop: 16, gap: 8, paddingHorizontal: 16 }}>
                    {/* Winner */}
                    <View style={{ backgroundColor: '#F0FDF4', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 12, borderWidth: 1.5, borderColor: C.green, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Trophy size={18} color={C.green} fill={C.green} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: C.green, textTransform: 'uppercase', letterSpacing: 1 }}>1st Place</Text>
                            <Text style={{ fontSize: 16, fontWeight: '900', color: '#065F46', marginTop: 1 }}>{members[winnerIdx]?.name}</Text>
                        </View>
                        <Text style={{ fontSize: 16 }}>🥇</Text>
                    </View>
                    {/* Finish order for rest */}
                    {finishOrder.filter(i => i !== winnerIdx).map((idx, rank) => (
                        <View key={idx} style={{ backgroundColor: rank === finishOrder.length - 2 ? '#FEE2E2' : C.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: rank === finishOrder.length - 2 ? '#FCA5A5' : C.border, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ fontSize: 12, fontWeight: '900', color: C.sub, width: 20, textAlign: 'center' }}>#{rank + 2}</Text>
                            <Text style={{ flex: 1, fontSize: 14, fontWeight: '800', color: rank === finishOrder.length - 2 ? C.red : C.text }}>{members[idx]?.name}</Text>
                            {rank === finishOrder.length - 2 && (
                                <View style={{ backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '900', color: C.red }}>CHORE DUTY</Text>
                                </View>
                            )}
                        </View>
                    ))}
                </View>
            )}

            {phase === 'idle' && (
                <TouchableOpacity onPress={handleStart} style={[gs.launchBtn, { backgroundColor: '#15803D', marginTop: 18 }]}>
                    <Text style={gs.launchBtnText}>🏁  Start the Race!</Text>
                </TouchableOpacity>
            )}
            {phase === 'racing' && (
                <View style={[gs.statusPill, { marginTop: 8 }]}>
                    <Text style={gs.statusText}>Racing down the track…</Text>
                </View>
            )}
        </View>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME 5: BUBBLE POP
// Screen fills with color-coded bubbles. Chain reaction pops all except winner.
// ═══════════════════════════════════════════════════════════════════════════
type Bubble = {
    id: number; x: number; y: number; r: number;
    color: string; memberIdx: number; name: string;
    vx: number; vy: number;
    alive: boolean; popping: boolean; popProgress: number;
};

function BubblePopGame({ members, winnerIdx, seed, onDone }: {
    members: FamilyMember[]; winnerIdx: number; seed: number; onDone: () => void;
}) {
    const rng = useMemo(() => seededRand(seed), [seed]);
    const W = SW - 48;
    const H = 300;
    const BUBBLES_PER_MEMBER = Math.max(3, Math.floor(24 / members.length));
    const FLOAT_DURATION = 8000;
    const POP_INTERVAL = 200; // ms between pops during chain reaction

    const [phase, setPhase] = useState<'idle' | 'floating' | 'popping' | 'done'>('idle');
    const [bubbles, setBubbles] = useState<Bubble[]>([]);
    const bubblesRef = useRef<Bubble[]>([]);
    const animFrameRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);

    const initBubbles = useCallback(() => {
        const bs: Bubble[] = [];
        let id = 0;
        members.forEach((m, mi) => {
            for (let b = 0; b < BUBBLES_PER_MEMBER; b++) {
                bs.push({
                    id: id++,
                    x: 20 + rng.next() * (W - 40),
                    y: 20 + rng.next() * (H - 40),
                    r: 18 + rng.next() * 16,
                    color: PLAYER_COLORS[mi % PLAYER_COLORS.length],
                    memberIdx: mi,
                    name: m.name,
                    vx: (rng.next() - 0.5) * 0.8,
                    vy: (rng.next() - 0.5) * 0.8 - 0.3, // slight upward bias
                    alive: true,
                    popping: false,
                    popProgress: 0,
                });
            }
        });
        bubblesRef.current = bs;
        setBubbles([...bs]);
    }, [members]);

    const start = useCallback(() => {
        if (phase !== 'idle') return;
        setPhase('floating');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        initBubbles();

        // Float phase
        lastTimeRef.current = 0;
        const floatAnimate = (time: number) => {
            const dt = Math.min(time - (lastTimeRef.current || time), 50);
            lastTimeRef.current = time;

            bubblesRef.current.forEach(b => {
                if (!b.alive) return;
                b.x += b.vx * (dt / 16);
                b.y += b.vy * (dt / 16);
                if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); }
                if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
                if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy); }
                if (b.y + b.r > H) { b.y = H - b.r; b.vy = -Math.abs(b.vy); }
            });

            setBubbles([...bubblesRef.current]);
            animFrameRef.current = requestAnimationFrame(floatAnimate);
        };
        animFrameRef.current = requestAnimationFrame(floatAnimate);

        // After float, start chain pop
        setTimeout(() => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            setPhase('popping');

            // Build pop sequence: all non-winner bubbles in random order, then winner's bubbles also pop except one
            const nonWinner = bubblesRef.current.filter(b => b.memberIdx !== winnerIdx);
            const winnerBubbles = bubblesRef.current.filter(b => b.memberIdx === winnerIdx);

            // Shuffle non-winner pops
            for (let i = nonWinner.length - 1; i > 0; i--) {
                const j = rng.nextInt(i + 1);
                [nonWinner[i], nonWinner[j]] = [nonWinner[j], nonWinner[i]];
            }
            // All but last winner bubble also pop
            const popSequence = [
                ...nonWinner,
                ...winnerBubbles.slice(0, -1),
            ];

            let popIdx = 0;
            const popNext = () => {
                if (popIdx >= popSequence.length) {
                    setTimeout(() => {
                        setPhase('done');
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        setTimeout(onDone, 2000);
                    }, 1500);
                    return;
                }

                const b = popSequence[popIdx];
                b.alive = false;
                b.popping = true;
                setBubbles([...bubblesRef.current]);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                popIdx++;

                setTimeout(popNext, POP_INTERVAL + (popIdx > nonWinner.length ? 600 : 0));
            };
            setTimeout(popNext, 500);
        }, FLOAT_DURATION);
    }, [phase, members, winnerIdx]);

    useEffect(() => {
        return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
    }, []);

    const aliveCount = bubbles.filter(b => b.alive && b.memberIdx !== winnerIdx).length;
    const winnerBubblesAlive = bubbles.filter(b => b.alive && b.memberIdx === winnerIdx).length;

    return (
        <View style={gs.gameArea}>
            <Text style={gs.gameSubtitle}>
                {phase === 'idle' ? 'Pop all bubbles. One survives.' :
                 phase === 'floating' ? `${bubbles.filter(b => b.alive).length} bubbles floating…` :
                 phase === 'popping' ? `${bubbles.filter(b => b.alive).length} bubbles remain…` :
                 `${members[winnerIdx].name}'s bubble survived!`}
            </Text>

            <View style={{ paddingHorizontal: 24, marginTop: 12 }}>
                <View style={{ width: W, height: H, backgroundColor: '#0F172A', borderRadius: 20, overflow: 'hidden' }}>
                    <Svg width={W} height={H}>
                        <Defs>
                            {members.map((_, i) => (
                                <RadialGradient key={i} id={`bubbleGrad${i}`} cx="35%" cy="30%" r="65%">
                                    <Stop offset="0%" stopColor="white" stopOpacity="0.5" />
                                    <Stop offset="60%" stopColor={PLAYER_COLORS[i % PLAYER_COLORS.length]} stopOpacity="0.7" />
                                    <Stop offset="100%" stopColor={PLAYER_COLORS[i % PLAYER_COLORS.length]} stopOpacity="0.95" />
                                </RadialGradient>
                            ))}
                        </Defs>

                        <Rect x={0} y={0} width={W} height={H} fill="#0F172A" />

                        {bubbles.map(b => {
                            if (!b.alive && !b.popping) return null;
                            const isDoneWinner = phase === 'done' && b.memberIdx === winnerIdx;
                            const scale = b.popping ? 0.3 : 1;
                            const opacity = b.popping ? 0.2 : 1;
                            return (
                                <G key={b.id}>
                                    {/* Outer ring */}
                                    <Circle cx={b.x} cy={b.y} r={b.r * scale + 3}
                                        fill="none" stroke={b.color} strokeWidth={1.5} opacity={opacity * 0.4} />
                                    {/* Main bubble */}
                                    <Circle cx={b.x} cy={b.y} r={b.r * scale}
                                        fill={`url(#bubbleGrad${b.memberIdx})`} opacity={opacity} />
                                    {/* Shine */}
                                    <Ellipse cx={b.x - b.r * 0.25 * scale} cy={b.y - b.r * 0.3 * scale}
                                        rx={b.r * 0.25 * scale} ry={b.r * 0.15 * scale}
                                        fill="white" opacity={opacity * 0.6} />
                                    {/* Name */}
                                    {!b.popping && b.r > 20 && (
                                        <SvgText x={b.x} y={b.y + 4}
                                            fontSize={Math.min(9, b.r * 0.4)} fontWeight="900"
                                            fill="white" textAnchor="middle" alignmentBaseline="middle">
                                            {b.name.length > 5 ? b.name.slice(0, 4) + '…' : b.name}
                                        </SvgText>
                                    )}
                                    {/* Winner crown */}
                                    {isDoneWinner && b.alive && (
                                        <SvgText x={b.x} y={b.y - b.r - 6} fontSize={16} textAnchor="middle">✨</SvgText>
                                    )}
                                </G>
                            );
                        })}
                    </Svg>
                </View>
            </View>

            {/* Member color legend */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, gap: 8, paddingVertical: 10 }}>
                {members.map((m, i) => {
                    const color = PLAYER_COLORS[i % PLAYER_COLORS.length];
                    const alive = phase !== 'done' || i === winnerIdx;
                    return (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: alive ? color + '20' : '#F1F5F9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, opacity: alive ? 1 : 0.4 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                            <Text style={{ fontSize: 11, fontWeight: '800', color: alive ? color : C.sub }}>{m.name}</Text>
                        </View>
                    );
                })}
            </ScrollView>

            {phase === 'idle' && (
                <TouchableOpacity onPress={start} style={[gs.launchBtn, { backgroundColor: '#4F46E5' }]}>
                    <Text style={gs.launchBtnText}>🫧  Fill & Pop!</Text>
                </TouchableOpacity>
            )}
            {phase === 'done' && (
                <View style={[gs.statusPill, { backgroundColor: '#F0FDF4', borderColor: C.green }]}>
                    <Trophy size={14} color={C.green} fill={C.green} />
                    <Text style={[gs.statusText, { color: C.green }]}>
                        {members[winnerIdx].name}'s bubble survived!
                    </Text>
                </View>
            )}
        </View>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME PICKER MODAL
// ═══════════════════════════════════════════════════════════════════════════
export function GamePickerModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const { log } = useRandomGamesStore();

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
                <View style={gps.header}>
                    <View>
                        <Text style={gps.title}>🎮  Random Games</Text>
                        <Text style={gps.sub}>{log.length} past games on record</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={gps.closeBtn}><X size={20} color={C.sub} /></TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
                    {/* Game cards */}
                    <Text style={gps.sectionLabel}>Available Games</Text>
                    {GAME_DEFS.map(g => (
                        <View key={g.id} style={gps.gameCard}>
                            <Text style={{ fontSize: 32 }}>{g.icon}</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={gps.gameName}>{g.name}</Text>
                                <Text style={gps.gameTagline}>{g.tagline}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                    <Clock size={10} color={C.sub} />
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: C.sub }}>~{Math.round(g.duration / 1000)}s</Text>
                                </View>
                            </View>
                        </View>
                    ))}

                    {/* Audit log */}
                    {log.length > 0 && (
                        <>
                            <Text style={[gps.sectionLabel, { marginTop: 8 }]}>Game History (Audit Log)</Text>
                            {log.map(run => (
                                <View key={run.id} style={gps.logRow}>
                                    <View style={[gps.logIcon, { backgroundColor: '#EEF2FF' }]}>
                                        <Trophy size={14} color={C.accent} />
                                    </View>
                                    <View style={{ flex: 1, gap: 2 }}>
                                        <Text style={gps.logChore} numberOfLines={1}>{run.choreTitle}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={gps.logMeta}>{run.gameName}</Text>
                                            <Text style={gps.logDot}>·</Text>
                                            <Text style={gps.logMeta}>Won by <Text style={{ color: C.accent }}>{run.winner}</Text></Text>
                                        </View>
                                        <Text style={[gps.logMeta, { fontSize: 10 }]}>
                                            Run by {run.ranBy} · {formatTime(run.ranAt)}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </>
                    )}

                    {log.length === 0 && (
                        <View style={{ alignItems: 'center', padding: 40 }}>
                            <Dices size={40} color="#CBD5E1" />
                            <Text style={{ fontSize: 14, fontWeight: '700', color: C.sub, marginTop: 12 }}>No games played yet</Text>
                            <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Tap 🎲 on any unassigned chore</Text>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN: RANDOM ASSIGNMENT MODAL
// ═══════════════════════════════════════════════════════════════════════════
export function RandomAssignmentModal({ visible, onClose, chore, onAssigned }: {
    visible: boolean;
    onClose: () => void;
    chore: { id: string; title: string } | null;
    onAssigned: (memberName: string, gameId: GameId, gameName: string, runId: string) => void;
}) {
    const { familyMembers, currentUser } = useHuddleStore();
    const { addRun } = useRandomGamesStore();

    const allMembers = useMemo(() => familyMembers.filter(m => (m.role as string) !== 'Pet'), [familyMembers]);

    const [step, setStep] = useState<'pick' | 'game'>('pick');
    const [selectedGame, setSelectedGame] = useState<typeof GAME_DEFS[0] | null>(null);
    const [seed] = useState(makeSeed);
    const [winnerIdx, setWinnerIdx] = useState(0);
    const [committed, setCommitted] = useState(false);

    const [poolSet, setPoolSet] = useState<Set<string>>(() => new Set(allMembers.map(m => m.name)));
    const members = useMemo(() => allMembers.filter(m => poolSet.has(m.name)), [allMembers, poolSet]);

    const [infoGame, setInfoGame] = useState<typeof GAME_DEFS[0] | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        if (visible) {
            setPoolSet(new Set(allMembers.map(m => m.name)));
            setStep('pick');
            setSelectedGame(null);
            setCommitted(false);
        }
    }, [visible]);

    useEffect(() => {
        if (members.length > 0) {
            const rng = seededRand(seed);
            setWinnerIdx(rng.nextInt(members.length));
        }
    }, [members.length, seed]);

    const toggleMember = (name: string) => {
        setPoolSet(prev => {
            const next = new Set(prev);
            if (next.has(name)) {
                if (next.size <= 2) return prev;
                next.delete(name);
            } else {
                next.add(name);
            }
            return next;
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const startGame = () => {
        if (members.length < 2) return;
        setSelectedGame(GAME_DEFS[0]);
        setStep('game');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const handleGameDone = useCallback((finishOrder: number[]) => {
        if (committed || !chore || !selectedGame) return;
        setCommitted(true);
        // Last place gets the chore
        const loserIdx = finishOrder.length > 0 ? finishOrder[finishOrder.length - 1] : winnerIdx;
        const loser = members[loserIdx];

        const runData = {
            gameId: selectedGame.id,
            gameName: selectedGame.name,
            choreId: chore.id,
            choreTitle: chore.title,
            winner: loser.name, // loser gets the chore — stored as "winner" for audit
            participants: members.map(m => m.name),
            ranBy: currentUser ?? 'Unknown',
            ranAt: Date.now(),
            seed,
        };
        addRun(runData);
        const run = useRandomGamesStore.getState().log[0];

        onAssigned(loser.name, selectedGame.id, selectedGame.name, run.id);
        setTimeout(onClose, 400);
    }, [committed, chore, selectedGame, winnerIdx, members, currentUser, seed]);

    if (!chore) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
            <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
                {/* Header */}
                <View style={gs.header}>
                    {step === 'game' ? (
                        <TouchableOpacity onPress={() => setStep('pick')} style={gs.backBtn}>
                            <RotateCcw size={16} color={C.sub} />
                        </TouchableOpacity>
                    ) : <View style={{ width: 36 }} />}
                    <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={gs.headerTitle}>
                            {step === 'pick' ? '🎲  Pick a Game' : selectedGame?.icon + '  ' + selectedGame?.name}
                        </Text>
                        <Text style={gs.headerSub} numberOfLines={1}>{chore.title}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                        {step === 'pick' && (
                            <TouchableOpacity onPress={() => setShowHistory(true)} style={[gs.closeBtn, { backgroundColor: C.muted }]}>
                                <History size={16} color={C.sub} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={onClose} style={gs.closeBtn}><X size={18} color={C.sub} /></TouchableOpacity>
                    </View>
                </View>

                {step === 'pick' ? (
                    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                        {/* Race hero banner */}
                        <View style={{ backgroundColor: '#14532D', borderRadius: 24, padding: 20, marginBottom: 20, alignItems: 'center', overflow: 'hidden' }}>
                            <View style={{ flexDirection: 'row', gap: -4, marginBottom: 12 }}>
                                {members.map((_, i) => {
                                    const color = PLAYER_COLORS[i % PLAYER_COLORS.length];
                                    return (
                                        <View key={i} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: color, borderWidth: 2, borderColor: '#14532D', alignItems: 'center', justifyContent: 'center', marginLeft: i === 0 ? 0 : -8 }}>
                                            <View style={{ width: 20, height: 14, borderRadius: 3, backgroundColor: `${color}CC` }} />
                                        </View>
                                    );
                                })}
                            </View>
                            <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff', textAlign: 'center' }}>🏁  Horse Race</Text>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginTop: 4, textAlign: 'center' }}>Fully random · Photo finish · ~22s</Text>
                        </View>

                        {/* Member pool */}
                        <Text style={[gs.sectionLabel, { marginBottom: 12 }]}>Who's racing?</Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: C.sub, marginBottom: 14, marginTop: -8 }}>Tap to remove from draw (min 2)</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
                            {allMembers.map((m, i) => {
                                const active = poolSet.has(m.name);
                                const color = PLAYER_COLORS[i % PLAYER_COLORS.length];
                                return (
                                    <TouchableOpacity
                                        key={m.name}
                                        onPress={() => toggleMember(m.name)}
                                        activeOpacity={0.8}
                                        style={{
                                            flexDirection: 'row', alignItems: 'center', gap: 8,
                                            paddingHorizontal: 14, paddingVertical: 10,
                                            borderRadius: 20, borderWidth: 2,
                                            borderColor: active ? color : '#CBD5E1',
                                            backgroundColor: active ? `${color}18` : '#F8FAFC',
                                            opacity: active ? 1 : 0.5,
                                        }}
                                    >
                                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: active ? color : '#CBD5E1' }} />
                                        <Text style={{ fontSize: 14, fontWeight: '800', color: active ? color : C.sub }}>{m.name}</Text>
                                        {!active && <X size={12} color="#CBD5E1" />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Start button */}
                        <TouchableOpacity
                            onPress={startGame}
                            disabled={members.length < 2}
                            activeOpacity={0.85}
                            style={{
                                backgroundColor: members.length >= 2 ? '#15803D' : '#CBD5E1',
                                borderRadius: 18, paddingVertical: 18, alignItems: 'center',
                                flexDirection: 'row', justifyContent: 'center', gap: 10,
                                shadowColor: '#15803D', shadowOffset: { width: 0, height: 6 },
                                shadowOpacity: members.length >= 2 ? 0.35 : 0, shadowRadius: 12, elevation: 6,
                            }}
                        >
                            <Text style={{ fontSize: 17, fontWeight: '900', color: '#fff' }}>🏁  Launch the Race</Text>
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                                <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>{members.length} riders</Text>
                            </View>
                        </TouchableOpacity>
                    </ScrollView>
                ) : (
                    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}>
                        <HorseRaceGame members={members} winnerIdx={winnerIdx} seed={seed} onDone={handleGameDone} />
                    </ScrollView>
                )}

                {/* Game info modal */}
                {infoGame && (
                    <Modal visible={!!infoGame} animationType="fade" transparent>
                        <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.7)', justifyContent: 'center', padding: 24 }}>
                            <View style={{ backgroundColor: C.card, borderRadius: 24, padding: 24, gap: 16 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: C.muted, alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={{ fontSize: 28 }}>{infoGame.icon}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 18, fontWeight: '900', color: C.text }}>{infoGame.name}</Text>
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: C.sub, marginTop: 2 }}>~{Math.round(infoGame.duration / 1000)}s · Fully fair</Text>
                                    </View>
                                </View>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: C.text, lineHeight: 22 }}>{infoGame.description}</Text>
                                <TouchableOpacity onPress={() => setInfoGame(null)}
                                    style={{ backgroundColor: C.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 15, fontWeight: '900', color: '#fff' }}>Got it</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>
                )}
                {showHistory && <GamePickerModal visible={showHistory} onClose={() => setShowHistory(false)} />}
            </SafeAreaView>
        </Modal>
    );
}

// ─── Stylesheets ──────────────────────────────────────────────────────────────
const gs = StyleSheet.create({
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: C.border,
        backgroundColor: C.card, gap: 12,
    },
    headerTitle: { fontSize: 16, fontWeight: '900', color: C.text },
    headerSub: { fontSize: 11, fontWeight: '600', color: C.sub, marginTop: 1 },
    closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.muted, alignItems: 'center', justifyContent: 'center' },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.muted, alignItems: 'center', justifyContent: 'center' },
    poolCard: {
        backgroundColor: C.card, borderRadius: 18, padding: 16,
        borderWidth: 1, borderColor: C.border,
    },
    poolTitle: { fontSize: 14, fontWeight: '900', color: C.text },
    poolSub: { fontSize: 11, fontWeight: '600', color: C.sub, marginTop: 2 },
    poolChip: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: C.muted, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
        borderWidth: 1.5, borderColor: C.border,
    },
    poolChipName: { fontSize: 13, fontWeight: '800', color: C.sub },
    sectionLabel: {
        fontSize: 11, fontWeight: '800', color: C.sub,
        textTransform: 'uppercase', letterSpacing: 1,
    },
    infoBtn: {
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: C.muted, borderWidth: 1, borderColor: C.border,
        alignItems: 'center', justifyContent: 'center',
    },
    infoBtnText: { fontSize: 12, fontWeight: '900', color: C.sub },
    gameOption: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: C.card, borderRadius: 20, padding: 16,
        borderWidth: 1, borderColor: C.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    },
    gameOptionIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    gameOptionName: { fontSize: 16, fontWeight: '900', color: C.text },
    gameOptionTagline: { fontSize: 12, fontWeight: '600', color: C.sub, marginTop: 2 },
    pill: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        backgroundColor: C.muted, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    },
    pillText: { fontSize: 10, fontWeight: '700', color: C.sub },
    gameArea: { flex: 1, paddingTop: 16 },
    gameSubtitle: { fontSize: 13, fontWeight: '700', color: C.sub, textAlign: 'center', paddingHorizontal: 24 },
    launchBtn: {
        backgroundColor: C.accent, marginHorizontal: 24, borderRadius: 16,
        paddingVertical: 16, alignItems: 'center', marginTop: 20,
        shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    launchBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },
    statusPill: {
        flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center',
        marginHorizontal: 48, marginTop: 16, paddingVertical: 12, paddingHorizontal: 20,
        backgroundColor: C.muted, borderRadius: 20, borderWidth: 1, borderColor: C.border,
    },
    statusText: { fontSize: 14, fontWeight: '800', color: C.sub },
});

const gps = StyleSheet.create({
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card,
    },
    title: { fontSize: 20, fontWeight: '900', color: C.text },
    sub: { fontSize: 12, fontWeight: '600', color: C.sub, marginTop: 2 },
    closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.muted, alignItems: 'center', justifyContent: 'center' },
    sectionLabel: {
        fontSize: 11, fontWeight: '800', color: C.sub,
        textTransform: 'uppercase', letterSpacing: 1,
    },
    gameCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: C.card, borderRadius: 16, padding: 14,
        borderWidth: 1, borderColor: C.border,
    },
    gameName: { fontSize: 15, fontWeight: '900', color: C.text },
    gameTagline: { fontSize: 12, fontWeight: '600', color: C.sub, marginTop: 2 },
    logRow: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 12,
        backgroundColor: C.card, borderRadius: 14, padding: 12,
        borderWidth: 1, borderColor: C.border,
    },
    logIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    logChore: { fontSize: 13, fontWeight: '800', color: C.text },
    logMeta: { fontSize: 11, fontWeight: '600', color: C.sub },
    logDot: { fontSize: 11, color: '#CBD5E1' },
});
