// lib/auth/force-session-sync.ts
'use client';

import { supabaseBrowser } from '@/lib/supabase/client';

/**
 * Force la synchronisation de session en utilisant les paramètres URL
 */
export function forceSessionSyncFromUrl() {
  if (typeof window === 'undefined') return;

  const urlParams = new URLSearchParams(window.location.search);
  const accessToken = urlParams.get('access_token');
  const refreshToken = urlParams.get('refresh_token');

  if (accessToken && refreshToken) {
    const supabase = supabaseBrowser();
    
    // Définir la session avec les tokens de l'URL
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    }).then(({ data, error }) => {
      if (error) {
        console.error('Erreur lors de la définition de la session:', error);
      } else if (data.session) {
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
        
        console.log('Session forcée depuis l\'URL');
      }
    });
  }
}

/**
 * Vérifie si la session est valide et non expirée
 */
export function isSessionValid(session: any): boolean {
  if (!session || !session.expires_at) return false;
  
  const now = new Date();
  const expiresAt = new Date(session.expires_at * 1000);
  
  return expiresAt > now;
}
