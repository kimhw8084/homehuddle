import React, { useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { randomUUID } from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { useHuddleStore } from '../../store/huddleStore';
import { householdApi } from '../../lib/household';
import { householdProofs } from '../../lib/household-proofs';
import { requestHouseholdRefresh } from '../../lib/household-events';
import { Action, Editor, Field, Panel, ScreenHeading, SyncStatus, usePlanningStyles } from '../../components/ui/PlanningUI';
import { useAccessibilityPreferences } from '../../hooks/use-accessibility-preferences';
import { useHouseholdSync } from '../../store/householdSyncStore';
import { useOperationScope } from '../../hooks/use-operation-scope';
import { dateKey } from '../planning/dates';
import { Chore } from '../../types/chores';

type Draft = { id: string; title: string; points: string; assigneeId: string | null; date: string; notes: string; photo: boolean; version: number };
const empty = (): Draft => ({ id: randomUUID(), title: '', points: '10', assigneeId: null, date: dateKey(new Date()), notes: '', photo: false, version: 0 });

export default function HouseholdChores({ embedded = false }: { embedded?: boolean } = {}) {
  const s = usePlanningStyles();
  const captureScope = useOperationScope();
  const sync = useHouseholdSync();
  const { reduceMotion } = useAccessibilityPreferences();
  const [baseline, setBaseline] = useState('');
  const state = useHuddleStore();
  const current = state.familyMembers.find(member => member.id === state.currentMemberId);
  const adult = current?.householdRole === 'owner' || current?.householdRole === 'parent';
  const [draft, setDraft] = useState<Draft | null>(null);
  const [complete, setComplete] = useState<Chore | null>(null);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [mine, setMine] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const refresh = () => { if (state.householdId) requestHouseholdRefresh(state.householdId); };
  async function run(action: (householdId: string, current: () => boolean) => Promise<string>) {
    if (lock.current || !state.householdId) return;
    const current = captureScope();
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try { const message = await action(state.householdId, current); if (current()) { setNotice(message); refresh(); } }
    catch (reason) { if (current()) { setError(reason instanceof Error ? reason.message : 'Your change was not saved. Please try again.'); refresh(); } }
    finally { lock.current = false; if (current()) setBusy(false); }
  }
  function edit(chore?: Chore) {
    const next = chore ? { id: chore.id, title: chore.title, points: String(chore.points), assigneeId: chore.assigned_to ?? null, date: chore.dueDate, notes: chore.notes ?? '', photo: chore.photoRequired, version: chore.version ?? 1 } : empty();
    setBaseline(JSON.stringify(next)); setDraft(next);
    setError(''); setComplete(null);
    scroll.current?.scrollTo({ y: 0, animated: !reduceMotion });
  }
  async function pickPhoto() {
    if (lock.current) return;
    const current = captureScope();
    lock.current = true; setBusy(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!current()) return;
      if (!permission.granted) { setError('Photo access is required to attach proof. You can enable it in device settings.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, exif: false });
      if (current() && !result.canceled) setPhoto(result.assets[0].uri);
    } catch { if (current()) setError('Unable to select a photo. Please try again.'); }
    finally { lock.current = false; if (current()) setBusy(false); }
  }
  const chores = state.chores.filter(chore => !mine || chore.assigned_to === current?.id)
    .sort((a, b) => Number(a.status !== 'pending') - Number(b.status !== 'pending') || a.dueDate.localeCompare(b.dueDate));

  return <SafeAreaView edges={embedded ? ['left', 'right'] : ['top', 'left', 'right']} style={s.page}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView ref={scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={sync.refreshing} onRefresh={refresh} />}>
      {!embedded && <ScreenHeading title="Chores" subtitle="Clear ownership. A shared plan. Points after approval." />}
      <SyncStatus {...sync} onRefresh={refresh} />
      <View accessibilityRole="radiogroup" accessibilityLabel="Chore view" style={s.row}><Action label="Everyone" selected={!mine} secondary={mine} onPress={() => setMine(false)} /><Action label="Assigned to me" selected={mine} secondary={!mine} onPress={() => setMine(true)} /></View>
      {adult && <Action label="Add chore" disabled={busy} onPress={() => edit()} />}
      {!!error && !draft && !complete && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      {!!notice && <Text accessibilityLiveRegion="polite" style={s.muted}>{notice}</Text>}
      {draft && <Editor title={draft.version ? 'Edit chore' : 'A new chore'} busy={busy} dirty={JSON.stringify(draft) !== baseline} onClose={() => setDraft(null)} closeLabel="Cancel chore edit"><Panel>
        {!!error && !error.startsWith('Enter a valid date') && !error.startsWith('Points must') && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        <Field label="What needs doing?" required value={draft.title} maxLength={120} editable={!busy} onChangeText={title => setDraft(old => old ? { ...old, title } : null)} />
        <View style={s.row}><View style={{ flex: 1, minWidth: 150 }}><Field label="Due date (YYYY-MM-DD)" error={error.startsWith('Enter a valid date') ? error : undefined} value={draft.date} maxLength={10} editable={!busy} onChangeText={date => setDraft(old => old ? { ...old, date } : null)} /></View><View style={{ flex: 1, minWidth: 120 }}><Field label="Points" error={error.startsWith('Points must') ? error : undefined} value={draft.points} keyboardType="number-pad" editable={!busy} onChangeText={points => setDraft(old => old ? { ...old, points } : null)} /></View></View>
        <Field label="Instructions (optional)" value={draft.notes} maxLength={2000} multiline editable={!busy} onChangeText={notes => setDraft(old => old ? { ...old, notes } : null)} />
        <Text style={s.muted}>Assigned to</Text><View accessibilityRole="radiogroup" accessibilityLabel="Chore assignee" style={s.row}><Action label="Unassigned" selected={!draft.assigneeId} secondary={!!draft.assigneeId} disabled={busy} onPress={() => setDraft(old => old ? { ...old, assigneeId: null } : null)} />
          {state.familyMembers.map(member => <Action key={member.id} label={`${member.avatar} ${member.name}`} selected={draft.assigneeId === member.id} secondary={draft.assigneeId !== member.id} disabled={busy} onPress={() => setDraft(old => old ? { ...old, assigneeId: member.id ?? null } : null)} />)}</View>
        <View style={s.row}><Switch accessibilityLabel="Require an after photo" value={draft.photo} disabled={busy} onValueChange={value => setDraft(old => old ? { ...old, photo: value } : null)} /><Text style={s.text}>Require an after photo</Text></View>
        <Action label="Save chore" busy={busy} disabled={!draft.title.trim()} onPress={() => { void run(async householdId => {
          const points = Number(draft.points);
          if (!Number.isInteger(points) || points < 0 || points > 100000) throw new Error('Points must be a whole number between 0 and 100,000.');
          if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || dateKey(new Date(`${draft.date}T12:00:00`)) !== draft.date) throw new Error('Enter a valid date in YYYY-MM-DD format.');
          const input = { title: draft.title.trim(), points, assigneeId: draft.assigneeId ?? undefined, dueDate: draft.date, notes: draft.notes, photoRequired: draft.photo };
          if (draft.version) await householdApi.updateChore({ ...input, id: draft.id, version: draft.version });
          else await householdApi.createChoreV2({ ...input, householdId, requestId: draft.id });
          setDraft(null); return 'Chore saved to your household.';
        }); }} />
      </Panel></Editor>}
      {complete && <Editor title={`Complete: ${complete.title}`} busy={busy} dirty={Boolean(note || photo)} onClose={() => setComplete(null)} closeLabel="Cancel completion"><Panel>
        {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        <Field label="Completion note (optional)" value={note} maxLength={2000} multiline onChangeText={setNote} editable={!busy} />
        {photo && <Image source={{ uri: photo }} accessibilityLabel="Selected proof photo" style={{ height: 180, width: '100%' }} resizeMode="contain" />}
        <Action label={photo ? 'Change proof photo' : 'Attach proof photo'} secondary disabled={busy} onPress={() => { void pickPhoto(); }} />
        <Text style={s.muted}>{complete.photoRequired ? 'An after photo is required. ' : ''}JPEG, PNG or WebP, up to 5 MB.</Text>
        <Action label="Submit for approval" busy={busy} disabled={complete.photoRequired && !photo} onPress={() => { void run(async (householdId, currentScope) => {
          const memberId = complete.assigned_to ?? state.currentMemberId;
          if (!memberId) throw new Error('Your member profile is not ready.');
          const afterPath = photo ? await householdProofs.upload({ householdId, choreId: complete.id, slot: 'after', uri: photo }) : undefined;
          if (!currentScope()) return '';
          await householdApi.submitCompletion({ choreId: complete.id, memberId, occurrenceDate: complete.dueDate, afterPath, note });
          setComplete(null); setPhoto(null); setNote(''); return 'Submitted. An adult can now review this chore on Home.';
        }); }} />
      </Panel></Editor>}
      {!chores.length && <Panel><Text style={s.heading}>{mine ? 'Nothing assigned to you' : 'A fresh start'}</Text><Text style={s.muted}>{adult ? 'Add the first chore your household wants to coordinate.' : 'An adult can add and assign household chores.'}</Text></Panel>}
      {chores.map(chore => {
        const assignee = state.familyMembers.find(member => member.id === chore.assigned_to);
        const canComplete = !chore.assigned_to || chore.assigned_to === current?.id || (adult && assignee?.householdRole === 'child' && !assignee.authUserId);
        return <Panel key={chore.id}><Text style={s.heading}>{chore.title}</Text><Text style={s.muted}>{chore.assignee ?? 'Unassigned'} · {chore.dueDate} · {chore.points} points</Text>
          {!!chore.notes && <Text style={s.text}>{chore.notes}</Text>}
          <Text style={s.muted}>{chore.reviewStatus === 'submitted' ? 'Awaiting review' : chore.reviewStatus === 'approved' ? 'Approved' : 'To do'}{chore.photoRequired ? ' · Photo required' : ''}</Text>
          <View style={s.row}>{chore.status === 'pending' && canComplete && <Action label="Complete chore" accessibilityLabel={`Complete ${chore.title}`} disabled={busy} onPress={() => { setComplete(chore); setDraft(null); setNote(''); setPhoto(null); setError(''); }} />}
            {adult && chore.status === 'pending' && <Action label="Edit chore" accessibilityLabel={`Edit ${chore.title}`} secondary disabled={busy} onPress={() => edit(chore)} />}
            {adult && chore.reviewStatus !== 'submitted' && <Action label="Archive chore" accessibilityLabel={`Archive ${chore.title}`} secondary disabled={busy} onPress={() => setArchiving(chore.id)} />}</View>
          {archiving === chore.id && <View style={{ gap: 10 }}><Text style={s.muted}>Archive this chore? Completion and points history will be preserved.</Text><Action label="Confirm archive" disabled={busy} onPress={() => { void run(async () => { await householdApi.archiveChore(chore.id); setArchiving(null); return 'Chore archived. Its history is preserved.'; }); }} /><Action label="Keep chore" secondary onPress={() => setArchiving(null)} /></View>}
        </Panel>;
      })}
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
