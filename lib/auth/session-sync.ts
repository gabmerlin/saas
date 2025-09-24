'use client';

import { supabaseBrowser } from '@/lib/supabase/client';

/**
 * Système de synchronisation de session simplifié
 */
export const sessionSync = {
  initialize: () => {
    if (typeof window === 'undefined') return;

    // Écouter les changements de session de Supabase
    supabaseBrowser().auth.onAuthStateChange((event, session) => {
      if (session) {
        localStorage.setItem('supabase_session', JSON.stringify(session));
      } else {
        localStorage.removeItem('supabase_session');
      }
    });

    // Écouter les changements de localStorage pour synchroniser entre onglets
    window.addEventListener('storage', (e) => {
      if (e.key === 'supabase_session' && e.newValue) {
        const newSession = JSON.parse(e.newValue);
        supabaseBrowser().auth.setSession(newSession).catch(console.error);
      } else if (e.key === 'supabase_session' && !e.newValue) {
        supabaseBrowser().auth.signOut().catch(console.error);
      }
    });
  },

  getStoredSession: () => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('supabase_session');
    return stored ? JSON.parse(stored) : null;
  },
};