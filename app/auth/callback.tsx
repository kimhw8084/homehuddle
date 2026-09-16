import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Action, planningStyles as s } from '../../components/ui/PlanningUI';

// RootLayout consumes the callback exactly once and performs membership routing.
export default function AuthCallback() {
  const router = useRouter();
  const [delayed, setDelayed] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setDelayed(true), 10000); return () => clearTimeout(timer); }, []);
  return <View style={[s.page, { padding: 32, justifyContent: 'center', gap: 20 }]}>
    <ActivityIndicator size="large" color="#4F46E5" /><Text accessibilityLiveRegion="polite" style={s.heading}>{delayed ? 'Sign-in is taking longer than expected' : 'Finishing sign-in…'}</Text>
    {delayed && <><Text style={s.muted}>The link may have expired or opened on a different device. You can sign in with a fresh email code.</Text><Action label="Back to sign in" onPress={() => router.replace('/')} /></>}
  </View>;
}
