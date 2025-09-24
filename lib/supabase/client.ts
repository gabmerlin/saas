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
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true,
          flowType: 'pkce',
          // Configuration de storage pour la persistance des sessions
          storage: {
            getItem: (key: string) => {
              if (typeof window === 'undefined') return null;
              return localStorage.getItem(key);
            },
            setItem: (key: string, value: string) => {
              if (typeof window === 'undefined') return;
              localStorage.setItem(key, value);
            },
            removeItem: (key: string) => {
              if (typeof window === 'undefined') return;
              localStorage.removeItem(key);
            }
          }
        }
      }
    );
  }
  return supabaseInstance;
};

export function createClient() {
  return supabaseBrowser();
}
