'use client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './config';

let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null;

export const supabaseBrowser = () => {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      SUPABASE_CONFIG
    );
  }
  return supabaseInstance;
};

export function createClient() {
  return supabaseBrowser();
}