import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
export const isSupabaseConfigured = /^https?:\/\//.test(supabaseUrl) && Boolean(supabaseAnonKey) && !supabaseAnonKey.startsWith('sb_secret_');

// Let the root show a configuration error instead of crashing during module load.
export const supabase = createClient(isSupabaseConfigured ? supabaseUrl : 'http://127.0.0.1:54321', isSupabaseConfigured ? supabaseAnonKey : 'not-configured', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
