/**
 * Synchronisation cross-domain améliorée
 */
'use client';

import type { Session } from '@supabase/supabase-js';

const SESSION_COOKIE_NAME = 'qg_session';
const STORAGE_KEY = 'supabase_session';

export const crossDomainSync = {
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

  // Stocker la session dans tous les systèmes de stockage
  setSession: (session: Session) => {
    if (typeof window === 'undefined') return;
    
    try {
      const sessionString = JSON.stringify(session);
      
      // 1. Stocker dans localStorage (persistant)
      localStorage.setItem(STORAGE_KEY, sessionString);
      
      // 2. Stocker dans sessionStorage (pour la cohérence)
      sessionStorage.setItem(STORAGE_KEY, sessionString);
      
      // 3. Stocker dans un cookie cross-domain
      const rootDomain = crossDomainSync.getRootDomain();
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString(); // 7 jours
      
      let cookieString = `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionString)}; expires=${expires}; path=/; SameSite=Lax`;
      
      if (rootDomain && rootDomain !== 'localhost') {
        cookieString += `; domain=${rootDomain}`;
      }
      
      document.cookie = cookieString;
      
      // 4. Synchroniser avec les autres onglets/fenêtres
      crossDomainSync.broadcastSession(session);
      
    } catch (error) {
    }
  },

  // Récupérer la session depuis tous les systèmes de stockage
  getSession: (): Session | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      // 1. Essayer sessionStorage d'abord (pour le PKCE)
      let sessionString = sessionStorage.getItem(STORAGE_KEY);
      
      // 2. Fallback vers localStorage
      if (!sessionString) {
        sessionString = localStorage.getItem(STORAGE_KEY);
      }
      
      // 3. Fallback vers cookie cross-domain
      if (!sessionString) {
        const cookieValue = document.cookie
          .split('; ')
          .find(row => row.startsWith(`${SESSION_COOKIE_NAME}=`));
        
        if (cookieValue) {
          sessionString = decodeURIComponent(cookieValue.split('=')[1]);
        }
      }
      
      if (sessionString) {
        const session = JSON.parse(sessionString);
        // Synchroniser avec les autres stockages
        crossDomainSync.setSession(session);
        return session;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  },

  // Supprimer la session de tous les systèmes de stockage
  clearSession: () => {
    if (typeof window === 'undefined') return;
    
    try {
      // 1. Nettoyer localStorage
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('supabase.auth.refresh_token');
      
      // 2. Nettoyer sessionStorage
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem('supabase.auth.token');
      sessionStorage.removeItem('supabase.auth.refresh_token');
      
      // 3. Nettoyer cookie cross-domain
      const rootDomain = crossDomainSync.getRootDomain();
      let cookieString = `${SESSION_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
      
      if (rootDomain && rootDomain !== 'localhost') {
        cookieString += `; domain=${rootDomain}`;
      }
      
      document.cookie = cookieString;
      
      // 4. Notifier les autres onglets/fenêtres
      crossDomainSync.broadcastClear();
      
    } catch (error) {
    }
  },

  // Diffuser la session aux autres onglets/fenêtres
  broadcastSession: (session: Session) => {
    if (typeof window === 'undefined') return;
    
    try {
      // Utiliser postMessage pour synchroniser entre onglets
      window.postMessage({
        type: 'SESSION_SYNC',
        session: session
      }, '*');
    } catch (error) {
    }
  },

  // Diffuser la suppression de session
  broadcastClear: () => {
    if (typeof window === 'undefined') return;
    
    try {
      window.postMessage({
        type: 'SESSION_CLEAR'
      }, '*');
    } catch (error) {
    }
  },

  // Écouter les messages de synchronisation
  listenForSync: (callback: (session: Session | null) => void) => {
    if (typeof window === 'undefined') return () => {};
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SESSION_SYNC') {
        callback(event.data.session);
      } else if (event.data?.type === 'SESSION_CLEAR') {
        callback(null);
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => window.removeEventListener('message', handleMessage);
  }
};

// Alias pour la compatibilité
export const crossDomainCookies = crossDomainSync;

// Hook pour la synchronisation cross-domain
export function useCrossDomainSessionSync() {
  // Cette fonction sera implémentée dans le composant
  return null;
}

// Fonction pour synchroniser la session avec Supabase
export async function syncSessionWithSupabase() {
  const session = crossDomainSync.getSession();
  return session;
}