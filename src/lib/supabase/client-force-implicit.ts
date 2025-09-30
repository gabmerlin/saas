'use client';

import { createBrowserClient } from '@supabase/ssr';

// Client qui force le flow implicit et désactive complètement PKCE
let forceImplicitInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createForceImplicitClient() {
  if (!forceImplicitInstance) {
    // Créer le client avec configuration forcée implicit
    forceImplicitInstance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: 'implicit' as const,
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

    // Intercepter signInWithOAuth pour forcer le flow implicit
    const originalSignInWithOAuth = forceImplicitInstance.auth.signInWithOAuth.bind(forceImplicitInstance.auth);
    forceImplicitInstance.auth.signInWithOAuth = async (options: any) => {
      // Forcer l'utilisation du flow implicit en supprimant tous les paramètres PKCE
      const implicitOptions = {
        ...options,
        options: {
          ...options.options,
          queryParams: {
            ...options.options?.queryParams,
            // Supprimer tous les paramètres PKCE
            code_challenge: undefined,
            code_challenge_method: undefined,
            code_verifier: undefined,
            // Forcer le flow implicit
            response_type: 'token'
          }
        }
      };

      // Nettoyer les options pour supprimer les propriétés undefined
      if (implicitOptions.options?.queryParams) {
        Object.keys(implicitOptions.options.queryParams).forEach(key => {
          if (implicitOptions.options.queryParams[key] === undefined) {
            delete implicitOptions.options.queryParams[key];
          }
        });
      }

      return originalSignInWithOAuth(implicitOptions);
    };

    // Intercepter exchangeCodeForSession pour éviter l'erreur PKCE
    const originalExchangeCodeForSession = forceImplicitInstance.auth.exchangeCodeForSession.bind(forceImplicitInstance.auth);
    forceImplicitInstance.auth.exchangeCodeForSession = async (code: string) => {
      // Avec le flow implicit, cette méthode ne devrait pas être appelée
      // Mais au cas où, on fait un fallback vers la méthode originale
      console.warn('exchangeCodeForSession appelé avec flow implicit - fallback vers méthode originale');
      return originalExchangeCodeForSession(code);
    };
  }
  
  return forceImplicitInstance;
}

// Exports pour compatibilité
export const supabaseForceImplicit = createForceImplicitClient;
export const supabaseBrowserWithCookies = createForceImplicitClient;
export const supabaseBrowser = createForceImplicitClient;
export const supabaseBrowserWithPKCEFixed = createForceImplicitClient;
