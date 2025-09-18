'use client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null;

export const supabaseBrowser = () => {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          // Permettre le partage des cookies entre domaines
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true,
          // Utiliser l'authentification standard au lieu de PKCE
          flowType: 'implicit'
        }
      }
    );
  }
  return supabaseInstance;
};

export function createClient() {
  return supabaseBrowser();
}
