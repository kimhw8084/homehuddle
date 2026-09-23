import React, { PropsWithChildren, useEffect, useId, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, findNodeHandle, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { useAccessibilityPreferences } from '../../hooks/use-accessibility-preferences';

function createStyles(c: typeof Colors.light) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: c.bg },
    content: { padding: 20, paddingBottom: 32, gap: 20, width: '100%', maxWidth: 760, alignSelf: 'center' },
    title: { fontSize: 30, fontWeight: '800', color: c.text, letterSpacing: -0.6 },
    heading: { fontSize: 19, fontWeight: '700', color: c.text },
    text: { fontSize: 16, color: c.text, lineHeight: 24 },
    muted: { fontSize: 14, color: c.subtext, lineHeight: 21 },
    eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.4, color: c.primary, textTransform: 'uppercase' },
    card: { backgroundColor: c.card, borderRadius: 20, borderWidth: 1, borderColor: c.border, padding: 20, gap: 14 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
    input: { minHeight: 52, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: c.text, fontSize: 16 },
    button: { minHeight: 50, minWidth: 50, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, borderWidth: 2, borderColor: 'transparent', backgroundColor: c.primary, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
    secondary: { backgroundColor: c.primarySoft },
    buttonText: { color: c.onPrimary, fontSize: 15, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
    error: { color: c.dangerText, fontSize: 14, lineHeight: 21 },
    success: { color: c.successText, fontSize: 14, lineHeight: 21 },
  });
}
const styles = { light: createStyles(Colors.light), dark: createStyles(Colors.dark) };
export function usePlanningTheme() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { colors: Colors[scheme], scheme, styles: styles[scheme] };
}
export function usePlanningStyles() { return usePlanningTheme().styles; }

export function Panel({ children }: PropsWithChildren) {
  const s = usePlanningStyles();
  return <View style={s.card}>{children}</View>;
}

export function ScreenHeading({ title, subtitle, eyebrow }: { title: string; subtitle?: string; eyebrow?: string }) {
  const s = usePlanningStyles();
  return <View style={{ gap: 8 }}>
    {eyebrow && <Text style={s.eyebrow}>{eyebrow}</Text>}
    <Text accessibilityRole="header" style={s.title}>{title}</Text>
    {subtitle && <Text style={s.muted}>{subtitle}</Text>}
  </View>;
}

type EditorProps = PropsWithChildren<{ title: string; onClose: () => void; busy: boolean; dirty?: boolean; closeLabel?: string }>;
export function Editor({ children, title, onClose, busy, dirty = false, closeLabel = 'Cancel edit' }: EditorProps) {
  const s = usePlanningStyles();
  const { reduceMotion } = useAccessibilityPreferences();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const heading = useRef<View>(null);
  const titleId = useId();
  // RN Modal owns trapping and native return focus. Restore the web invoker
  // only if it still exists and remains visible, enabled and authorized.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const invoker = document.activeElement as HTMLElement | null;
    return () => {
      if (invoker?.isConnected && !invoker.closest('[hidden],[aria-hidden="true"],[inert]') && !invoker.matches(':disabled') && invoker.getClientRects().length) invoker.focus();
    };
  }, []);
  function focusHeading() {
    if (Platform.OS === 'web') {
      (heading.current as unknown as { focus?: () => void } | null)?.focus?.();
    } else {
      const target = findNodeHandle(heading.current);
      if (target) AccessibilityInfo.setAccessibilityFocus(target);
    }
  }
  function requestClose() {
    if (busy) return;
    if (dirty) setConfirmDiscard(true);
    else onClose();
  }
  return <Modal visible animationType={reduceMotion ? 'none' : 'slide'} onShow={focusHeading} onRequestClose={requestClose} accessibilityLabel={title}>
    <SafeAreaView style={s.page} accessibilityViewIsModal>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
          <View ref={heading} nativeID={titleId} accessible accessibilityRole="header" accessibilityLabel={confirmDiscard ? 'Discard your changes?' : title} tabIndex={-1}>
            <Text style={s.title}>{confirmDiscard ? 'Keep your work?' : title}</Text>
          </View>
          {confirmDiscard ? <Panel>
            <Text accessibilityRole="alert" style={s.text}>You have unsaved changes. Keep editing, or discard this draft.</Text>
            <Action label="Keep editing" onPress={() => setConfirmDiscard(false)} />
            <Action label="Discard changes" secondary onPress={onClose} />
          </Panel> : <>{children}<Action label={closeLabel} secondary disabled={busy} onPress={requestClose} /></>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}

