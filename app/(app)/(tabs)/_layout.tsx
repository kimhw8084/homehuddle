import React from 'react';
import { Tabs } from 'expo-router';
import { Home, CalendarDays, Gift, ShoppingCart, Users } from 'lucide-react-native';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHuddleStore } from '../../../store/huddleStore';
import { usePlanningTheme } from '../../../components/ui/PlanningUI';

export default function AppLayout() {
  const pending = useHuddleStore(s => s.restockItems.filter(item => !item.isCompleted).length);
  const { colors } = usePlanningTheme();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  return <Tabs screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.subtext,
    tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, height: 62 + Math.max(insets.bottom, 12) + (fontScale > 1.3 ? 16 : 0), paddingTop: 8, paddingBottom: Math.max(insets.bottom, 12) },
    tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
    tabBarHideOnKeyboard: true,
  }}>
    <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: ({ color }) => <Home size={23} color={color} /> }} />
    <Tabs.Screen name="family" options={{ title: 'Plan', tabBarIcon: ({ color }) => <CalendarDays size={23} color={color} /> }} />
    <Tabs.Screen name="restock" options={{ title: 'Shop', tabBarBadge: pending ? pending > 99 ? '99+' : pending : undefined, tabBarIcon: ({ color }) => <ShoppingCart size={23} color={color} /> }} />
    <Tabs.Screen name="market" options={{ title: 'Rewards', tabBarIcon: ({ color }) => <Gift size={23} color={color} /> }} />
    <Tabs.Screen name="household" options={{ title: 'Household', tabBarIcon: ({ color }) => <Users size={23} color={color} /> }} />
    <Tabs.Screen name="chores" options={{ href: null }} />
    <Tabs.Screen name="wallet" options={{ href: null }} />
  </Tabs>;
}
