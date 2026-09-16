import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useHuddleStore } from '../../store/huddleStore';
import { Action, Panel, planningStyles as s } from '../../components/ui/PlanningUI';
import { MealPlanner } from '../meals/MealPlanner';

export default function HouseholdPlanner() {
  const router = useRouter();
  const members = useHuddleStore(state => state.familyMembers);
  return <SafeAreaView style={s.page}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <Text accessibilityRole="header" style={s.title}>Household</Text>
    <Text style={s.muted}>Fewer messages about what’s for dinner. One plan everyone can see.</Text>
    <Panel><Text style={s.heading}>Your people</Text>{members.map(member => <View key={member.id} style={s.row}><Text style={s.text}>{member.avatar} {member.name}</Text><Text style={s.muted}>{member.householdRole}</Text></View>)}
      <Action label="Manage household" secondary onPress={() => router.push('/(app)/settings/household')} />
    </Panel>
    <MealPlanner />
  </ScrollView></SafeAreaView>;
}
