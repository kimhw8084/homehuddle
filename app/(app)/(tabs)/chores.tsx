import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../../../store/authStore';

export default function Route() {
  const demo = useAuthStore(state => state.isDevBypass && !state.user);
  if (__DEV__ && demo) {
    // Prototype-only flows never mount in a release build or real account.
    const DemoScreen = require('../../../features/demo/screens/ChoresView').default;
    return <DemoScreen />;
  }
  return <Redirect href={{ pathname: '/(app)/(tabs)/family', params: { section: 'chores' } }} />;
}
