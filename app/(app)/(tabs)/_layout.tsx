import React from 'react';
import { Tabs } from 'expo-router';
import { Home, ListTodo, Wallet, Store } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { View, StyleSheet, Platform } from 'react-native';

export default function AppLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: '#6366F1',
      tabBarInactiveTintColor: '#8E8E93',
      tabBarBackground: () => (
        Platform.OS === 'ios' ? (
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.9)' }]} />
        )
      ),
      tabBarStyle: {
        position: 'absolute',
        borderTopWidth: 0,
        elevation: 0,
        shadowOpacity: 0.1,
        shadowRadius: 10,
        height: 85,
        paddingBottom: 25,
        paddingTop: 10,
        backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(255, 255, 255, 0.95)',
      },
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '600',
      }
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={26} color={color} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="chores"
        options={{
          title: 'Chores',
          tabBarIcon: ({ color }) => <ListTodo size={26} color={color} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color }) => <Wallet size={26} color={color} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: 'Market',
          tabBarIcon: ({ color }) => <Store size={26} color={color} strokeWidth={2.5} />,
        }}
      />
    </Tabs>
  );
}
