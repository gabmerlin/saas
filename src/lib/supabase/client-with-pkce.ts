'use client';

import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_CONFIG } from '@/lib/supabase/config';
import { pkceCrossDomainManager } from '@/lib/auth/pkce-cross-domain';

/**
 * Client Supabase avec gestion PKCE cross-domain améliorée
 */
export function supabaseBrowserWithPKCE() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    ...SUPABASE_CONFIG,
    auth: {
      ...SUPABASE_CONFIG.auth,
      // Désactiver la gestion automatique PKCE pour la gérer manuellement
      flowType: 'pkce' as const,
      // Hook personnalisé pour la gestion PKCE
      async onAuthStateChange(event, session) {
        if (event === 'SIGNED_IN' && session) {
          // Synchroniser le code verifier après connexion réussie
          pkceCrossDomainManager.syncCodeVerifierAcrossDomains();
        } else if (event === 'SIGNED_OUT') {
          // Nettoyer le code verifier après déconnexion
          pkceCrossDomainManager.clearStoredCodeVerifier();
        }
      }
    }
  });

  // Intercepter les appels d'authentification pour gérer PKCE
  const originalSignInWithOAuth = supabase.auth.signInWithOAuth.bind(supabase.auth);
  supabase.auth.signInWithOAuth = async (options) => {
    try {
      // Générer et stocker le code verifier
      const codeVerifier = pkceCrossDomainManager.generateCodeVerifier();
      const codeChallenge = await pkceCrossDomainManager.generateCodeChallenge(codeVerifier);
      
      // Stocker pour synchronisation cross-domain
      pkceCrossDomainManager.storeCodeVerifier(codeVerifier);
      
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
    } catch (error) {
      // En cas d'erreur, utiliser la méthode originale
      return originalSignInWithOAuth(options);
    }
  };

  // Intercepter l'échange de code pour session
  const originalExchangeCodeForSession = supabase.auth.exchangeCodeForSession.bind(supabase.auth);
  supabase.auth.exchangeCodeForSession = async (code) => {
    try {
      // Récupérer le code verifier stocké
      const codeVerifier = pkceCrossDomainManager.getStoredCodeVerifier();
      
      if (codeVerifier) {
        // Utiliser le code verifier pour l'échange
        return originalExchangeCodeForSession(code, {
          code_verifier: codeVerifier
        });
      } else {
        // Essayer sans code verifier (fallback)
        return originalExchangeCodeForSession(code);
      }
    } catch (error) {
      // En cas d'erreur, essayer sans code verifier
      try {
        return originalExchangeCodeForSession(code);
      } catch (fallbackError) {
        throw fallbackError;
      }
    }
  };

  return supabase;
}

export default supabaseBrowserWithPKCE;
