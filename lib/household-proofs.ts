import { supabase } from './supabase';

const BUCKET = 'chore-proofs';

export const householdProofs = {
  async upload(input: { householdId: string; choreId: string; slot: 'before' | 'after'; uri: string }) {
    const response = await fetch(input.uri);
    if (!response.ok) throw new Error('Unable to read the selected photo.');

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) throw new Error('Choose a JPEG, PNG, or WebP photo.');
    const bytes = await response.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > 5 * 1024 * 1024) throw new Error('Choose a photo smaller than 5 MB.');
    const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
    const path = `${input.householdId}/${input.choreId}/${Date.now()}-${input.slot}.${extension}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType,
      upsert: false,
    });
    if (error) throw error;
    return path;
  },

  async signedUrls(paths: string[]) {
    const unique = [...new Set(paths)];
    if (!unique.length) return new Map<string, string>();
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(unique, 600);
    if (error) throw error;
    return new Map((data ?? []).filter(item => item.path && item.signedUrl && !item.error).map(item => [item.path!, item.signedUrl]));
  },

  async signedUrl(path: string | null, expiresInSeconds = 60 * 10) {
    if (!path) return null;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
  },
};
