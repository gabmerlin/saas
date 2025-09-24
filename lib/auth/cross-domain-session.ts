'use client';

import { supabaseBrowser } from '@/lib/supabase/client';

/**
 * Système de synchronisation de session cross-domain
 */
export const crossDomainSession = {
  /**
   * Initialise la synchronisation cross-domain
   */
  initialize: () => {
    if (typeof window === 'undefined') return;

    const supabase = supabaseBrowser();
    
    // Écouter les changements de session
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('=== CROSS-DOMAIN SESSION CHANGE ===');
      console.log('Event:', event);
      console.log('Session:', session?.user?.email);
      console.log('Current domain:', window.location.hostname);
      
      if (session) {
        // Sauvegarder la session dans les cookies cross-domain
        crossDomainSession.saveSession(session);
        
        // Notifier les autres onglets/domaines
        crossDomainSession.broadcastSession(session);
      } else {
        // Supprimer la session
        crossDomainSession.clearSession();
        crossDomainSession.broadcastLogout();
      }
    });

    // Écouter les messages de synchronisation
    window.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'SUPABASE_SESSION_UPDATE') {
        console.log('=== RECEIVED SESSION UPDATE ===');
        console.log('Session:', event.data.session?.user?.email);
        
        if (event.data.session) {
          supabase.auth.setSession(event.data.session).catch(console.error);
        } else {
          supabase.auth.signOut().catch(console.error);
        }
      }
    });

    // Écouter les changements de localStorage
    window.addEventListener('storage', (e) => {
      if (e.key?.startsWith('sb-') && e.newValue) {
        try {
          const sessionData = JSON.parse(e.newValue);
          if (sessionData.access_token) {
            supabase.auth.setSession(sessionData).catch(console.error);
          }
        } catch (error) {
          console.error('Error parsing session from storage:', error);
        }
      }
    });

    // Vérifier s'il y a une session existante au chargement
    crossDomainSession.restoreSession();
  },

  /**
   * Sauvegarde la session dans les cookies cross-domain
   */
  saveSession: (session: any) => {
    if (typeof window === 'undefined') return;
    
    try {
      const sessionData = JSON.stringify(session);
      
      // Sauvegarder dans les cookies cross-domain
      const rootDomain = crossDomainSession.getRootDomain();
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
      
      if (rootDomain && rootDomain !== 'localhost') {
        document.cookie = `supabase-session=${sessionData}; expires=${expires}; path=/; domain=${rootDomain}; SameSite=Lax; Secure`;
      } else {
        document.cookie = `supabase-session=${sessionData}; expires=${expires}; path=/; SameSite=Lax`;
      }
      
      // Aussi dans localStorage
      localStorage.setItem('supabase-session', sessionData);
      
      console.log('Session saved to cross-domain cookies');
    } catch (error) {
      console.error('Error saving session:', error);
    }
  },

  /**
   * Restaure la session depuis les cookies
   */
  restoreSession: async () => {
    if (typeof window === 'undefined') return;
    
    try {
      // Essayer de récupérer depuis les cookies
      const cookieValue = crossDomainSession.getCookie('supabase-session');
      if (cookieValue) {
        const session = JSON.parse(cookieValue);
        if (session.access_token) {
          console.log('=== RESTORING SESSION FROM COOKIES ===');
          console.log('User:', session.user?.email);
          
          const supabase = supabaseBrowser();
          await supabase.auth.setSession(session);
          return;
        }
      }
      
      // Fallback vers localStorage
      const storedSession = localStorage.getItem('supabase-session');
      if (storedSession) {
        const session = JSON.parse(storedSession);
        if (session.access_token) {
          console.log('=== RESTORING SESSION FROM LOCALSTORAGE ===');
          console.log('User:', session.user?.email);
          
          const supabase = supabaseBrowser();
          await supabase.auth.setSession(session);
        }
      }
    } catch (error) {
      console.error('Error restoring session:', error);
    }
  },

  /**
   * Supprime la session
   */
  clearSession: () => {
    if (typeof window === 'undefined') return;
    
    try {
      // Supprimer les cookies
      const rootDomain = crossDomainSession.getRootDomain();
      
      if (rootDomain && rootDomain !== 'localhost') {
        document.cookie = `supabase-session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${rootDomain}`;
      }
      document.cookie = `supabase-session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      
      // Supprimer de localStorage
      localStorage.removeItem('supabase-session');
      
      console.log('Session cleared from cross-domain storage');
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  },

  /**
   * Diffuse la session aux autres onglets/domaines
   */
  broadcastSession: (session: any) => {
    if (typeof window === 'undefined') return;
    
    try {
      // Diffuser aux autres onglets
      window.postMessage({
        type: 'SUPABASE_SESSION_UPDATE',
        session: session
      }, window.location.origin);
      
      console.log('Session broadcasted to other tabs');
    } catch (error) {
      console.error('Error broadcasting session:', error);
    }
  },

  /**
   * Diffuse la déconnexion
   */
  broadcastLogout: () => {
    if (typeof window === 'undefined') return;
    
    try {
      window.postMessage({
        type: 'SUPABASE_SESSION_UPDATE',
        session: null
      }, window.location.origin);
      
      console.log('Logout broadcasted to other tabs');
    } catch (error) {
      console.error('Error broadcasting logout:', error);
    }
  },

  /**
   * Obtient le domaine racine
   */
  getRootDomain: (): string => {
    if (typeof window === 'undefined') return '';
    const hostname = window.location.hostname;
    
    // En développement
    if (hostname === 'localhost' || hostname.includes('localhost')) {
      return 'localhost';
    }
    
    // En production, extraire le domaine racine
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return '.' + parts.slice(-2).join('.');
    }
    
    return hostname;
  },

  /**
   * Récupère un cookie
   */
  getCookie: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  }
};
