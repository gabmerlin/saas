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
                // Essayer d'abord sessionStorage pour le PKCE
                const sessionValue = sessionStorage.getItem(key);
                if (sessionValue) return sessionValue;
                
                // Fallback vers localStorage
                return localStorage.getItem(key);
              } catch {
                return null;
              }
            },
            setItem: (key: string, value: string) => {
              if (typeof window === 'undefined') return;
              try {
                // Stocker dans sessionStorage pour le PKCE (plus sûr)
                sessionStorage.setItem(key, value);
                // Aussi dans localStorage pour la persistance
                localStorage.setItem(key, value);
              } catch {
                // Ignore storage errors
              }
            },
            removeItem: (key: string) => {
              if (typeof window === 'undefined') return;
              try {
                // Supprimer des deux
                sessionStorage.removeItem(key);
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