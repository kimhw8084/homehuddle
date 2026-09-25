import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  useColorScheme,
  Dimensions,
  StyleSheet,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Modal,
  Switch,
  Platform,
  TextInput,
  Appearance,
  ColorSchemeName,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { Home, ShieldAlert, CheckCircle2, ChevronRight, X, Mail, ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  runOnJS,
  FadeIn,
  FadeOut,
  cancelAnimation,
} from 'react-native-reanimated';
import { Gyroscope } from 'expo-sensors';
import { BlurView } from 'expo-blur';
import * as WebBrowser from 'expo-web-browser';
import NetInfo from '@react-native-community/netinfo';

const { width, height } = Dimensions.get('window');

const TYPER_STRINGS = [
  "Stop nagging.",
  "Build financial literacy.",
  "Create home harmony."
];

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 90,
  mass: 1
};

// --- HAR-292: Ambient Particle/Orb Background ---
const NUM_ORBS = 8;
type OrbConfig = { x: number; y: number; size: number; opacity: number; color: string; speed: number };

const AmbientOrbs = ({ isDark }: { isDark: boolean }) => {
  const LIGHT_COLORS = ['#C7D2FE', '#DDD6FE', '#FBCFE8', '#BAE6FD', '#A7F3D0'];
  const DARK_COLORS  = ['#1E1B4B', '#2E1065', '#0F172A', '#172554', '#064E3B'];
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const orbs = useMemo<OrbConfig[]>(() => Array.from({ length: NUM_ORBS }, (_, i) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: 80 + Math.random() * 160,
    opacity: isDark ? 0.18 + Math.random() * 0.18 : 0.25 + Math.random() * 0.3,
    color: colors[i % colors.length],
    speed: 4000 + Math.random() * 6000,
  })), [isDark]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {orbs.map((orb, i) => (
        <OrbDot key={i} orb={orb} index={i} />
      ))}
    </View>
  );
};

const OrbDot = ({ orb, index }: { orb: OrbConfig; index: number }) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacityAnim = useSharedValue(orb.opacity);

  useEffect(() => {
    const driftX = () => {
      translateX.value = withRepeat(
        withSequence(
          withTiming(30 + index * 8, { duration: orb.speed, easing: Easing.inOut(Easing.sin) }),
          withTiming(-30 - index * 5, { duration: orb.speed * 1.3, easing: Easing.inOut(Easing.sin) }),
        ), -1, true
      );
    };
    const driftY = () => {
      translateY.value = withDelay(index * 400, withRepeat(
        withSequence(
          withTiming(-25, { duration: orb.speed * 0.9, easing: Easing.inOut(Easing.sin) }),
          withTiming(25, { duration: orb.speed * 1.1, easing: Easing.inOut(Easing.sin) }),
        ), -1, true
      ));
    };
    const pulse = () => {
      opacityAnim.value = withRepeat(
        withSequence(
          withTiming(orb.opacity * 0.5, { duration: orb.speed * 0.7 }),
          withTiming(orb.opacity, { duration: orb.speed * 0.7 }),
        ), -1, true
      );
    };
    driftX(); driftY(); pulse();
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: orb.x - orb.size / 2,
    top: orb.y - orb.size / 2,
    width: orb.size,
    height: orb.size,
    borderRadius: orb.size / 2,
    backgroundColor: orb.color,
    opacity: opacityAnim.value,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    // Simulate blur via nested opacity layers (blur not supported in RN without native)
  }));

  return <Animated.View style={style} />;
};

