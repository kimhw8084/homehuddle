import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { householdProofs } from './household-proofs';
import { ChoreCompletionRecord, HouseholdSnapshot } from '../types/household';

const TABLES = ['household_members', 'chores', 'chore_completions', 'rewards', 'reward_inventory', 'point_ledger', 'shopping_items', 'market_sales', 'wallet_funds', 'wallet_fund_contributions'] as const;

export const householdData = {
  async load(householdId: string, historyLimit = 100): Promise<HouseholdSnapshot> {
    const prepared = await supabase.rpc('materialize_household_routines', { target_household: householdId });
    if (prepared.error) throw prepared.error;
    const { data, error } = await supabase.rpc('get_household_snapshot', { target_household_id: householdId, history_limit: historyLimit });
    if (error) throw error;
    const snapshot = data as HouseholdSnapshot;
    return { ...snapshot, completions: await withProofUrls(snapshot.completions) };
  },

  async refresh(_snapshot: HouseholdSnapshot, householdId: string, _table: string): Promise<HouseholdSnapshot> {
    // A single RPC preserves consistency between approval, ledger and balance.
    return householdData.load(householdId);
  },

  subscribe(householdId: string, onChange: (table: string) => void, onStatus?: (status: string) => void): RealtimeChannel {
    const channel = supabase.channel('household:' + householdId);
    for (const table of TABLES) channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: 'household_id=eq.' + householdId }, () => onChange(table));
    return channel.subscribe(status => onStatus?.(status));
  },

  unsubscribe(channel: RealtimeChannel) { return supabase.removeChannel(channel); },
};

async function withProofUrls(completions: ChoreCompletionRecord[]) {
  const paths = completions.filter(row => row.status === 'submitted')
    .flatMap(row => [row.before_photo_path, row.after_photo_path]).filter((path): path is string => Boolean(path));
  const urls = await householdProofs.signedUrls(paths).catch(() => new Map<string, string>());
  return completions.map(row => ({ ...row, before_photo_url: urls.get(row.before_photo_path ?? '') ?? null, after_photo_url: urls.get(row.after_photo_path ?? '') ?? null }));
}
