// lib/auth/force-session-sync.ts
'use client';

import { supabaseBrowser } from '@/lib/supabase/client';

/**
 * Force la synchronisation de session en utilisant les paramètres URL
 */
export async function forceSessionSyncFromUrl(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const urlParams = new URLSearchParams(window.location.search);
  const accessToken = urlParams.get('access_token');
  const refreshToken = urlParams.get('refresh_token');
  const expiresAt = urlParams.get('expires_at');

  console.log('🔍 Vérification des tokens URL:', { 
    hasAccessToken: !!accessToken, 
    hasRefreshToken: !!refreshToken, 
    hasExpiresAt: !!expiresAt 
  });

  if (accessToken && refreshToken) {
    try {
      const supabase = supabaseBrowser();
      
      console.log('🔄 Tentative de définition de la session...');
      
      // Définir la session avec les tokens de l'URL
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      
      if (error) {
        console.error('❌ Erreur lors de la définition de la session:', error);
        return false;
      }
      
      console.log('✅ Session définie:', { 
        hasSession: !!data.session, 
        hasUser: !!data.session?.user,
        userEmail: data.session?.user?.email 
      });
      
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
        
        console.log('✅ Session forcée depuis l\'URL avec succès');
        return true;
      } else {
        console.warn('⚠️ Aucune session retournée par setSession');
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation forcée:', error);
      return false;
    }
  } else {
    console.log('ℹ️ Aucun token trouvé dans l\'URL');
  }
  
  return false;
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
