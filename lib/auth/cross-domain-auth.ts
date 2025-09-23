'use client';

import { supabaseBrowser } from '@/lib/supabase/client';

/**
 * Système de synchronisation de session cross-domain amélioré
 */

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

/**
 * Synchronise la session entre le domaine principal et les sous-domaines
 * en utilisant des cookies partagés
 */
export async function syncSessionAcrossDomains(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const supabase = supabaseBrowser();
    
    // Attendre un peu pour que Supabase traite l'URL OAuth
    await new Promise(resolve => setTimeout(resolve, 100));
    
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
      
      setCookieWithDomain('qg-session', JSON.stringify(sessionData), 30);
      return true;
    } else {
      // Essayer de récupérer une session depuis les cookies
      const storedSession = getCookieWithDomain('qg-session');
      
      if (storedSession) {
        try {
          const sessionData = JSON.parse(storedSession);
          
          // Vérifier si la session n'est pas expirée
          if (sessionData.expires_at && new Date(sessionData.expires_at * 1000) > new Date()) {
            // Restaurer la session
            const { data, error: setError } = await supabase.auth.setSession({
              access_token: sessionData.access_token,
              refresh_token: sessionData.refresh_token
            });
            
            if (setError) {
              removeCookieWithDomain('qg-session');
              return false;
            }
            
            if (data.session) {
              return true;
            }
          } else {
            // Session expirée, nettoyer
            removeCookieWithDomain('qg-session');
          }
        } catch (parseError) {
          removeCookieWithDomain('qg-session');
        }
      }
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Nettoie la session stockée
 */
export function clearStoredSession(): void {
  if (typeof window === 'undefined') return;
  
  removeCookieWithDomain('qg-session');
  localStorage.removeItem('supabase-session');
  sessionStorage.removeItem('supabase-session');
}

/**
 * Vérifie si une session est disponible
 */
export function hasStoredSession(): boolean {
  if (typeof window === 'undefined') return false;
  
  const storedSession = getCookieWithDomain('qg-session');
  return !!storedSession;
}

/**
 * Redirige vers un sous-domaine avec la session synchronisée
 */
export async function redirectToSubdomain(subdomain: string): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const supabase = supabaseBrowser();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('❌ Aucune session active pour la redirection');
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
    console.error('❌ Erreur lors de la redirection vers le sous-domaine:', error);
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
