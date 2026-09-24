import { Text, View } from 'react-native';

/** Remove only when the authored screen's commands are actually persisted. */
export function PrototypeNotice({ screen }: { screen: 'Home' | 'Chores' }) {
  return (
    <View style={{ marginHorizontal: 20, marginVertical: 8, padding: 12, borderRadius: 14, backgroundColor: '#EEF2FF', borderColor: '#C7D2FE', borderWidth: 1 }}>
      <Text style={{ color: '#3730A3', fontWeight: '700', fontSize: 12 }}>
        {screen === 'Chores' ? 'Chores · partial persistence' : 'Home · mixed live and preview data'}
      </Text>
      <Text style={{ color: '#4338CA', fontSize: 12, marginTop: 3 }}>
        {screen === 'Chores'
          ? 'Core chore actions save to your household. Recurrence, sections, ordering, and some advanced actions may not persist yet.'
          : 'Reviews use household commands. Automations, appliance controls, and some dashboard content are still preview-only.'}
      </Text>
    </View>
  );
}
