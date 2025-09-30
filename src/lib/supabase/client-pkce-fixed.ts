'use client';

import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_CONFIG } from '@/lib/supabase/config';
import { pkceFix } from '@/lib/auth/pkce-fix';

/**
 * Client Supabase avec PKCE fixé pour éviter l'erreur 400
 */
export function supabaseBrowserWithPKCEFixed() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    ...SUPABASE_CONFIG,
    auth: {
      ...SUPABASE_CONFIG.auth,
      flowType: 'pkce' as const
    }
  });

  // Intercepter signInWithOAuth pour gérer PKCE
  const originalSignInWithOAuth = supabase.auth.signInWithOAuth.bind(supabase.auth);
  supabase.auth.signInWithOAuth = async (options) => {
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
  const originalExchangeCodeForSession = supabase.auth.exchangeCodeForSession.bind(supabase.auth);
  supabase.auth.exchangeCodeForSession = async (code) => {
    try {
      // Récupérer le code verifier stocké
      const codeVerifier = pkceFix.getCodeVerifier();
      
      if (codeVerifier) {
        // Créer une nouvelle requête avec le code verifier
        const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=pkce`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
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
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      pkceFix.clearCodeVerifier();
    }
  });

  return supabase;
}

export default supabaseBrowserWithPKCEFixed;
