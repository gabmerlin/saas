'use client';

import { supabaseBrowser } from '@/lib/supabase/client';

/**
 * Synchronisation de session simple sans boucle infinie
 */
export const simpleSessionSync = {
  initialize: () => {
    if (typeof window === 'undefined') return;

    console.log('=== INITIALIZING SIMPLE SESSION SYNC ===');
    console.log('Current domain:', window.location.hostname);

    // Écouter les changements d'état d'authentification de Supabase
    supabaseBrowser().auth.onAuthStateChange((event, session) => {
      console.log('=== SIMPLE SESSION CHANGE ===');
      console.log('Event:', event);
      console.log('Session:', session?.user?.email);
      console.log('Current domain:', window.location.hostname);

      if (event === 'SIGNED_IN' && session) {
        // Stocker la session dans localStorage pour la persistance
        localStorage.setItem('supabase_session', JSON.stringify(session));
        console.log('Session stored in localStorage');
      } else if (event === 'SIGNED_OUT') {
        // Supprimer la session du localStorage
        localStorage.removeItem('supabase_session');
        console.log('Session removed from localStorage');
      }
    });

    // Tenter de restaurer la session au démarrage
    simpleSessionSync.restoreSession();
  },

  // Tente de restaurer la session au chargement de la page
  restoreSession: async () => {
    if (typeof window === 'undefined') return;
    
    console.log('Attempting to restore session...');
    const storedSession = localStorage.getItem('supabase_session');
    
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession);
        console.log('Restoring session from localStorage:', session.user?.email);
        
        // Vérifier si la session est encore valide
        const { data: { session: currentSession } } = await supabaseBrowser().auth.getSession();
        
        if (!currentSession && session) {
          // Restaurer la session si elle n'est pas active
          await supabaseBrowser().auth.setSession(session);
        }
      } catch (error) {
        console.error('Error restoring session:', error);
        localStorage.removeItem('supabase_session');
      }
    } else {
      console.log('No session found in localStorage');
    }
  },

  // Obtenir la session stockée
  getStoredSession: () => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('supabase_session');
    return stored ? JSON.parse(stored) : null;
  },

  // Nettoyer la session stockée
  clearStoredSession: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('supabase_session');
    console.log('Stored session cleared');
  }
};
