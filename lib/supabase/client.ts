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
          flowType: 'pkce',
          // Configuration pour partager les cookies entre domaines et sous-domaines
          storage: {
            getItem: (key: string) => {
              if (typeof window === 'undefined') return null;
              
              // D'abord essayer localStorage (où la session est stockée)
              const localStorageValue = localStorage.getItem(key);
              if (localStorageValue) {
                return localStorageValue;
              }
              
              // Ensuite essayer les cookies avec fallback
              const cookieValue = getCookieWithDomain(`sb-${key}`);
              if (cookieValue) {
                return cookieValue;
              }
              
              // Fallback: essayer de récupérer sans préfixe sb-
              const fallbackCookie = getCookieWithDomain(key);
              if (fallbackCookie) {
                return fallbackCookie;
              }
              
              return null;
            },
            setItem: (key: string, value: string) => {
              if (typeof window === 'undefined') return;
              
              // Stocker dans les cookies avec le bon domaine pour le partage cross-domain
              setCookieWithDomain(`sb-${key}`, value, 30);
              
              // Aussi stocker dans localStorage comme fallback
              localStorage.setItem(key, value);
              sessionStorage.setItem(key, value);
            },
            removeItem: (key: string) => {
              if (typeof window === 'undefined') return;
              
              // Supprimer des cookies avec domaine
              removeCookieWithDomain(`sb-${key}`);
              
              // Aussi supprimer de localStorage
              localStorage.removeItem(key);
              sessionStorage.removeItem(key);
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
