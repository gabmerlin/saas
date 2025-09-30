'use client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './config';
import { pkceFix } from '@/lib/auth/pkce-fix';

let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null;

export const supabaseBrowser = () => {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        ...SUPABASE_CONFIG,
        auth: {
          ...SUPABASE_CONFIG.auth,
          flowType: 'pkce' as const
        }
      }
    );

    // Intercepter signInWithOAuth pour gérer PKCE
    const originalSignInWithOAuth = supabaseInstance.auth.signInWithOAuth.bind(supabaseInstance.auth);
    supabaseInstance.auth.signInWithOAuth = async (options: any) => {
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
    const originalExchangeCodeForSession = supabaseInstance.auth.exchangeCodeForSession.bind(supabaseInstance.auth);
    supabaseInstance.auth.exchangeCodeForSession = async (code: string) => {
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
    supabaseInstance.auth.onAuthStateChange((event: any) => {
      if (event === 'SIGNED_OUT') {
        pkceFix.clearCodeVerifier();
      }
    });
  }
  return supabaseInstance;
};

export function createClient() {
  return supabaseBrowser();
}