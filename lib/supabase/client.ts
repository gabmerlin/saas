'use client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null;

// Fonction pour obtenir le domaine racine
function getRootDomain(): string {
  if (typeof window === 'undefined') return '.qgchatting.com';
  
  const hostname = window.location.hostname;
  
  // En développement
  if (hostname === 'localhost' || hostname.includes('localhost')) {
    return 'localhost';
  }
  
  // En production, extraire le domaine racine
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    return `.${parts.slice(-2).join('.')}`;
  }
  
  return '.qgchatting.com';
}

// Fonction pour configurer les cookies avec le bon domaine
function setCookieWithDomain(name: string, value: string, days: number = 30) {
  if (typeof window === 'undefined') return;
  
  const domain = getRootDomain();
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};domain=${domain};path=/;SameSite=Lax;Secure=${window.location.protocol === 'https:'}`;
}

function getCookieWithDomain(name: string): string | null {
  if (typeof window === 'undefined') return null;
  
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  
  return null;
}

function removeCookieWithDomain(name: string) {
  if (typeof window === 'undefined') return;
  
  const domain = getRootDomain();
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;domain=${domain};path=/`;
}

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
              
              // Ensuite essayer les cookies avec domaine
              const cookieValue = getCookieWithDomain(`sb-${key}`);
              if (cookieValue) {
                return cookieValue;
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
