import React, { PropsWithChildren } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const planningStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingBottom: 120, gap: 16, width: '100%', maxWidth: 760, alignSelf: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  heading: { fontSize: 19, fontWeight: '700', color: '#0F172A' },
  text: { fontSize: 16, color: '#0F172A', lineHeight: 23 },
  muted: { fontSize: 14, color: '#475569', lineHeight: 21 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', padding: 18, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#94A3B8', backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#0F172A', fontSize: 16 },
  button: { minHeight: 46, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center' },
  secondary: { backgroundColor: '#E0E7FF' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  error: { color: '#9F1239', fontSize: 14, lineHeight: 21 },
});
export function Panel({ children }: PropsWithChildren) { return <View style={planningStyles.card}>{children}</View>; }
export function Editor({ children, onClose, busy }: PropsWithChildren<{ onClose: () => void; busy: boolean }>) {
  return <Modal visible animationType="slide" onRequestClose={() => { if (!busy) onClose(); }}>
    <SafeAreaView style={planningStyles.page} accessibilityViewIsModal>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={planningStyles.content}>{children}</ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
export function Action({ label, onPress, disabled = false, busy = false, secondary = false }: { label: string; onPress: () => void; disabled?: boolean; busy?: boolean; secondary?: boolean }) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress}
    style={[planningStyles.button, secondary && planningStyles.secondary, (disabled || busy) && { opacity: 0.5 }]}>
    {busy ? <ActivityIndicator color={secondary ? '#3730A3' : '#FFFFFF'} /> : <Text style={[planningStyles.buttonText, secondary && { color: '#3730A3' }]}>{label}</Text>}
  </TouchableOpacity>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={{ gap: 6 }}><Text style={planningStyles.muted}>{label}</Text><TextInput accessibilityLabel={label} {...props} style={[planningStyles.input, props.style]} /></View>;
}
