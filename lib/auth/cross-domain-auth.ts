'use client';

import { supabaseBrowser } from '@/lib/supabase/client';
import { storeSession, getStoredSession, clearStoredSession } from '@/lib/utils/cookies';

/**
 * Système de synchronisation de session cross-domain unifié
 */

/**
 * Synchronise la session entre le domaine principal et les sous-domaines
 * en utilisant des cookies partagés
 */
export async function syncSessionAcrossDomains(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const supabase = supabaseBrowser();
    
    // Attendre un peu pour que Supabase traite l'URL OAuth
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Vérifier s'il y a une session active
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      return false;
    }

    if (session) {
      // Stocker la session dans des cookies partagés
      const sessionData = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        user: session.user
      };
      
      storeSession(sessionData);
      return true;
    } else {
      // Essayer de récupérer une session depuis les cookies
      const storedSession = getStoredSession();
      
      if (storedSession) {
        // Vérifier si la session n'est pas expirée
        if (storedSession.expires_at && new Date(storedSession.expires_at * 1000) > new Date()) {
          // Restaurer la session
          const { data, error: setError } = await supabase.auth.setSession({
            access_token: storedSession.access_token,
            refresh_token: storedSession.refresh_token
          });
          
          if (setError) {
            clearStoredSession();
            return false;
          }
          
          if (data.session) {
            return true;
          }
        } else {
          // Session expirée, nettoyer
          clearStoredSession();
        }
      }
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

// Les fonctions clearStoredSession et hasStoredSession sont maintenant dans lib/utils/cookies.ts

/**
 * Redirige vers un sous-domaine avec la session synchronisée
 */
export async function redirectToSubdomain(subdomain: string): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const supabase = supabaseBrowser();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return;
    }

    // Synchroniser la session avant la redirection
    await syncSessionAcrossDomains();
    
    // Construire l'URL du sous-domaine
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? `https://${subdomain}.qgchatting.com`
      : `http://${subdomain}.localhost:3000`;

    // Rediriger vers le sous-domaine
    window.location.href = `${baseUrl}/dashboard`;
  } catch (error) {
    // Erreur silencieuse
  }
}

/**
 * Initialise la synchronisation de session au chargement de la page
 */
export async function initializeSessionSync(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  // Attendre un peu que Supabase soit prêt
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Synchroniser la session
  await syncSessionAcrossDomains();
}