type ActionProps = { label: string; accessibilityLabel?: string; onPress: () => void; disabled?: boolean; busy?: boolean; secondary?: boolean; selected?: boolean };
export function Action({ label, accessibilityLabel, onPress, disabled = false, busy = false, secondary = false, selected }: ActionProps) {
  const { styles: s, colors } = usePlanningTheme();
  const [focused, setFocused] = useState(false);
  const foreground = secondary ? colors.onPrimarySoft : colors.onPrimary;
  return <TouchableOpacity accessibilityRole={selected === undefined ? 'button' : 'radio'} accessibilityLabel={accessibilityLabel ?? label}
    accessibilityState={{ disabled: disabled || busy, busy, ...(selected === undefined ? {} : { checked: selected, selected }) }}
    disabled={disabled || busy} onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={[s.button, secondary && s.secondary, (disabled || busy) && { opacity: 0.55 }, focused && { borderColor: colors.text }]}>
    {busy && <ActivityIndicator color={foreground} />}
    <Text style={[s.buttonText, { color: foreground }]}>{selected ? '✓ ' : ''}{label}</Text>
  </TouchableOpacity>;
}

type FieldProps = TextInputProps & { label: string; error?: string; hint?: string; required?: boolean };
export function Field({ label, error, hint, required, ...props }: FieldProps) {
  const { styles: s, colors } = usePlanningTheme();
  const id = useId();
  const description = [required ? 'Required.' : '', hint, error].filter(Boolean).join(' ');
  const webProps = Platform.OS === 'web' ? { 'aria-invalid': Boolean(error), 'aria-required': Boolean(required), 'aria-describedby': description ? id + '-description' : undefined } : {};
  return <View style={{ gap: 7 }}>
    <Text nativeID={id + '-label'} style={s.muted}>{label}{required ? ' *' : ''}</Text>
    <TextInput accessibilityLabel={label} accessibilityHint={description || undefined} placeholderTextColor={colors.subtext} selectionColor={colors.primary}
      {...webProps} {...props} style={[s.input, error && { borderColor: colors.dangerText, borderWidth: 2 }, props.style]} />
    {!!description && <Text nativeID={id + '-description'} accessibilityRole={error ? 'alert' : undefined} style={error ? s.error : s.muted}>{description}</Text>}
  </View>;
}

export function SyncStatus({ loading, refreshing, error, isOffline, lastSyncedAt, onRefresh }: { loading?: boolean; refreshing?: boolean; error?: string; isOffline?: boolean; lastSyncedAt?: number; onRefresh: () => void }) {
  const s = usePlanningStyles();
  if (loading) return <Text accessibilityLiveRegion="polite" style={s.muted}>Loading your household data…</Text>;
  if (error || isOffline) return <Panel><Text accessibilityRole="alert" style={s.error}>{isOffline ? 'You’re offline. Reconnect before saving. Any last-loaded data may be out of date.' : error}</Text><Action label="Try refreshing" secondary busy={refreshing} onPress={onRefresh} /></Panel>;
  return <View style={s.row}><Text accessibilityLiveRegion="polite" style={[s.muted, { flex: 1 }]}>{refreshing ? 'Updating…' : lastSyncedAt ? 'Updated ' + new Date(lastSyncedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : 'Shared with your household'}</Text><Action label="Refresh" secondary busy={refreshing} onPress={onRefresh} /></View>;
}
