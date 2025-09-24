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
          storage: {
            getItem: (key: string) => {
              if (typeof window === 'undefined') return null;
              try {
                return localStorage.getItem(key);
              } catch {
                return null;
              }
            },
            setItem: (key: string, value: string) => {
              if (typeof window === 'undefined') return;
              try {
                localStorage.setItem(key, value);
              } catch {
                // Ignore storage errors
              }
            },
            removeItem: (key: string) => {
              if (typeof window === 'undefined') return;
              try {
                localStorage.removeItem(key);
              } catch {
                // Ignore storage errors
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