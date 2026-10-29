import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

export const supabaseConfigured = Boolean(
  url &&
  key &&
  /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co\/?$/.test(url)
);

const authOptions = {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  flowType: 'pkce' as const,
  // On Web, Supabase uses browser localStorage by default. On native, use AsyncStorage.
  ...(Platform.OS === 'web' ? {} : { storage: AsyncStorage }),
};

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder',
  { auth: authOptions }
);
