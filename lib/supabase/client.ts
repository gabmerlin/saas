'use client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const supabaseBrowser = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      // Permettre le partage des cookies entre domaines
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
      // Configuration pour les subdomains
      flowType: 'pkce'
    }
  }
);

export function createClient() {
  return supabaseBrowser;
}
