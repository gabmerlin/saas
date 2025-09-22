'use client';

import { supabaseBrowser } from '@/lib/supabase/client';

/**
 * Synchronise la session entre le domaine principal et les sous-domaines
 */
export async function syncSessionToSubdomain(subdomain: string, session: any) {
  if (!session || !subdomain) return false;

  try {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? `https://${subdomain}.qgchatting.com`
      : 'http://localhost:3000'; // En local, rester sur localhost

    // Créer une URL avec les tokens de session
    const sessionUrl = new URL(`${baseUrl}/dashboard`);
    sessionUrl.searchParams.set('access_token', session.access_token);
    sessionUrl.searchParams.set('refresh_token', session.refresh_token);
    sessionUrl.searchParams.set('expires_at', session.expires_at.toString());

    // Rediriger vers le sous-domaine avec les tokens
    window.location.href = sessionUrl.toString();
    return true;
  } catch (error) {
    console.error('Erreur lors de la synchronisation vers le sous-domaine:', error);
    return false;
  }
}

/**
 * Récupère la session depuis les paramètres URL (pour les sous-domaines)
 */
export async function getSessionFromUrl(): Promise<any> {
  if (typeof window === 'undefined') return null;

  const urlParams = new URLSearchParams(window.location.search);
  const accessToken = urlParams.get('access_token');
  const refreshToken = urlParams.get('refresh_token');
  const expiresAt = urlParams.get('expires_at');

  if (accessToken && refreshToken) {
    try {
      const supabase = supabaseBrowser();
      
      // Définir la session avec les tokens de l'URL
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      
      if (error) {
        console.error('Erreur lors de la définition de la session:', error);
        return null;
      }
      
      if (data.session) {
        // Stocker la session
        const sessionData = {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          user: data.session.user
        };
        
        localStorage.setItem('supabase-session', JSON.stringify(sessionData));
        sessionStorage.setItem('supabase-session', JSON.stringify(sessionData));
        
        // Nettoyer l'URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        
        return data.session;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de session depuis URL:', error);
    }
  }
  
  return null;
}

/**
 * Vérifie si une session est valide
 */
export function isSessionValid(session: any): boolean {
  if (!session || !session.expires_at) return false;
  
  const now = new Date();
  const expiresAt = new Date(session.expires_at * 1000);
  
  return expiresAt > now;
}

/**
 * Récupère la session stockée
 */
export function getStoredSession(): any {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem('supabase-session');
    if (stored) {
      const sessionData = JSON.parse(stored);
      if (isSessionValid(sessionData)) {
        return sessionData;
      }
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de la session stockée:', error);
  }
  
  return null;
}

/**
 * Stocke une session
 */
export function storeSession(session: any): void {
  if (typeof window === 'undefined' || !session) return;

  try {
    const sessionData = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      user: session.user
    };
    
    localStorage.setItem('supabase-session', JSON.stringify(sessionData));
    sessionStorage.setItem('supabase-session', JSON.stringify(sessionData));
  } catch (error) {
    console.error('Erreur lors du stockage de la session:', error);
  }
}

/**
 * Supprime la session stockée
 */
export function clearStoredSession(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem('supabase-session');
    sessionStorage.removeItem('supabase-session');
  } catch (error) {
    console.error('Erreur lors de la suppression de la session:', error);
  }
}
