'use client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null;

// Fonction pour gérer les cookies cross-domain
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

const setCookie = (name: string, value: string, days: number = 7) => {
  if (typeof document === 'undefined') return;
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  
  // Définir le cookie pour le domaine principal et les sous-domaines
  const domain = window.location.hostname === 'localhost' 
    ? 'localhost' 
    : '.qgchatting.com';
    
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;domain=${domain};SameSite=Lax;Secure=${window.location.protocol === 'https:'}`;
};

const removeCookie = (name: string) => {
  if (typeof document === 'undefined') return;
  const domain = window.location.hostname === 'localhost' 
    ? 'localhost' 
    : '.qgchatting.com';
    
  // Supprimer le cookie pour le domaine actuel
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  
  // Supprimer le cookie pour le domaine parent (cross-domain)
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${domain}`;
  
  // Supprimer aussi sans domaine spécifique
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${domain}`;
};

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
          // Configuration de storage pour la persistance cross-domain
          storage: {
            getItem: (key: string) => {
              if (typeof window === 'undefined') return null;
              
              // Essayer d'abord les cookies pour la synchronisation cross-domain
              if (key.includes('session')) {
                const cookieValue = getCookie(`supabase_${key}`);
                if (cookieValue) {
                  return cookieValue;
                }
              }
              
              // Fallback sur localStorage
              return localStorage.getItem(key);
            },
            setItem: (key: string, value: string) => {
              if (typeof window === 'undefined') return;
              
              // Stocker dans localStorage
              localStorage.setItem(key, value);
              
              // Stocker aussi dans les cookies pour la synchronisation cross-domain
              if (key.includes('session')) {
                setCookie(`supabase_${key}`, value, 7);
              }
            },
            removeItem: (key: string) => {
              if (typeof window === 'undefined') return;
              
              // Supprimer de localStorage
              localStorage.removeItem(key);
              
              // Supprimer aussi des cookies
              if (key.includes('session')) {
                removeCookie(`supabase_${key}`);
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
