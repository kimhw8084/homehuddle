import React, { useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { randomUUID } from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { useHuddleStore } from '../../store/huddleStore';
import { householdApi } from '../../lib/household';
import { householdProofs } from '../../lib/household-proofs';
import { requestHouseholdRefresh } from '../../lib/household-events';
import { Action, Field, Panel, planningStyles as s } from '../../components/ui/PlanningUI';
import { dateKey } from '../planning/dates';
import { Chore } from '../../types/chores';

type Draft = { id: string; title: string; points: string; assigneeId: string | null; date: string; notes: string; photo: boolean; version: number };
const empty = (): Draft => ({ id: randomUUID(), title: '', points: '10', assigneeId: null, date: dateKey(new Date()), notes: '', photo: false, version: 0 });

export default function HouseholdChores() {
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
  async function run(action: (householdId: string) => Promise<string>) {
    if (lock.current || !state.householdId) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try { setNotice(await action(state.householdId)); refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Your change was not saved. Please try again.'); refresh(); }
    finally { lock.current = false; setBusy(false); }
  }
  function edit(chore?: Chore) {
    setDraft(chore ? { id: chore.id, title: chore.title, points: String(chore.points), assigneeId: chore.assigned_to ?? null, date: chore.dueDate, notes: chore.notes ?? '', photo: chore.photoRequired, version: chore.version ?? 1 } : empty());
    setError(''); setComplete(null);
    scroll.current?.scrollTo({ y: 0, animated: true });
  }
  async function pickPhoto() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { setError('Photo access is required to attach proof. You can enable it in device settings.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, exif: false });
      if (!result.canceled) setPhoto(result.assets[0].uri);
    } catch { setError('Unable to select a photo. Please try again.'); }
  }
  const chores = state.chores.filter(chore => !mine || chore.assigned_to === current?.id)
    .sort((a, b) => Number(a.status !== 'pending') - Number(b.status !== 'pending') || a.dueDate.localeCompare(b.dueDate));

  return <SafeAreaView style={s.page}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView ref={scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}>
      <Text accessibilityRole="header" style={s.title}>Chores</Text><Text style={s.muted}>Clear ownership. A shared plan. Points after approval.</Text>
      <View style={s.row}><Action label="Everyone" secondary={mine} onPress={() => setMine(false)} /><Action label="Assigned to me" secondary={!mine} onPress={() => setMine(true)} />{adult && <Action label="Add chore" disabled={busy} onPress={() => edit()} />}</View>
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      {!!notice && <Text accessibilityLiveRegion="polite" style={s.muted}>{notice}</Text>}
      {draft && <Panel><Text accessibilityRole="header" style={s.heading}>{draft.version ? 'Edit chore' : 'A new chore'}</Text>
        <Field label="What needs doing?" value={draft.title} maxLength={120} editable={!busy} onChangeText={title => setDraft(old => old ? { ...old, title } : null)} />
        <View style={s.row}><View style={{ flex: 1 }}><Field label="Due date (YYYY-MM-DD)" value={draft.date} maxLength={10} editable={!busy} onChangeText={date => setDraft(old => old ? { ...old, date } : null)} /></View><View style={{ flex: 1 }}><Field label="Points" value={draft.points} keyboardType="number-pad" editable={!busy} onChangeText={points => setDraft(old => old ? { ...old, points } : null)} /></View></View>
        <Field label="Instructions (optional)" value={draft.notes} maxLength={2000} multiline editable={!busy} onChangeText={notes => setDraft(old => old ? { ...old, notes } : null)} />
        <Text style={s.muted}>Assigned to</Text><View style={s.row}><Action label="Unassigned" secondary={!!draft.assigneeId} disabled={busy} onPress={() => setDraft(old => old ? { ...old, assigneeId: null } : null)} />
          {state.familyMembers.map(member => <Action key={member.id} label={`${member.avatar} ${member.name}`} secondary={draft.assigneeId !== member.id} disabled={busy} onPress={() => setDraft(old => old ? { ...old, assigneeId: member.id ?? null } : null)} />)}</View>
        <View style={s.row}><Switch accessibilityLabel="Require an after photo" value={draft.photo} disabled={busy} onValueChange={value => setDraft(old => old ? { ...old, photo: value } : null)} /><Text style={s.text}>Require an after photo</Text></View>
        <Action label="Save chore" busy={busy} disabled={!draft.title.trim()} onPress={() => { void run(async householdId => {
          const points = Number(draft.points);
          if (!Number.isInteger(points) || points < 0 || points > 100000) throw new Error('Points must be a whole number between 0 and 100,000.');
          if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || dateKey(new Date(`${draft.date}T12:00:00`)) !== draft.date) throw new Error('Enter a valid date in YYYY-MM-DD format.');
          const input = { title: draft.title.trim(), points, assigneeId: draft.assigneeId ?? undefined, dueDate: draft.date, notes: draft.notes, photoRequired: draft.photo };
          if (draft.version) await householdApi.updateChore({ ...input, id: draft.id, version: draft.version });
          else await householdApi.createChoreV2({ ...input, householdId, requestId: draft.id });
          setDraft(null); return 'Chore saved to your household.';
        }); }} /><Action label="Cancel chore edit" secondary disabled={busy} onPress={() => setDraft(null)} />
      </Panel>}
      {complete && <Panel><Text style={s.heading}>Complete: {complete.title}</Text><Field label="Completion note (optional)" value={note} maxLength={2000} multiline onChangeText={setNote} editable={!busy} />
        {photo && <Image source={{ uri: photo }} accessibilityLabel="Selected proof photo" style={{ height: 180, width: '100%' }} resizeMode="contain" />}
        <Action label={photo ? 'Change proof photo' : 'Attach proof photo'} secondary disabled={busy} onPress={() => { void pickPhoto(); }} />
        <Text style={s.muted}>{complete.photoRequired ? 'An after photo is required. ' : ''}JPEG, PNG or WebP, up to 5 MB.</Text>
        <Action label="Submit for approval" busy={busy} disabled={complete.photoRequired && !photo} onPress={() => { void run(async householdId => {
          const memberId = complete.assigned_to ?? state.currentMemberId;
          if (!memberId) throw new Error('Your member profile is not ready.');
          const afterPath = photo ? await householdProofs.upload({ householdId, choreId: complete.id, slot: 'after', uri: photo }) : undefined;
          await householdApi.submitCompletion({ choreId: complete.id, memberId, occurrenceDate: complete.dueDate, afterPath, note });
          setComplete(null); setPhoto(null); setNote(''); return 'Submitted. An adult can now review this chore on Home.';
        }); }} /><Action label="Cancel completion" secondary disabled={busy} onPress={() => setComplete(null)} />
      </Panel>}
      {!chores.length && <Panel><Text style={s.heading}>{mine ? 'Nothing assigned to you' : 'A fresh start'}</Text><Text style={s.muted}>{adult ? 'Add the first chore your household wants to coordinate.' : 'An adult can add and assign household chores.'}</Text></Panel>}
      {chores.map(chore => {
        const assignee = state.familyMembers.find(member => member.id === chore.assigned_to);
        const canComplete = !chore.assigned_to || chore.assigned_to === current?.id || (adult && assignee?.householdRole === 'child' && !assignee.authUserId);
        return <Panel key={chore.id}><Text style={s.heading}>{chore.title}</Text><Text style={s.muted}>{chore.assignee ?? 'Unassigned'} · {chore.dueDate} · {chore.points} points</Text>
          {!!chore.notes && <Text style={s.text}>{chore.notes}</Text>}
          <Text style={s.muted}>{chore.reviewStatus === 'submitted' ? 'Awaiting review' : chore.reviewStatus === 'approved' ? 'Approved' : 'To do'}{chore.photoRequired ? ' · Photo required' : ''}</Text>
          <View style={s.row}>{chore.status === 'pending' && canComplete && <Action label="Complete chore" disabled={busy} onPress={() => { setComplete(chore); setDraft(null); setNote(''); setPhoto(null); setError(''); scroll.current?.scrollTo({ y: 0, animated: true }); }} />}
            {adult && chore.status === 'pending' && <Action label="Edit chore" secondary disabled={busy} onPress={() => edit(chore)} />}
            {adult && chore.reviewStatus !== 'submitted' && <Action label="Archive chore" secondary disabled={busy} onPress={() => setArchiving(chore.id)} />}</View>
          {archiving === chore.id && <View style={{ gap: 10 }}><Text style={s.muted}>Archive this chore? Completion and points history will be preserved.</Text><Action label="Confirm archive" disabled={busy} onPress={() => { void run(async () => { await householdApi.archiveChore(chore.id); setArchiving(null); return 'Chore archived. Its history is preserved.'; }); }} /><Action label="Keep chore" secondary onPress={() => setArchiving(null)} /></View>}
        </Panel>;
      })}
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
