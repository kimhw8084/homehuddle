import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack } from 'expo-router';
import { DevToolsOverlay } from '../../components/DevToolsOverlay';
import { useHouseholdBootstrap } from '../../hooks/use-household-bootstrap';
import { useAuthStore } from '../../store/authStore';

function HouseholdLoadingGate({ status, retry }: { status: 'idle' | 'loading' | 'error' | 'missing'; retry: () => void }) {
  const isError = status === 'error';
  return (
    <View style={styles.gate}>
      {isError ? (
        <>
          <Text style={styles.title}>Unable to load your household</Text>
          <Text style={styles.copy}>Check your connection, then try again.</Text>
          <TouchableOpacity onPress={retry} style={styles.retry}><Text style={styles.retryText}>Try again</Text></TouchableOpacity>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.title}>Loading your household</Text>
        </>
      )}
    </View>
  );
}

export default function AppStackLayout() {
  const user = useAuthStore((state) => state.user);
  const { status, retry, syncWarning } = useHouseholdBootstrap();

  if (user && status !== 'ready') {
    return <HouseholdLoadingGate status={status} retry={retry} />;
  }

  return (
    <>
      {syncWarning && <TouchableOpacity accessibilityRole="button" onPress={retry} style={{ padding: 12, backgroundColor: '#FEF3C7' }}><Text accessibilityLiveRegion="polite" style={{ color: '#92400E', textAlign: 'center' }}>Updates may be delayed. Tap to reconnect.</Text></TouchableOpacity>}
      <Stack key={user?.id ?? 'demo'} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="settings" />
      </Stack>
      {__DEV__ && !user && <DevToolsOverlay />}
    </>
  );
}

const styles = StyleSheet.create({
  gate: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#F8FAFC', gap: 12 },
  title: { fontSize: 17, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  copy: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  retry: { marginTop: 8, backgroundColor: '#4F46E5', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  retryText: { color: '#FFFFFF', fontWeight: '800' },
});
