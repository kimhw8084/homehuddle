import '../global.css';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../store/authStore';
import { useOnboardingStore } from '../store/onboardingStore';
import { supabase } from '../lib/supabase';
import { getAuthRedirect } from '../utils/auth-route';

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
    const redirect = getAuthRedirect({
      isInitialized,
      isAuthorized: Boolean(session || isDevBypass),
      onboardingDone,
      segments,
    });

    if (redirect) router.replace(redirect);
  }, [session, isDevBypass, isInitialized, onboardingDone, segments, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="onboarding" />
      </Stack>
    </GestureHandlerRootView>
  );
}
