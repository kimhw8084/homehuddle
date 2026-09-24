import { supabase } from '../../lib/supabase';
import { persistedCommand } from '../../lib/persisted-command';

export async function marketCommand(userId: string, householdId: string, operation: string, entity: string, rpc: string, args: Record<string, unknown>, current: () => boolean, identityFields = ['request_id']) {
  const withIdentity = (values: Record<string, unknown>, fields: string[], id: string) => ({ ...values, ...Object.fromEntries(fields.map(field => [field, id])) });
  return persistedCommand(`homehuddle:command:${userId}:${householdId}:${operation}:${entity}`, { rpc, args, identityFields }, current,
    async requestId => await supabase.rpc(rpc, withIdentity(args, identityFields, requestId)),
    async (requestId, previousIntent) => {
      const previous = previousIntent as { rpc?: string; args?: Record<string, unknown>; identityFields?: string[] };
      if (previous.rpc !== rpc || !previous.args) throw new Error('The previous change needs to be retried from its original screen.');
      return await supabase.rpc(rpc, withIdentity(previous.args, previous.identityFields ?? ['request_id'], requestId));
    });
}
