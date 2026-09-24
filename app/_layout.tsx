import '../global.css';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, AppState, Platform, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../store/authStore';
import { useOnboardingStore } from '../store/onboardingStore';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import * as Linking from 'expo-linking';
import { consumeAuthRedirect, readableAuthError } from '../lib/auth';
import { AppErrorBoundary } from '../components/AppErrorBoundary';
import { householdApi } from '../lib/household';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { usePlanningTheme } from '../components/ui/PlanningUI';

export default function RootLayout() {
  const { colors, scheme } = usePlanningTheme();
  const { session, setSession, setInitialized, isInitialized, isDevBypass } = useAuthStore();
  const { hasCompleted: onboardingDone, hasHydrated: onboardingHydrated, pendingInvite } = useOnboardingStore();
  // Fresh CI checkouts have no generated Expo route tuples yet.
  const segments: readonly string[] = useSegments();
  const router = useRouter();
  const [sessionError, setSessionError] = useState(false);
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const [membershipReadyFor, setMembershipReadyFor] = useState<string | null>(null);
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId || !onboardingHydrated || !isSupabaseConfigured) return;
    let active = true;
    householdApi.getMyHouseholdId(userId).then(id => {
      if (!active) return;
      useOnboardingStore.getState().setCompleted(Boolean(id));
      setMembershipReadyFor(userId);
    }).catch(() => { if (active) setSessionError(true); });
    return () => { active = false; };
  }, [userId, onboardingHydrated, sessionAttempt]);

  // 1. Initial Session Check & Listener
  useEffect(() => {
    if (!isSupabaseConfigured || !onboardingHydrated) return;
    let active = true;
    let receivedAuthEvent = false;
    setSessionError(false);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        receivedAuthEvent = true;
        setSession(session);
        setInitialized(true);
      }
    );

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!active || receivedAuthEvent) return;
      if (error) throw error;
      setSession(session);
      setInitialized(true);
    }).catch(() => {
      if (active) setSessionError(true);
    });

    const updateRefresh = (state: string) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    };
    if (Platform.OS !== 'web') updateRefresh(AppState.currentState);
    const appState = Platform.OS !== 'web' ? AppState.addEventListener('change', updateRefresh) : null;

    return () => {
      active = false;
      subscription.unsubscribe();
      appState?.remove();
      if (Platform.OS !== 'web') supabase.auth.stopAutoRefresh();
    };
  }, [onboardingHydrated, sessionAttempt, setInitialized, setSession]);

  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      if (!isSupabaseConfigured) return;
      consumeAuthRedirect(url).catch((error) => Alert.alert('Unable to sign in', readableAuthError(error)));
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    }).catch(() => { /* Manual sign-in remains available if there is no initial URL. */ });
    const subscription = Linking.addEventListener('url', handleUrl);
    return () => subscription.remove();
  }, []);

  // 2. Navigation Guard
  useEffect(() => {
    if (!isInitialized || !onboardingHydrated || (userId && membershipReadyFor !== userId)) return;

    const inAppGroup = segments[0] === '(app)';
    const inOnboarding = segments[0] === 'onboarding';
    const isAuthed = session || isDevBypass;

    if (!isAuthed && inAppGroup) {
      router.replace('/');
      return;
    }

    if (isAuthed) {
      if (!onboardingDone && pendingInvite && segments[1] !== 'accept-invite') {
        router.replace('/onboarding/accept-invite');
        return;
      }
      if (!onboardingDone && !inOnboarding) {
        // First launch: send to onboarding
        router.replace(pendingInvite ? '/onboarding/accept-invite' : '/onboarding');
        return;
      }
      if (onboardingDone && (inOnboarding || !inAppGroup)) {
        router.replace('/(app)/(tabs)');
      }
    }
  }, [session, isDevBypass, isInitialized, onboardingDone, onboardingHydrated, segments, router, userId, membershipReadyFor, pendingInvite]);

  if (!isSupabaseConfigured || sessionError) {
    return <View style={{ flex: 1, justifyContent: 'center', padding: 32, gap: 16, backgroundColor: colors.background }}>
      <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{sessionError ? 'Unable to restore your session' : 'HomeHuddle is not configured'}</Text>
      <Text style={{ color: colors.subtext }}>{sessionError ? 'Please try again. Your household data has not been changed.' : 'Set the Supabase URL and public client key, then rebuild the app. Never use a server secret in the app.'}</Text>
      {sessionError && <TouchableOpacity accessibilityRole="button" onPress={() => setSessionAttempt(value => value + 1)} style={{ padding: 16, backgroundColor: '#4F46E5', borderRadius: 12 }}><Text style={{ color: 'white' }}>Try again</Text></TouchableOpacity>}
    </View>;
  }

  if (userId && membershipReadyFor !== userId) {
    return <View style={{ flex: 1, justifyContent: 'center', padding: 32, backgroundColor: colors.background }}><Text style={{ color: colors.text }} accessibilityLiveRegion="polite">Connecting to your household…</Text></View>;
  }

  return (
    <AppErrorBoundary>
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(app)" />
          <Stack.Screen name="onboarding" />
        </Stack>
      </GestureHandlerRootView>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}
