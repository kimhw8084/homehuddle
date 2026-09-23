import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { randomUUID } from 'expo-crypto';
import { Action, Editor, Field, Panel, ScreenHeading, SyncStatus, usePlanningStyles } from '../../components/ui/PlanningUI';
import { useAccessibilityPreferences } from '../../hooks/use-accessibility-preferences';
import { planningApi, ShoppingItem } from '../planning/api';
import { useSharedData } from '../planning/use-shared-data';
import { classify } from '../../utils/groceryClassifier';
import { useOperationScope } from '../../hooks/use-operation-scope';

const TABLES = ['shopping_items'] as const;
const load = (householdId: string) => planningApi.shopping(householdId);
type Draft = Omit<ShoppingItem, 'household_id' | 'created_at'>;
const newDraft = (): Draft => ({ id: randomUUID(), name: '', quantity: 1, unit: '', category: 'Other', completed: false, archived: false, version: 0 });

export default function ShoppingScreen() {
  const s = usePlanningStyles();
  const captureScope = useOperationScope();
  const { reduceMotion } = useAccessibilityPreferences();
  const shared = useSharedData(TABLES, load);
  const [draft, setDraft] = useState<Draft>(newDraft);
  const [quantity, setQuantity] = useState('1');
  const baseline = useRef(JSON.stringify([draft, quantity]));
  const [replacement, setReplacement] = useState<Draft | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const lock = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const [error, setError] = useState('');
  const [quantityError, setQuantityError] = useState('');
  const [notice, setNotice] = useState('');
  const [archived, setArchived] = useState<ShoppingItem | null>(null);
  const items = shared.data ?? [];
  function replaceDraft(next: Draft) {
    setDraft(next); setQuantity(String(next.quantity)); setError(''); setQuantityError('');
    baseline.current = JSON.stringify([next, String(next.quantity)]);
    scroll.current?.scrollTo({ y: 0, animated: !reduceMotion });
  }
  function requestDraft(next: Draft) {
    if (JSON.stringify([draft, quantity]) !== baseline.current) setReplacement(next);
    else replaceDraft(next);
  }

  async function save(item: Draft, reset = false) {
    if (!shared.householdId || lock.current) return false;
    const current = captureScope();
    if (!item.name.trim() || !Number.isFinite(item.quantity) || item.quantity <= 0 || item.quantity > 10000) {
      setQuantityError('Enter an item name and a quantity greater than zero, up to 10,000.'); return false;
    }
    lock.current = true; setBusy(item.id); setError(''); setQuantityError(''); setNotice('');
    try {
      const saved = await planningApi.saveItem(shared.householdId, item);
      if (!current()) return false;
      if (item.archived) setArchived(saved);
      if (reset) replaceDraft(newDraft());
      setNotice(item.archived ? 'Item archived. You can undo below.' : 'Saved to your household list.');
      shared.refresh();
      return true;
    } catch (reason) {
      if (!current()) return false;
      setError(reason instanceof Error ? reason.message : 'Your change was not saved. Please try again.');
      shared.refresh();
      return false;
    } finally { lock.current = false; if (current()) setBusy(null); }
  }

  return <SafeAreaView style={s.page}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={Boolean(shared.refreshing)} onRefresh={shared.refresh} />}>
      <ScreenHeading title="Shopping" eyebrow="Less to remember" subtitle="One shared list. Pick it up, check it off, get on with your day." />
      <SyncStatus {...shared} onRefresh={shared.refresh} />
      <Panel>
        <Text accessibilityRole="header" style={s.heading}>{draft.version ? 'Edit item' : 'Add an item'}</Text>
        <Field label="Item name" required value={draft.name} maxLength={160} editable={!busy} onChangeText={name => setDraft(old => ({ ...old, name }))} placeholder="Milk, laundry detergent…" returnKeyType="next" />
        <View style={s.row}><View style={{ flex: 1, minWidth: 120 }}><Field label="Quantity" error={quantityError} value={quantity} keyboardType="decimal-pad" editable={!busy} onChangeText={value => { setQuantity(value); setQuantityError(''); }} /></View>
          <View style={{ flex: 1 }}><Field label="Unit (optional)" value={draft.unit} maxLength={30} editable={!busy} onChangeText={unit => setDraft(old => ({ ...old, unit }))} placeholder="kg, packs, bottles" /></View></View>
        {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        <Action label={draft.version ? 'Save changes' : 'Add to shared list'} disabled={!!busy || !draft.name.trim()} busy={busy === draft.id}
          onPress={() => { void save({ ...draft, quantity: Number(quantity.replace(',', '.')), category: classify(draft.name).category }, true); }} />
        {!!draft.version && <Action label="Cancel edit" secondary disabled={!!busy} onPress={() => requestDraft(newDraft())} />}
      </Panel>
      {replacement && <Editor title="Keep your shopping draft?" busy={!!busy} onClose={() => setReplacement(null)} closeLabel="Keep editing this item">
        <Text style={s.text}>You have unsaved changes. Discard them to switch items?</Text>
        <Action label="Discard shopping changes" secondary onPress={() => { replaceDraft(replacement); setReplacement(null); }} />
      </Editor>}
      {!!notice && <Text accessibilityLiveRegion="polite" style={s.muted}>{notice}</Text>}
      {archived && <Action label={`Undo archive: ${archived.name}`} secondary disabled={!!busy} onPress={() => { void save({ ...archived, archived: false }).then(saved => { if (saved) setArchived(null); }); }} />}
      <View accessibilityRole="radiogroup" accessibilityLabel="Shopping list view" style={s.row}><Action label={`To buy (${shared.data ? items.filter(item => !item.completed).length : '—'})`} selected={!showCompleted} secondary={showCompleted} onPress={() => setShowCompleted(false)} />
        <Action label={`Purchased (${shared.data ? items.filter(item => item.completed).length : '—'})`} selected={showCompleted} secondary={!showCompleted} onPress={() => setShowCompleted(true)} /></View>
      {!shared.loading && !shared.error && !shared.isOffline && shared.data !== undefined && !items.some(item => item.completed === showCompleted) && <Panel><Text style={s.heading}>{showCompleted ? 'No purchased items yet' : 'You’re all stocked up'}</Text><Text style={s.muted}>{showCompleted ? 'Checked-off items stay here until you archive them.' : 'Add what you need above, or send ingredients here from your meal plan.'}</Text></Panel>}
      {items.filter(item => item.completed === showCompleted).map(item => <Panel key={item.id}>
        <Text style={s.heading}>{item.name}</Text><Text style={s.muted}>{item.quantity} {item.unit} · {item.category}</Text>
        <View style={s.row}>
          <Action label={item.completed ? 'Buy again' : 'Mark purchased'} disabled={!!busy} busy={busy === item.id} onPress={() => { void save({ ...item, completed: !item.completed }); }} />
          <Action label="Edit" accessibilityLabel={`Edit ${item.name}`} secondary disabled={!!busy} onPress={() => requestDraft(item)} />
          <Action label="Archive" accessibilityLabel={`Archive ${item.name}`} secondary disabled={!!busy} onPress={() => { void save({ ...item, archived: true }); }} />
        </View>
      </Panel>)}
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
