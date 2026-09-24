import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { Action, Editor, Field, Panel, SyncStatus, usePlanningStyles } from '../../components/ui/PlanningUI';
import { useHuddleStore } from '../../store/huddleStore';
import { useHouseholdContext, currentHouseholdContextKey } from '../../hooks/use-household-context';
import { requestHouseholdRefresh } from '../../lib/household-events';
import { useSharedData } from '../planning/use-shared-data';
import { dateKey } from '../planning/dates';
import { RoutineInput, routinesApi } from './routines';
import { getHouseholdBillingStatus } from '../../lib/billing';

const tables = ['chore_routines'];
const entitlementTables = ['household_entitlements'];
const newDraft = (): RoutineInput => ({ id: randomUUID(), title: '', points: 10, notes: '', photo_required: false, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', starts_on: dateKey(new Date()), ends_on: null, frequency: 'weekly', interval_count: 1, assignee_ids: [] });

export default function HouseholdRoutines() {
  const s = usePlanningStyles();
  const context = useHouseholdContext();
  const members = useHuddleStore(state => state.familyMembers);
  const adult = context.role === 'owner' || context.role === 'parent';
  const loader = useCallback((id: string) => routinesApi.list(id), []);
  const shared = useSharedData(tables, loader);
  const loadPlan = useCallback((id: string) => getHouseholdBillingStatus(id), []);
  const plan = useSharedData(entitlementTables, loadPlan);
  const [draft, setDraft] = useState<RoutineInput | null>(null);
  const [points, setPoints] = useState('10');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [baseline, setBaseline] = useState('');
  async function run(action: () => Promise<void>, message: string) {
    if (lock.current) return;
    const scope = context.key;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      await action();
      if (scope !== currentHouseholdContextKey()) return;
      setNotice(message); shared.refresh();
      if (context.householdId) requestHouseholdRefresh(context.householdId);
    } catch (reason) {
      if (scope === currentHouseholdContextKey()) setError(reason instanceof Error ? reason.message : 'Your change was not saved. Try again.');
    } finally { lock.current = false; if (scope === currentHouseholdContextKey()) setBusy(false); }
  }
  return <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <Panel><Text style={s.heading}>Plan once. Repeat reliably.</Text><Text style={s.muted}>Daily and weekly routines are free. Each date becomes its own chore with its own approval and points.</Text>
      <Text style={s.muted}>Opening HomeHuddle prepares the next 14 days. Existing chores stay when you pause; archive a chore to skip just that date. No automatic backfill of missed dates.</Text>
      {adult && <Action label="Create routine" onPress={() => { const next = newDraft(); setBaseline(JSON.stringify(next)); setDraft(next); setPoints('10'); setError(''); }} />}
    </Panel>
    <SyncStatus {...shared} onRefresh={shared.refresh} />
    {!!error && !draft && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {!!notice && <Text accessibilityLiveRegion="polite" style={s.text}>{notice}</Text>}
    {shared.data?.length === 0 && <Panel><Text style={s.heading}>No routines yet</Text><Text style={s.muted}>{adult ? 'Start with something predictable, such as taking out the bins each week.' : 'An adult can set up a routine for your household.'}</Text></Panel>}
    {shared.data?.map(routine => <Panel key={routine.id}>
      <Text style={s.heading}>{routine.title}</Text>
      <Text style={s.muted}>{routine.active ? 'Active' : 'Paused'} · Every {routine.interval_count} {routine.frequency === 'daily' ? 'day(s)' : 'week(s)'} · {routine.points} points</Text>
      <Text style={s.muted}>Starts {routine.starts_on} · {routine.timezone}</Text>
      {routine.assignee_ids.length > 1 && <Text style={s.muted}>Rotates: {routine.assignee_ids.map(id => members.find(member => member.id === id)?.name ?? 'Removed member').join(' → ')}</Text>}
      {(routine.interval_count > 1 || routine.assignee_ids.length > 1) && plan.data && !plan.data.active && <Text style={s.muted}>Plus has expired. New occurrences are paused; existing chores remain available.</Text>}
      {adult && <Action label={routine.active ? 'Pause routine' : 'Resume routine'} accessibilityLabel={`${routine.active ? 'Pause' : 'Resume'} ${routine.title}`} secondary busy={busy} onPress={() => { void run(() => routinesApi.setActive(routine, !routine.active), routine.active ? 'Routine paused. Existing chores are unchanged.' : 'Routine resumed. The next 14 days are prepared.'); }} />}
    </Panel>)}
    {draft && <Editor title="Create a routine" busy={busy} dirty={JSON.stringify(draft) !== baseline || points !== '10'} onClose={() => setDraft(null)}>
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      <Field label="Chore title" required value={draft.title} maxLength={120} editable={!busy} onChangeText={title => setDraft({ ...draft, title })} />
      <Text style={s.text}>Repeat</Text><View accessibilityRole="radiogroup" accessibilityLabel="Repeat frequency" style={s.row}>{(['daily', 'weekly'] as const).map(frequency => <Action key={frequency} label={frequency === 'daily' ? 'Every day' : 'Every week'} selected={draft.frequency === frequency} secondary={draft.frequency !== frequency} disabled={busy} onPress={() => setDraft({ ...draft, frequency })} />)}</View>
      {plan.data?.active && <><Text style={s.text}>Repeat interval</Text><View accessibilityRole="radiogroup" accessibilityLabel="Repeat interval" style={s.row}>{[1, 2, 3, 4].map(interval => <Action key={interval} label={`Every ${interval} ${draft.frequency === 'daily' ? 'day(s)' : 'week(s)'}`} selected={draft.interval_count === interval} secondary={draft.interval_count !== interval} disabled={busy} onPress={() => setDraft({ ...draft, interval_count: interval })} />)}</View></>}
      <Field label="First date (YYYY-MM-DD)" required value={draft.starts_on} editable={!busy} maxLength={10} onChangeText={starts_on => setDraft({ ...draft, starts_on })} />
      <Field label="Timezone" required hint="Dates follow this timezone, even when you travel." value={draft.timezone} autoCapitalize="none" editable={!busy} onChangeText={timezone => setDraft({ ...draft, timezone })} />
      <Field label="Points per occurrence" required value={points} editable={!busy} keyboardType="number-pad" onChangeText={setPoints} />
      <Text style={s.text}>Assigned to</Text><View accessibilityRole="radiogroup" accessibilityLabel="Routine assignee" style={s.row}>
        <Action label="Unassigned" selected={!draft.assignee_ids.length} secondary={!!draft.assignee_ids.length} disabled={busy} onPress={() => setDraft({ ...draft, assignee_ids: [] })} />
        {members.map(member => <Action key={member.id} label={member.name} selected={draft.assignee_ids[0] === member.id} secondary={draft.assignee_ids[0] !== member.id} disabled={busy} onPress={() => setDraft({ ...draft, assignee_ids: member.id ? [member.id] : [] })} />)}
      </View>
      {plan.data?.active && <><Text style={s.text}>Rotate across people (optional)</Text><Text style={s.muted}>Tap to add or remove people. The displayed order repeats for each occurrence.</Text><View style={s.row}>
        {members.map(member => <Action key={member.id} label={`${draft.assignee_ids.includes(member.id ?? '') ? '✓ ' : ''}${member.name}`} accessibilityLabel={`${draft.assignee_ids.includes(member.id ?? '') ? 'Remove' : 'Add'} ${member.name} ${draft.assignee_ids.includes(member.id ?? '') ? 'from' : 'to'} rotation`} secondary disabled={busy} onPress={() => { const id = member.id; if (id) setDraft({ ...draft, assignee_ids: draft.assignee_ids.includes(id) ? draft.assignee_ids.filter(value => value !== id) : [...draft.assignee_ids, id] }); }} />)}
      </View><Text style={s.muted}>Order: {draft.assignee_ids.map(id => members.find(member => member.id === id)?.name).join(' → ') || 'Unassigned'}</Text></>}
      <Field label="Instructions (optional)" value={draft.notes} maxLength={2000} multiline editable={!busy} onChangeText={notes => setDraft({ ...draft, notes })} />
      <Action label="Save routine" busy={busy} disabled={!draft.title.trim() || !context.householdId} onPress={() => { void run(async () => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.starts_on) || dateKey(new Date(`${draft.starts_on}T12:00:00`)) !== draft.starts_on) throw new Error('Enter a valid first date in YYYY-MM-DD format.');
        if (!points.trim() || !Number.isInteger(Number(points)) || Number(points) < 0 || Number(points) > 100000) throw new Error('Points must be a whole number from 0 to 100,000.');
        await routinesApi.create(context.householdId!, { ...draft, title: draft.title.trim(), points: Number(points) });
        if (context.key === currentHouseholdContextKey()) setDraft(null);
      }, 'Routine saved. Its upcoming chores are ready.'); }} />
    </Editor>}
  </ScrollView>;
}
