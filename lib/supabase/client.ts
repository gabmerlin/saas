'use client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getCookieWithDomain, setCookieWithDomain, removeCookieWithDomain } from '@/lib/utils/cookies';

let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null;

export const supabaseBrowser = () => {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true,
          flowType: 'pkce'
          // Configuration simplifiée pour éviter les conflits
        }
      }
    );
  }
  return supabaseInstance;
};

export function createClient() {
  return supabaseBrowser();
}
