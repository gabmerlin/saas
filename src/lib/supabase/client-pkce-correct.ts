'use client';

import { createBrowserClient } from '@supabase/ssr';

// Client qui utilise PKCE correctement avec les bons paramètres
let pkceCorrectInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createPKCECorrectClient() {
  if (!pkceCorrectInstance) {
    // Créer le client avec configuration PKCE correcte
    pkceCorrectInstance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: 'pkce' as const,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          debug: false
        },
        cookies: {
          get(name: string) {
            if (typeof window !== 'undefined') {
              return document.cookie
                .split('; ')
                .find(row => row.startsWith(`${name}=`))
                ?.split('=')[1] || undefined;
            }
            return undefined;
          },
          set(name: string, value: string, options: any) {
            if (typeof window !== 'undefined') {
              const cookieString = `${name}=${value}; domain=.qgchatting.com; path=/; ${
                process.env.NODE_ENV === "production" ? "secure; " : ""
              }samesite=lax; max-age=${options?.maxAge || 60 * 60 * 24 * 7}`;
              document.cookie = cookieString;
            }
          },
          remove(name: string, options: any) {
            if (typeof window !== 'undefined') {
              document.cookie = `${name}=; domain=.qgchatting.com; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
            }
          },
        },
      }
    );

    // Intercepter signInWithOAuth pour utiliser les bons paramètres PKCE
    const originalSignInWithOAuth = pkceCorrectInstance.auth.signInWithOAuth.bind(pkceCorrectInstance.auth);
    pkceCorrectInstance.auth.signInWithOAuth = async (options: any) => {
      // Utiliser les paramètres PKCE corrects
      const pkceOptions = {
        ...options,
        options: {
          ...options.options,
          queryParams: {
            ...options.options?.queryParams,
            // Paramètres PKCE corrects pour Google OAuth
            response_type: 'code',
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      };

      return originalSignInWithOAuth(pkceOptions);
    };

    // Intercepter exchangeCodeForSession pour gérer PKCE correctement
    const originalExchangeCodeForSession = pkceCorrectInstance.auth.exchangeCodeForSession.bind(pkceCorrectInstance.auth);
    pkceCorrectInstance.auth.exchangeCodeForSession = async (code: string) => {
      try {
        // Utiliser la méthode originale qui gère PKCE automatiquement
        return await originalExchangeCodeForSession(code);
      } catch (error) {
        console.error('Erreur exchangeCodeForSession:', error);
        throw error;
      }
    };
  }
  
  return pkceCorrectInstance;
}

// Exports pour compatibilité
export const supabasePKCECorrect = createPKCECorrectClient;
export const supabaseBrowserWithCookies = createPKCECorrectClient;
export const supabaseBrowser = createPKCECorrectClient;
export const supabaseBrowserWithPKCEFixed = createPKCECorrectClient;