// --- HAR-293: Enhanced Logo with spring pop, glow pulse, shimmer ---
const Logo3D = ({ onPress, colorScheme }: { onPress: () => void, colorScheme: ColorSchemeName }) => {
  const isDark = colorScheme === 'dark';
  const scale = useSharedValue(0);
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const shimmerX = useSharedValue(-100);

  useEffect(() => {
    // Spring pop entrance
    scale.value = withSpring(1, { damping: 8, stiffness: 120, mass: 0.8 });
    // Glow pulse after entrance
    glowOpacity.value = withDelay(600, withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.2, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ), -1, true
    ));
    // Shimmer sweep after a pause
    shimmerX.value = withDelay(1200, withRepeat(
      withTiming(140, { duration: 1400, easing: Easing.linear }), -1, false
    ));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
    ]
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  return (
    <TouchableWithoutFeedback onPress={onPress} testID="logo-trigger">
      <Animated.View style={[styles.logoContainer, animatedStyle, {
        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
        borderColor: isDark ? '#334155' : '#E2E8F0',
        shadowColor: isDark ? '#6366F1' : '#4F46E5',
        overflow: 'hidden',
      }]}>
        {/* Glow ring */}
        <Animated.View style={[{
          position: 'absolute', top: -8, left: -8, right: -8, bottom: -8,
          borderRadius: 40, borderWidth: 3,
          borderColor: isDark ? '#6366F1' : '#4F46E5',
        }, glowStyle]} />
        <View style={[styles.logoInner, { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF' }]}>
          <Home size={48} color={isDark ? '#6366F1' : '#4F46E5'} strokeWidth={2.5} />
        </View>
        {/* Shimmer overlay */}
        <Animated.View style={[{
          position: 'absolute', top: 0, bottom: 0, width: 40,
          backgroundColor: 'rgba(255,255,255,0.25)',
          transform: [{ skewX: '-20deg' }],
        }, shimmerStyle]} />
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

// --- HAR-294: Staggered word entrance ---
const StaggerWord = ({ word, delay, style }: { word: string; delay: number; style?: any }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 380, easing: Easing.out(Easing.quad) }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 14, stiffness: 160 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.Text style={[animStyle, style]}>{word} </Animated.Text>
  );
};

const StaggeredHeadline = ({ text, style, baseDelay = 0 }: { text: string; style?: any; baseDelay?: number }) => {
  const words = text.split(' ');
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
      {words.map((w, i) => (
        <StaggerWord key={i} word={w} delay={baseDelay + i * 80} style={style} />
      ))}
    </View>
  );
};

// --- Dynamic Typer Component ---
const DynamicTyper = () => {
  const [text, setText] = useState('');
  const [index, setIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentString = TYPER_STRINGS[index];
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (text.length < currentString.length) {
          setText(currentString.substring(0, text.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        if (text.length > 0) {
          setText(text.substring(0, text.length - 1));
        } else {
          setIsDeleting(false);
          setIndex((prev) => (prev + 1) % TYPER_STRINGS.length);
        }
      }
    }, isDeleting ? 50 : 100);

    return () => clearTimeout(timeout);
  }, [text, isDeleting, index]);

  return (
    <View className="h-8 items-center justify-center">
      <Text className="text-xl font-semibold text-slate-500 dark:text-zinc-400 tracking-tight text-center">
        {text}<Text className="text-indigo-500">|</Text>
      </Text>
    </View>
  );
};

