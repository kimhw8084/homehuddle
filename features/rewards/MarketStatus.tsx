import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export function MarketStatus({ busy, error }: { busy: boolean; error: string }) {
  if (!busy && !error) return null;
  return <View style={{ marginHorizontal: 24, marginVertical: 8, padding: 12, borderRadius: 14, backgroundColor: error ? '#FEF2F2' : '#EEF2FF', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    {busy && <ActivityIndicator color="#4F46E5" />}
    <Text accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite" style={{ color: error ? '#991B1B' : '#3730A3', flex: 1 }}>{error || 'Saving to your household…'}</Text>
  </View>;
}
