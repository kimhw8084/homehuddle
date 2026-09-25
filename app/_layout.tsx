import '../global.css';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../store/authStore';
import { useOnboardingStore } from '../store/onboardingStore';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const { session, setSession, setInitialized, isInitialized, isDevBypass } = useAuthStore();
  const { hasCompleted: onboardingDone } = useOnboardingStore();
  const segments = useSegments();
  const router = useRouter();

  // 1. Initial Session Check & Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. Navigation Guard
  useEffect(() => {
    if (!isInitialized) return;

    const inAppGroup = segments[0] === '(app)';
    const inOnboarding = segments[0] === 'onboarding';
    const isAuthed = session || isDevBypass;

    if (!isAuthed && inAppGroup) {
      router.replace('/');
      return;
    }

    if (isAuthed) {
      if (!onboardingDone && !inOnboarding) {
        // First launch: send to onboarding
        router.replace('/onboarding');
        return;
      }
      if (onboardingDone && inOnboarding) {
        router.replace('/(app)/(tabs)');
      }
    }
  }, [session, isDevBypass, isInitialized, onboardingDone, segments]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="onboarding" />
      </Stack>
    </GestureHandlerRootView>
  );
}
