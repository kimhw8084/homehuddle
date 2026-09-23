import { supabase } from '../../lib/supabase';

export type Routine = {
  id: string; household_id: string; title: string; points: number; notes: string;
  photo_required: boolean; timezone: string; starts_on: string; ends_on: string | null;
  frequency: 'daily' | 'weekly'; interval_count: number; assignee_ids: string[];
  active: boolean; version: number;
};
export type RoutineInput = Omit<Routine, 'household_id' | 'active' | 'version'>;
export const routinesApi = {
  async list(householdId: string): Promise<Routine[]> {
    const { data, error } = await supabase.from('chore_routines').select('*').eq('household_id', householdId).order('created_at', { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  },
  async create(householdId: string, value: RoutineInput) {
    const { error } = await supabase.rpc('create_chore_routine', {
      target_household: householdId, request_id: value.id, title_value: value.title,
      points_value: value.points, notes_value: value.notes, photo_value: value.photo_required,
      timezone_value: value.timezone, start_value: value.starts_on, end_value: value.ends_on,
      frequency_value: value.frequency, interval_value: value.interval_count, assignees: value.assignee_ids,
    });
    if (error) throw new Error(error.message);
  },
  async setActive(routine: Routine, active: boolean) {
    const { error } = await supabase.rpc('set_chore_routine_active', { target_routine: routine.id, active_value: active, expected_version: routine.version });
    if (error) throw new Error(error.message);
  },
};
