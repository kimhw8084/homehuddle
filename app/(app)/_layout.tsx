import React from 'react';
import { Stack } from 'expo-router';
import { DevToolsOverlay } from '../../components/DevToolsOverlay';
import { useAuthStore } from '../../store/authStore';

export default function AppStackLayout() {
  const { session, isInitialized, isDevBypass } = useAuthStore();

  if (!isInitialized || (!session && !isDevBypass)) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="settings" />
      </Stack>
      {__DEV__ && <DevToolsOverlay />}
    </>
  );
}
