import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Stack } from 'expo-router';
import { DevToolsOverlay } from '../../components/DevToolsOverlay';
import { useHouseholdBootstrap } from '../../hooks/use-household-bootstrap';
import { useAuthStore } from '../../store/authStore';
import { useHouseholdContext } from '../../hooks/use-household-context';
import { Action, usePlanningTheme } from '../../components/ui/PlanningUI';

function HouseholdLoadingGate({ status, retry }: { status: 'idle' | 'loading' | 'error' | 'missing'; retry: () => void }) {
  const { styles: s, colors } = usePlanningTheme();
  const isError = status === 'error';
  return (
    <View style={[s.page, { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }]}>
      {isError ? (
        <>
          <Text accessibilityRole="header" style={s.heading}>Unable to load your household</Text>
          <Text style={s.muted}>Check your connection, then try again.</Text>
          <Action label="Try again" onPress={retry} />
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.heading}>Loading your household</Text>
        </>
      )}
    </View>
  );
}

export default function AppStackLayout() {
  const context = useHouseholdContext();
  const user = useAuthStore((state) => state.user);
  const { status, retry, syncWarning } = useHouseholdBootstrap();

  if (user && status !== 'ready') {
    return <HouseholdLoadingGate status={status} retry={retry} />;
  }

  return (
    <>
      {syncWarning && <TouchableOpacity accessibilityRole="button" onPress={retry} style={{ padding: 12, backgroundColor: '#FEF3C7' }}><Text accessibilityLiveRegion="polite" style={{ color: '#92400E', textAlign: 'center' }}>Updates may be delayed. Tap to reconnect.</Text></TouchableOpacity>}
      <Stack key={user ? `${context.key}:${context.revision}` : 'demo'} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="settings" />
      </Stack>
      {__DEV__ && !user && <DevToolsOverlay />}
    </>
  );
}
