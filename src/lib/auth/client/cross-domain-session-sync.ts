/**
 * Synchronisation automatique des sessions cross-domain
 */
'use client';

import { supabaseBrowserWithCookies } from '@/lib/supabase/client-with-cookies';

export class CrossDomainSessionSync {
  private static instance: CrossDomainSessionSync;
  private isInitialized = false;

  static getInstance(): CrossDomainSessionSync {
    if (!CrossDomainSessionSync.instance) {
      CrossDomainSessionSync.instance = new CrossDomainSessionSync();
    }
    return CrossDomainSessionSync.instance;
  }

  /**
   * Initialise la synchronisation cross-domain
   */
  async initialize() {
    if (this.isInitialized || typeof window === 'undefined') return;
    
    this.isInitialized = true;
    
    const supabase = supabaseBrowserWithCookies();
    
    // Écouter les changements d'état d'authentification
    supabase.auth.onAuthStateChange(async (event, session) => {
      // Vérifier si un paiement est en cours
      const isPaymentInProgress = () => {
        if (typeof window === 'undefined') return false;
        
        // Vérifier les paramètres URL
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('payment') === 'processing') return true;
        
        // Vérifier le localStorage
        return localStorage.getItem('paymentInProgress') === 'true';
      };

      if (event === 'SIGNED_IN' && session) {
        await this.syncSessionToAllDomains(session);
      } else if (event === 'SIGNED_OUT' && !isPaymentInProgress()) {
        // Ne pas nettoyer la session si un paiement est en cours
        await this.clearSessionFromAllDomains();
      }
    });
    
    // Vérifier s'il y a déjà une session et la synchroniser
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await this.syncSessionToAllDomains(session);
    }
  }

  /**
   * Synchronise la session vers tous les domaines
   */
  async syncSessionToAllDomains(session: { access_token: string; refresh_token: string; user: { id: string; email?: string } }) {
    if (typeof window === 'undefined') return;

    try {
      // 1. Stocker dans localStorage pour la persistance
      localStorage.setItem('cross-domain-session', JSON.stringify(session));
      
      // 2. Créer un cookie partagé pour tous les domaines
      const sessionData = JSON.stringify(session);
      const hostname = window.location.hostname;
      
      // En développement local, utiliser une approche différente
      if (hostname.includes('localhost')) {
        // Stocker dans sessionStorage pour le partage entre onglets
        sessionStorage.setItem('cross-domain-session', sessionData);
        
        // Utiliser postMessage pour communiquer entre domaines
        this.broadcastSessionToAllWindows(session);
      } else {
        // En production, utiliser les cookies partagés
        const rootDomain = this.getRootDomain();
        
        // Cookie pour le domaine principal
        document.cookie = `cross-domain-session=${encodeURIComponent(sessionData)}; domain=${rootDomain}; path=/; SameSite=Lax; max-age=${7 * 24 * 60 * 60}`;
        
        // Cookie pour tous les sous-domaines
        document.cookie = `cross-domain-session=${encodeURIComponent(sessionData)}; domain=.${rootDomain}; path=/; SameSite=Lax; max-age=${7 * 24 * 60 * 60}`;
      }
      
      // 3. Notifier les autres onglets/fenêtres
      window.postMessage({
        type: 'CROSS_DOMAIN_SESSION_SYNC',
        session: session
      }, '*');
      
      } catch {
      // Erreur silencieuse
    }
  }

  /**
   * Supprime la session de tous les domaines
   */
  async clearSessionFromAllDomains() {
    if (typeof window === 'undefined') return;

    try {
      // 1. Nettoyer localStorage
      localStorage.removeItem('cross-domain-session');
      
      // 2. Nettoyer les cookies
      const rootDomain = this.getRootDomain();
      
      // Supprimer le cookie du domaine principal
      document.cookie = `cross-domain-session=; domain=${rootDomain}; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      
      // Supprimer le cookie des sous-domaines
      document.cookie = `cross-domain-session=; domain=.${rootDomain}; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      
      // 3. Notifier les autres onglets/fenêtres
      window.postMessage({
        type: 'CROSS_DOMAIN_SESSION_CLEAR'
      }, '*');
      
      } catch {
      // Erreur silencieuse
    }
  }

  /**
   * Récupère la session depuis le stockage cross-domain
   */
  getCrossDomainSession(): { access_token: string; refresh_token: string; user: { id: string; email?: string } } | null {
    if (typeof window === 'undefined') return null;

    try {
      const hostname = window.location.hostname;
      
      // En développement local, essayer sessionStorage d'abord
      if (hostname.includes('localhost')) {
        const sessionStorageSession = sessionStorage.getItem('cross-domain-session');
        if (sessionStorageSession) {
          return JSON.parse(sessionStorageSession);
        }
      }
      
      // 1. Essayer localStorage
      const localSession = localStorage.getItem('cross-domain-session');
      if (localSession) {
        return JSON.parse(localSession);
      }
      
      // 2. Essayer le cookie
      const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('cross-domain-session='));
      
      if (cookieValue) {
        const sessionData = decodeURIComponent(cookieValue.split('=')[1]);
        return JSON.parse(sessionData);
      }
      
      return null;
      } catch {
      return null;
    }
  }

  /**
   * Diffuse la session vers toutes les fenêtres ouvertes
   */
  private broadcastSessionToAllWindows(session: { access_token: string; refresh_token: string; user: { id: string; email?: string } }) {
    if (typeof window === 'undefined') return;
    
    try {
      // Diffuser vers toutes les fenêtres du même domaine
      window.postMessage({
        type: 'CROSS_DOMAIN_SESSION_BROADCAST',
        session: session,
        timestamp: Date.now()
      }, '*');
      
      // Essayer de communiquer avec les autres onglets via BroadcastChannel
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('cross-domain-session');
        channel.postMessage({
          type: 'SESSION_SYNC',
          session: session
        });
        channel.close();
      }
      } catch {
      // Erreur silencieuse
    }
  }

  /**
   * Restaure la session dans Supabase
   */
  async restoreSessionInSupabase(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    try {
      const session = this.getCrossDomainSession();
      if (!session) return false;

      const supabase = supabaseBrowserWithCookies();
      const { error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      });

      return !error;
      } catch {
      return false;
    }
  }

  /**
   * Obtient le domaine racine
   */
  private getRootDomain(): string {
    if (typeof window === 'undefined') return 'qgchatting.com';
    
    const hostname = window.location.hostname;
    
    // En développement - utiliser le domaine complet pour localhost
    if (hostname === 'localhost' || hostname.includes('localhost')) {
      return 'localhost:3000';
    }
    
    // En production, extraire le domaine racine
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    
    return hostname;
  }
}

// Instance globale
export const crossDomainSessionSync = CrossDomainSessionSync.getInstance();
