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
          // Configuration pour partager les cookies entre domaines et sous-domaines
          storage: {
            getItem: (key: string) => {
              if (typeof window !== 'undefined') {
                return localStorage.getItem(key);
              }
              return null;
            },
            setItem: (key: string, value: string) => {
              if (typeof window !== 'undefined') {
                localStorage.setItem(key, value);
                // Aussi stocker dans sessionStorage pour la persistance
                sessionStorage.setItem(key, value);
              }
            },
            removeItem: (key: string) => {
              if (typeof window !== 'undefined') {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
              }
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
