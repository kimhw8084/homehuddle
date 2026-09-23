import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Action, Panel, ScreenHeading, usePlanningStyles } from '../../components/ui/PlanningUI';
import { useHuddleStore } from '../../store/huddleStore';

export default function HouseholdHub() {
  const s = usePlanningStyles();
  const router = useRouter();
  const members = useHuddleStore(state => state.familyMembers);
  const current = useHuddleStore(state => state.currentMemberId);
  const adult = members.some(member => member.id === current && ['owner', 'parent'].includes(member.householdRole ?? ''));
  return <SafeAreaView edges={['top', 'left', 'right']} style={s.page}><ScrollView contentContainerStyle={s.content}>
    <ScreenHeading title="Household" eyebrow="Your people, together" subtitle="A shared home works better when everyone is included." />
    <Panel><Text accessibilityRole="header" style={s.heading}>Your people</Text>
      {members.map(member => <View key={member.id} style={s.row}><Text style={[s.text, { flex: 1 }]}>{member.avatar} {member.name}{member.id === current ? ' · You' : ''}</Text><Text style={s.muted}>{member.householdRole}</Text></View>)}
      {adult && <Action label="Manage household" secondary onPress={() => router.push('/(app)/settings/household')} />}
      {adult && <Action label="Invite someone" onPress={() => router.push('/(app)/settings/invite')} />}
    </Panel>
    <Panel><Text accessibilityRole="header" style={s.heading}>Make it yours</Text>
      {adult && <Action label="Your household plan" secondary onPress={() => router.push('/(app)/settings/subscription')} />}
      <Action label="Your profile and settings" secondary onPress={() => router.push('/(app)/profile')} />
      <Action label="Notification preferences" secondary onPress={() => router.push('/(app)/settings/notifications')} />
    </Panel>
    <Panel><Text accessibilityRole="header" style={s.heading}>Help and trust</Text>
      <Action label="Help with HomeHuddle" secondary onPress={() => router.push('/(app)/settings/help')} />
      <Action label="Privacy and your data" secondary onPress={() => router.push('/(app)/settings/privacy')} />
      <Text style={s.muted}>Household points are for participation. They are never money.</Text>
    </Panel>
  </ScrollView></SafeAreaView>;
}
