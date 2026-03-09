import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = 
  !!rawUrl && 
  rawUrl.startsWith('https://') && 
  !!rawKey && 
  rawKey.length > 10;

const supabaseUrl = isSupabaseConfigured ? rawUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = isSupabaseConfigured ? rawKey : 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
