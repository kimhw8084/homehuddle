import { Buffer } from 'node:buffer';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const errors = [];
try {
  const parsed = new URL(url);
  const local = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  if (parsed.protocol !== 'https:' && !local) errors.push('Use HTTPS for a non-local Supabase project.');
  if (/PROJECT|REPLACE|example/i.test(parsed.hostname)) errors.push('Replace the example Supabase URL.');
} catch { errors.push('EXPO_PUBLIC_SUPABASE_URL is missing or invalid.'); }
if (!key || /REPLACE_ME/.test(key)) errors.push('A Supabase public client key is required.');
else if (key.startsWith('sb_secret_')) errors.push('A server secret must never appear in a public environment variable.');
else if (!key.startsWith('sb_publishable_')) {
  try {
    const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
    if (payload.role !== 'anon') errors.push('Only a legacy anon key is allowed in the app.');
  } catch { errors.push('Use a publishable key or a valid legacy anon key.'); }
}
for (const name of Object.keys(process.env)) {
  if (name.startsWith('EXPO_PUBLIC_') && /SECRET|SERVICE_ROLE|PRIVATE_KEY|PASSWORD/i.test(name)) errors.push(`Remove sensitive public variable: ${name}`);
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log('Public client configuration validated. No secret values were printed. This does not verify project availability.');
