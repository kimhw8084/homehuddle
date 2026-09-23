import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Action, ScreenHeading, usePlanningStyles } from '../../components/ui/PlanningUI';
import HouseholdChores from '../chores/HouseholdChores';
import HouseholdPlanner from '../household/HouseholdPlanner';
import HouseholdRoutines from '../chores/HouseholdRoutines';

export default function PlanScreen() {
  const s = usePlanningStyles();
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const meals = section === 'meals';
  const routines = section === 'routines';
  return <SafeAreaView edges={['top', 'left', 'right']} style={s.page}>
    <View style={[s.content, { paddingBottom: 0 }]}>
      <ScreenHeading title="Plan" eyebrow="A lighter week" subtitle="Everyone knows what’s next—and what’s for dinner." />
      <View accessibilityRole="radiogroup" accessibilityLabel="Planning section" style={s.row}>
        <Action label="Chores" selected={!meals && !routines} secondary={meals || routines} onPress={() => router.setParams({ section: 'chores' })} />
        <Action label="Dinners" selected={meals} secondary={!meals} onPress={() => router.setParams({ section: 'meals' })} />
        <Action label="Routines" selected={routines} secondary={!routines} onPress={() => router.setParams({ section: 'routines' })} />
      </View>
    </View>
    {meals ? <HouseholdPlanner embedded /> : routines ? <HouseholdRoutines /> : <HouseholdChores embedded />}
  </SafeAreaView>;
}
