'use client';

import { createBrowserClient } from '@supabase/ssr';
import { pkceFix } from '@/lib/auth/pkce-fix';

// Instance globale avec fix PKCE intégré
let globalSupabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createGlobalSupabaseClient() {
  if (!globalSupabaseInstance) {
    globalSupabaseInstance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: 'pkce' as const
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

    // Intercepter signInWithOAuth pour gérer PKCE
    const originalSignInWithOAuth = globalSupabaseInstance.auth.signInWithOAuth.bind(globalSupabaseInstance.auth);
    globalSupabaseInstance.auth.signInWithOAuth = async (options: any) => {
      try {
        // Générer et stocker le code verifier
        const codeVerifier = pkceFix.generateCodeVerifier();
        pkceFix.storeCodeVerifier(codeVerifier);
        
        // Générer le code challenge
        const encoder = new TextEncoder();
        const data = encoder.encode(codeVerifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        const codeChallenge = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '');
        
        // Appeler la méthode originale avec le challenge
        return originalSignInWithOAuth({
          ...options,
          options: {
            ...options.options,
            queryParams: {
              ...options.options?.queryParams,
              code_challenge: codeChallenge,
              code_challenge_method: 'S256'
            }
          }
        });
      } catch {
        // En cas d'erreur, utiliser la méthode originale
        return originalSignInWithOAuth(options);
      }
    };

    // Intercepter exchangeCodeForSession pour utiliser le code verifier
    const originalExchangeCodeForSession = globalSupabaseInstance.auth.exchangeCodeForSession.bind(globalSupabaseInstance.auth);
    globalSupabaseInstance.auth.exchangeCodeForSession = async (code: string) => {
      try {
        // Récupérer le code verifier stocké
        const codeVerifier = pkceFix.getCodeVerifier();
        
        if (codeVerifier) {
          // Créer une nouvelle requête avec le code verifier
          const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`
            },
            body: new URLSearchParams({
              code: code,
              code_verifier: codeVerifier
            })
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          
          // Nettoyer le code verifier après utilisation
          pkceFix.clearCodeVerifier();
          
          // Retourner la session
          return {
            data: {
              session: data,
              user: data.user
            },
            error: null
          };
        } else {
          // Fallback vers la méthode originale
          return originalExchangeCodeForSession(code);
        }
      } catch {
        // En cas d'erreur, essayer la méthode originale
        try {
          return originalExchangeCodeForSession(code);
        } catch (fallbackError) {
          throw fallbackError;
        }
      }
    };

    // Listener pour nettoyer le code verifier
    globalSupabaseInstance.auth.onAuthStateChange((event: any) => {
      if (event === 'SIGNED_OUT') {
        pkceFix.clearCodeVerifier();
      }
    });
  }
  
  return globalSupabaseInstance;
}

// Fonctions d'export pour compatibilité
export const supabaseBrowserWithCookies = createGlobalSupabaseClient;
export const supabaseBrowser = createGlobalSupabaseClient;
export const supabaseBrowserWithPKCEFixed = createGlobalSupabaseClient;