// --- Main Auth Root View ---
export default function AuthRootView() {
  const router = useRouter();
  const systemColorScheme = useColorScheme();
  const { setDevBypass } = useAuthStore();
  
  // State
  const [themeOverride, setThemeOverride] = useState<ColorSchemeName>(null);
  const activeColorScheme = themeOverride || systemColorScheme;
  const isDark = activeColorScheme === 'dark';

  const [logoTaps, setLogoTaps] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [isInvited, setIsInvited] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [devModalVisible, setDevModalVisible] = useState(false);
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [email, setEmail] = useState('');

  // Reanimated Shared Values
  const bgX = useSharedValue(0);
  const bgY = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const sheetY = useSharedValue(height * 0.4);
  const tickerOpacity = useSharedValue(0);

  // Gyroscope Parallax
  useEffect(() => {
    let subscription: any;
    Gyroscope.isAvailableAsync().then((available) => {
      if (available) {
        Gyroscope.setUpdateInterval(50);
        subscription = Gyroscope.addListener(({ x, y }) => {
          bgX.value = withTiming(y * 20, { duration: 100 });
          bgY.value = withTiming(x * 20, { duration: 100 });
        });
      }
    });
    return () => subscription?.remove();
  }, []);

  // Entrance Sequence
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    contentOpacity.value = withDelay(400, withTiming(1, { duration: 800 }));
    sheetY.value = withDelay(600, withSpring(0, SPRING_CONFIG));
    tickerOpacity.value = withDelay(1200, withRepeat(withSequence(withTiming(1, { duration: 1000 }), withDelay(3000, withTiming(0, { duration: 1000 }))), -1, true));

    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  const handleLogoTap = () => {
    const newTaps = logoTaps + 1;
    setLogoTaps(newTaps);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (newTaps === 2) {
      setDevModalVisible(true);
      setLogoTaps(0);
    }
    setTimeout(() => setLogoTaps(0), 2000);
  };

  const handleLogin = async (type: 'apple' | 'google' | 'email') => {
    if (isOffline) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setLoading(type);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Simulate network delay
    setTimeout(() => {
      setLoading(null);
      if (type === 'email') {
        Alert.alert("Magic Link Sent", `Check ${email} to continue.`);
        setIsEmailMode(false);
        setEmail('');
      } else {
        Alert.alert(`${type === 'apple' ? 'Apple' : 'Google'} SSO`, "Requires physical device entitlement configuration.");
      }
    }, 1500);
  };

  const openLegal = (url: string) => {
    WebBrowser.openBrowserAsync(url);
  };

  const bgAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: bgX.value }, { translateY: bgY.value }],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: interpolate(contentOpacity.value, [0, 1], [20, 0]) }]
  }));

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }]
  }));

  const tickerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: tickerOpacity.value,
  }));

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    setThemeOverride(next);
    Appearance.setColorScheme(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const teleport = (path: string) => {
    setDevModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (path === '/(app)') setDevBypass(true);
    router.replace(path as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      {/* Background Mesh Gradient */}
      <Animated.View style={[styles.backgroundLayer, bgAnimatedStyle]}>
        <LinearGradient
          colors={isDark ? ['#0F172A', '#1E1B4B', '#1E293B'] : ['#FFFFFF', '#EEF2FF', '#E0E7FF']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.gradientOverlay}>
          <LinearGradient
            colors={isDark ? ['transparent', 'rgba(99, 102, 241, 0.1)'] : ['transparent', 'rgba(79, 70, 229, 0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </Animated.View>

      {/* HAR-292: Ambient orbs */}
      <AmbientOrbs isDark={isDark} />

      {/* Offline Toast */}
      {isOffline && (
        <Animated.View className="absolute top-14 left-6 right-6 z-50 bg-red-500 p-4 rounded-2xl flex-row items-center shadow-lg">
          <ShieldAlert color="#fff" size={20} />
          <Text className="text-white font-bold ml-3 flex-1">Offline Mode. Check your connection.</Text>
        </Animated.View>
      )}

      {/* Main Content */}
      <SafeAreaView className="flex-1">
        <Animated.View style={[contentAnimatedStyle, styles.headerContainer]}>
          <Logo3D onPress={handleLogoTap} colorScheme={activeColorScheme} />
          {/* HAR-294: Staggered headline */}
          <View style={{ marginTop: 32, marginBottom: 4, alignItems: 'center' }}>
            <StaggeredHeadline
              text="HomeHuddle"
              baseDelay={200}
              style={{ fontSize: 48, fontWeight: '900', color: isDark ? '#fff' : '#0f172a', letterSpacing: -1.5 }}
            />
          </View>
          <View style={{ alignItems: 'center', marginBottom: 16, paddingHorizontal: 24 }}>
            <StaggeredHeadline
              text={isInvited ? "You've been invited!" : "Run the house."}
              baseDelay={500}
              style={{ fontSize: 20, fontWeight: '700', color: isDark ? '#818CF8' : '#4F46E5' }}
            />
          </View>
          <DynamicTyper />
        </Animated.View>
      </SafeAreaView>

      {/* Bottom Sheet */}
      <Animated.View style={[sheetAnimatedStyle, styles.bottomSheetContainer]}>
        <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint={isDark ? "dark" : "light"} style={styles.blurContainer}>
          <View className="px-8 pt-6 pb-12 w-full items-center">
            
            {/* Social Proof Ticker */}
            {!isEmailMode && (
              <View>
                <Animated.View entering={FadeIn} exiting={FadeOut} style={[tickerAnimatedStyle, styles.tickerContainer]}>
                  <CheckCircle2 color="#10B981" size={14} />
                  <Text className="text-emerald-600 dark:text-emerald-400 font-bold text-xs ml-2 uppercase tracking-widest">
                    14,203 chores completed today
                  </Text>
                </Animated.View>
              </View>
            )}

            {/* Content Switcher: Social vs Email */}
            {!isEmailMode ? (
              <View className="w-full mt-2">
                <Animated.View entering={FadeIn} exiting={FadeOut} className="space-y-4 gap-4">
                  <TouchableOpacity
                    onPress={() => handleLogin('apple')}
                    disabled={!!loading || isOffline}
                    activeOpacity={0.7}
                    style={[styles.ssoButton, { backgroundColor: isDark ? '#FFFFFF' : '#000000', transform: [{ scale: loading === 'apple' ? 0.98 : 1 }] }]}
                  >
                    {loading === 'apple' ? <ActivityIndicator color={isDark ? '#000' : '#fff'} /> : (
                      <Text style={[styles.ssoText, { color: isDark ? '#000' : '#fff' }]}> Continue with Apple</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleLogin('google')}
                    disabled={!!loading || isOffline}
                    activeOpacity={0.7}
                    style={[styles.ssoButton, styles.googleButton, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', transform: [{ scale: loading === 'google' ? 0.98 : 1 }] }]}
                  >
                    {loading === 'google' ? <ActivityIndicator color={isDark ? '#fff' : '#000'} /> : (
                      <Text style={[styles.ssoText, { color: isDark ? '#fff' : '#000' }]}>Continue with Google</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setIsEmailMode(true);
                    }}
                    className="mt-2 py-2 items-center"
                  >
                    <Text className="text-slate-500 dark:text-zinc-400 font-bold text-sm">Continue with Email</Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            ) : (
              <View className="w-full mt-2">
                <Animated.View entering={FadeIn} exiting={FadeOut}>
                  <View className="bg-slate-100 dark:bg-zinc-800 rounded-2xl flex-row items-center px-4 py-4 mb-4 border border-slate-200 dark:border-zinc-700">
                    <Mail size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                    <TextInput
                      placeholder="Enter your email"
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      className="flex-1 ml-3 text-slate-900 dark:text-white font-semibold text-base"
                    />
                  </View>

                  <TouchableOpacity
                    onPress={() => handleLogin('email')}
                    disabled={!email || !!loading || isOffline}
                    activeOpacity={0.7}
                    style={[styles.ssoButton, { backgroundColor: '#4F46E5', transform: [{ scale: loading === 'email' ? 0.98 : 1 }] }]}
                  >
                    {loading === 'email' ? <ActivityIndicator color="#fff" /> : (
                      <Text style={[styles.ssoText, { color: '#fff' }]}>Send Magic Link</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setIsEmailMode(false);
                    }}
                    className="mt-6 flex-row items-center justify-center"
                  >
                    <ArrowLeft size={14} color="#6366F1" />
                    <Text className="text-indigo-500 font-bold text-sm ml-2">Back to Social Login</Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            )}

            {/* Legal */}
            <View className="mt-8 flex-row flex-wrap justify-center px-4">
              <Text className="text-slate-400 dark:text-zinc-500 text-xs">By continuing, you agree to our </Text>
              <TouchableOpacity onPress={() => openLegal('https://example.com/terms')}>
                <Text className="text-indigo-500 font-bold text-xs">Terms</Text>
              </TouchableOpacity>
              <Text className="text-slate-400 dark:text-zinc-500 text-xs"> & </Text>
              <TouchableOpacity onPress={() => openLegal('https://example.com/privacy')}>
                <Text className="text-indigo-500 font-bold text-xs">Privacy</Text>
              </TouchableOpacity>
            </View>
            <Text className="text-slate-400 dark:text-zinc-500 text-[10px] mt-2">Harulo Studio LLC</Text>
          </View>
        </BlurView>
      </Animated.View>

      {/* Developer Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={devModalVisible}
        onRequestClose={() => setDevModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-slate-900 dark:text-white">Developer Control</Text>
              <TouchableOpacity onPress={() => setDevModalVisible(false)}>
                <X color={isDark ? '#fff' : '#000'} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView className="space-y-8" contentContainerStyle={{ gap: 32 }}>
              {/* QA Tools */}
              <View className="space-y-4 gap-4">
                <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest">QA Tools</Text>
                
                <View className="flex-row justify-between items-center bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl">
                  <View>
                    <Text className="text-base font-semibold text-slate-900 dark:text-white">Offline Mode</Text>
                    <Text className="text-xs text-slate-500">Force offline UI state</Text>
                  </View>
                  <Switch value={isOffline} onValueChange={setIsOffline} />
                </View>

                <View className="flex-row justify-between items-center bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl">
                  <View>
                    <Text className="text-base font-semibold text-slate-900 dark:text-white">Simulate Invite</Text>
                    <Text className="text-xs text-slate-500">Test referral header state</Text>
                  </View>
                  <Switch value={isInvited} onValueChange={setIsInvited} />
                </View>

                <TouchableOpacity 
                  onPress={toggleTheme}
                  className="flex-row justify-between items-center bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl"
                >
                  <View>
                    <Text className="text-base font-semibold text-slate-900 dark:text-white">Theme Override</Text>
                    <Text className="text-xs text-slate-500">Currently: {isDark ? 'Dark' : 'Light'}</Text>
                  </View>
                  <View className="bg-indigo-600 px-4 py-2 rounded-full">
                    <Text className="text-white font-bold text-xs">TOGGLE</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Quick Router */}
              <View className="space-y-4 gap-4">
                <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest">Teleport to View</Text>
                <View className="flex-row flex-wrap gap-3">
                  <TouchableOpacity onPress={() => teleport('/')} className="bg-slate-100 dark:bg-zinc-800 px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 min-w-[45%] items-center">
                    <Text className="text-slate-900 dark:text-white font-bold">Auth Root (/)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => teleport('/(app)')} className="bg-slate-100 dark:bg-zinc-800 px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 min-w-[45%] items-center">
                    <Text className="text-slate-900 dark:text-white font-bold">Mission Control</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => teleport('/demo')} className="bg-slate-100 dark:bg-zinc-800 px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 min-w-[45%] items-center">
                    <Text className="text-slate-900 dark:text-white font-bold">Sandbox Demo</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity 
                onPress={() => teleport('/(app)')}
                className="bg-indigo-600 p-5 rounded-[24px] items-center shadow-lg"
              >
                <Text className="text-white font-bold text-lg">Instant Bypass Login</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    width: width + 100,
    height: height + 100,
    left: -50,
    top: -50,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  headerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: height * 0.35,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 35,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  logoInner: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '42%',
  },
  blurContainer: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  tickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ssoButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  googleButton: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  ssoText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    padding: 32,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: 50,
  },
});
