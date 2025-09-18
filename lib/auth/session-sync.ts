// lib/auth/session-sync.ts
'use client';

import { supabaseBrowser } from '@/lib/supabase/client';

/**
 * Synchronise la session entre le domaine principal et les sous-domaines
 */
export async function syncSessionAcrossDomains() {
  if (typeof window === 'undefined') return;

  try {
    const supabase = supabaseBrowser();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Erreur lors de la récupération de la session:', error);
      return;
    }

    if (session) {
      // Stocker la session dans localStorage pour qu'elle soit accessible sur tous les domaines
      const sessionData = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        user: session.user
      };
      
      localStorage.setItem('supabase-session', JSON.stringify(sessionData));
      sessionStorage.setItem('supabase-session', JSON.stringify(sessionData));
      
      console.log('Session synchronisée entre domaines');
    } else {
      // Vérifier s'il y a une session stockée
      const storedSession = localStorage.getItem('supabase-session') || sessionStorage.getItem('supabase-session');
      
      if (storedSession) {
        try {
          const sessionData = JSON.parse(storedSession);
          
          // Restaurer la session
          await supabase.auth.setSession({
            access_token: sessionData.access_token,
            refresh_token: sessionData.refresh_token
          });
          
          console.log('Session restaurée depuis le stockage local');
        } catch (parseError) {
          console.error('Erreur lors du parsing de la session stockée:', parseError);
          // Nettoyer les données corrompues
          localStorage.removeItem('supabase-session');
          sessionStorage.removeItem('supabase-session');
        }
      }
    }
  } catch (error) {
    console.error('Erreur lors de la synchronisation de session:', error);
  }
}

/**
 * Nettoie la session stockée
 */
export function clearStoredSession() {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('supabase-session');
  sessionStorage.removeItem('supabase-session');
}

/**
 * Vérifie si une session est disponible (stockée ou active)
 */
export function hasStoredSession(): boolean {
  if (typeof window === 'undefined') return false;
  
  const storedSession = localStorage.getItem('supabase-session') || sessionStorage.getItem('supabase-session');
  return !!storedSession;
}
