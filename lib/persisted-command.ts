import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';

type Receipt = { id: string; intent: string };
type Result<T> = { data: T; error: { message: string; code?: string } | null };
const running = new Set<string>();

/** Persist intent BEFORE sending. Unknown transport failures retain their ID;
 * definite PostgreSQL rejections roll back the transaction and can be retried
 * with an edited draft. Account switches never start work for the next account. */
export async function persistedCommand<T>(key: string, intent: unknown, current: () => boolean, send: (id: string) => Promise<Result<T>>, resume?: (id: string, previousIntent: unknown) => Promise<Result<T>>): Promise<T> {
  if (running.has(key)) throw new Error('This change is already being saved.');
  running.add(key);
  try {
    const encoded = JSON.stringify(intent);
    const saved = await AsyncStorage.getItem(key);
    const receipt: Receipt = saved ? JSON.parse(saved) : { id: randomUUID(), intent: encoded };
    const changed = receipt.intent !== encoded;
    if (changed && !resume) throw new Error('A previous change is still unconfirmed. Retry that change before editing it.');
    if (!current()) throw new Error('Your household session changed.');
    await AsyncStorage.setItem(key, JSON.stringify(receipt));
    if (!current()) throw new Error('Your household session changed.');
    // Resolve the ORIGINAL operation first. Never turn a lost acknowledgement
    // into a second purchase or silently submit an edited draft as a retry.
    const { data, error } = changed
      ? await resume!(receipt.id, JSON.parse(receipt.intent))
      : await send(receipt.id);
    if (error) {
      // SQLSTATE is exactly five characters. HTTP/network failures are not
      // proof that the transaction failed; keep those operation IDs.
      if (/^[0-9A-Z]{5}$/.test(error.code ?? '')) await AsyncStorage.removeItem(key);
      throw new Error(error.message);
    }
    await AsyncStorage.removeItem(key);
    if (changed) throw new Error('Your earlier change is confirmed. Review the refreshed household before submitting another change.');
    return data;
  } finally { running.delete(key); }
}
