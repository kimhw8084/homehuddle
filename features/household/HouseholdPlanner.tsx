import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeading, usePlanningStyles } from '../../components/ui/PlanningUI';
import { MealPlanner } from '../meals/MealPlanner';

export default function HouseholdPlanner({ embedded = false }: { embedded?: boolean } = {}) {
  const s = usePlanningStyles();
  return <SafeAreaView edges={embedded ? ['left', 'right'] : ['top', 'left', 'right']} style={s.page}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    {!embedded && <ScreenHeading title="Dinner plans" subtitle="Fewer messages. One plan everyone can see." />}
    <MealPlanner />
  </ScrollView></SafeAreaView>;
}
