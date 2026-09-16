import React from 'react';
import { useAuthStore } from '../../../store/authStore';
import HouseholdChores from '../../../features/chores/HouseholdChores';

export default function Route() {
  const demo = useAuthStore(state => state.isDevBypass && !state.user);
  if (__DEV__ && demo) {
    // Prototype-only flows never mount in a release build or real account.
    const DemoScreen = require('../../../features/demo/screens/ChoresView').default;
    return <DemoScreen />;
  }
  return <HouseholdChores />;
}
