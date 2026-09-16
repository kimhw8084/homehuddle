import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Provider } from '@supabase/supabase-js';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

const redirectTo = Linking.createURL('auth/callback');

export function readableAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (/unexpected token ['\"]?[<>]/i.test(message)) {
    return 'The sign-in service is temporarily unavailable. Please try again in a moment.';
  }
  if (/email rate limit exceeded/i.test(message)) {
    return 'Too many sign-in emails were requested. Wait a few minutes, then try again.';
  }
  return message || 'Unable to sign in. Please try again.';
}

const valueFromUrl = (url: string, name: string) => {
  const query = url.split('?')[1]?.split('#')[0] ?? '';
  const fragment = url.split('#')[1] ?? '';
  return new URLSearchParams(query).get(name) ?? new URLSearchParams(fragment).get(name);
};

export async function signInWithProvider(provider: Extract<Provider, 'apple' | 'google'>) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });

  if (error) throw error;
  if (!data.url) throw new Error('The sign-in provider did not return an authorization URL.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') {
    throw new Error('Sign-in was cancelled.');
  }

  if (!await consumeAuthRedirect(result.url)) {
    throw new Error('The sign-in callback did not include an authorization code.');
  }
}

export async function sendMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: redirectTo },
  });

  if (error) throw error;
}

export async function verifyEmailCode(email: string, code: string) {
  const credentials = {
    email: email.trim().toLowerCase(),
    token: code.trim(),
  } as const;
  const { data: magicLinkData, error: magicLinkError } = await supabase.auth.verifyOtp({ ...credentials, type: 'magiclink' });
  if (!magicLinkError) {
    if (!magicLinkData.session) throw new Error('Sign-in did not complete. Please request a new code.');
    return magicLinkData.session;
  }

  const { data, error } = await supabase.auth.verifyOtp({ ...credentials, type: 'email' });

  if (error) throw error;
  if (!data.session) throw new Error('Sign-in did not complete. Please request a new code.');
  return data.session;
}

// The OS deep-link listener and browser completion can deliver the same callback.
// Share in-flight work, retain successful results briefly, and never log tokens.
const callbacks = new Map<string, { expires: number; result: Promise<boolean> }>();
export async function consumeAuthRedirect(url: string) {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return false; }
  if (!/(^|\/)auth\/callback\/?$/.test(parsed.hostname + parsed.pathname)) return false;
  if (valueFromUrl(url, 'error')) {
    throw new Error('Sign-in was not completed. Please try again.');
  }
  const now = Date.now();
  for (const [key, callback] of callbacks) if (callback.expires <= now) callbacks.delete(key);
  const existing = callbacks.get(url);
  if (existing) return existing.result;
  const result = exchangeRedirect(url).catch((error) => {
    callbacks.delete(url);
    throw error;
  });
  if (callbacks.size >= 20) callbacks.delete(callbacks.keys().next().value!);
  callbacks.set(url, { expires: now + 5 * 60_000, result });
  return result;
}

async function exchangeRedirect(url: string): Promise<boolean> {
  const code = valueFromUrl(url, 'code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return true;
  }

  const accessToken = valueFromUrl(url, 'access_token');
  const refreshToken = valueFromUrl(url, 'refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return true;
  }
  return false;
}
