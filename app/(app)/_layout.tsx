import React from 'react';
import { Stack } from 'expo-router';
import { DevToolsOverlay } from '../../components/DevToolsOverlay';

export default function AppStackLayout() {
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
