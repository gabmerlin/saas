'use client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const supabaseBrowser = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function createClient() {
  return supabaseBrowser;
}
