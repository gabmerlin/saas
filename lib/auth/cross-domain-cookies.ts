'use client';

import { supabaseBrowser } from '@/lib/supabase/client';

/**
 * Gestion des cookies cross-domain pour la session
 */
export const crossDomainCookies = {
  // Nom du cookie pour la session
  SESSION_COOKIE_NAME: 'qg_session',
  
  // Obtenir le domaine racine
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

  // Stocker la session dans un cookie cross-domain
  setSession: (session: any) => {
    if (typeof window === 'undefined') return;
    
    try {
      const sessionString = JSON.stringify(session);
      const rootDomain = crossDomainCookies.getRootDomain();
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString(); // 7 jours
      
      // Cookie pour le domaine racine (accessible par tous les sous-domaines)
      let cookieString = `${crossDomainCookies.SESSION_COOKIE_NAME}=${encodeURIComponent(sessionString)}; expires=${expires}; path=/; SameSite=Lax`;
      
      if (rootDomain && rootDomain !== 'localhost') {
        cookieString += `; domain=${rootDomain}`;
      }
      
      document.cookie = cookieString;
      console.log('Session stored in cross-domain cookie');
    } catch (error) {
      console.error('Error setting cross-domain session:', error);
    }
  },

  // Récupérer la session depuis le cookie cross-domain
  getSession: (): any | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${crossDomainCookies.SESSION_COOKIE_NAME}=`));
      
      if (cookieValue) {
        const sessionString = decodeURIComponent(cookieValue.split('=')[1]);
        return JSON.parse(sessionString);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting cross-domain session:', error);
      return null;
    }
  },

  // Supprimer la session du cookie cross-domain
  clearSession: () => {
    if (typeof window === 'undefined') return;
    
    try {
      const rootDomain = crossDomainCookies.getRootDomain();
      let cookieString = `${crossDomainCookies.SESSION_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
      
      if (rootDomain && rootDomain !== 'localhost') {
        cookieString += `; domain=${rootDomain}`;
      }
      
      document.cookie = cookieString;
      console.log('Session cleared from cross-domain cookie');
    } catch (error) {
      console.error('Error clearing cross-domain session:', error);
    }
  },

  // Initialiser la synchronisation cross-domain
  initialize: () => {
    if (typeof window === 'undefined') return;

    console.log('=== INITIALIZING CROSS-DOMAIN COOKIES ===');
    console.log('Current domain:', window.location.hostname);
    console.log('Root domain:', crossDomainCookies.getRootDomain());

    // Écouter les changements d'état d'authentification de Supabase
    supabaseBrowser().auth.onAuthStateChange((event, session) => {
      console.log('=== CROSS-DOMAIN COOKIE CHANGE ===');
      console.log('Event:', event);
      console.log('Session:', session?.user?.email);
      console.log('Current domain:', window.location.hostname);

      if (event === 'SIGNED_IN' && session) {
        // Stocker la session dans le cookie cross-domain
        crossDomainCookies.setSession(session);
        // Aussi dans localStorage comme fallback
        localStorage.setItem('supabase_session', JSON.stringify(session));
      } else if (event === 'SIGNED_OUT') {
        // Supprimer la session du cookie cross-domain
        crossDomainCookies.clearSession();
        // Aussi du localStorage
        localStorage.removeItem('supabase_session');
      }
    });

    // Tenter de restaurer la session au démarrage
    crossDomainCookies.restoreSession();
  },

  // Tenter de restaurer la session au chargement de la page
  restoreSession: async () => {
    if (typeof window === 'undefined') return;
    
    console.log('Attempting to restore session from cross-domain cookie...');
    
    // Essayer d'abord le cookie cross-domain
    const cookieSession = crossDomainCookies.getSession();
    if (cookieSession) {
      console.log('Restoring session from cross-domain cookie:', cookieSession.user?.email);
      try {
        await supabaseBrowser().auth.setSession(cookieSession);
        return;
      } catch (error) {
        console.error('Error restoring session from cookie:', error);
      }
    }
    
    // Fallback vers localStorage
    const storedSession = localStorage.getItem('supabase_session');
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession);
        console.log('Restoring session from localStorage:', session.user?.email);
        await supabaseBrowser().auth.setSession(session);
        // Stocker aussi dans le cookie cross-domain
        crossDomainCookies.setSession(session);
      } catch (error) {
        console.error('Error restoring session from localStorage:', error);
      }
    } else {
      console.log('No session found in cross-domain cookie or localStorage');
    }
  }
};
