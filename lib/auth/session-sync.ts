'use client';

import { supabaseBrowser } from '@/lib/supabase/client';

/**
 * Système de synchronisation de session simple pour les subdomains
 */
export class SessionSync {
  private static instance: SessionSync;
  private listeners: Set<() => void> = new Set();

  static getInstance(): SessionSync {
    if (!SessionSync.instance) {
      SessionSync.instance = new SessionSync();
    }
    return SessionSync.instance;
  }

  /**
   * Synchronise la session avec les autres onglets/subdomains
   */
  async syncSession(): Promise<boolean> {
    try {
      const supabase = supabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const sessionData = {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          user: session.user
        };
        
        // Stocker la session dans localStorage pour le partage
        localStorage.setItem('supabase_session', JSON.stringify(sessionData));
        
        // Stocker aussi dans les cookies pour la synchronisation cross-domain
        this.setCookie('supabase_session', JSON.stringify(sessionData));
        
        // Notifier les autres composants
        this.notifyListeners();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erreur sync session:', error);
      return false;
    }
  }

  /**
   * Récupère la session depuis localStorage
   */
  getStoredSession(): any {
    try {
      const stored = localStorage.getItem('supabase_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  /**
   * Nettoie la session stockée
   */
  clearStoredSession(): void {
    localStorage.removeItem('supabase_session');
    this.clearCookie('supabase_session');
    this.notifyListeners();
  }

  /**
   * Ajoute un listener pour les changements de session
   */
  addListener(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notifie tous les listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => callback());
  }

  /**
   * Définit un cookie cross-domain
   */
  private setCookie(name: string, value: string, days: number = 7): void {
    if (typeof document === 'undefined') return;
    
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    
    const domain = window.location.hostname === 'localhost' 
      ? 'localhost' 
      : '.qgchatting.com';
    
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;domain=${domain};SameSite=Lax;Secure=${window.location.protocol === 'https:'}`;
  }

  /**
   * Supprime un cookie cross-domain
   */
  private clearCookie(name: string): void {
    if (typeof document === 'undefined') return;
    
    const domain = window.location.hostname === 'localhost' 
      ? 'localhost' 
      : '.qgchatting.com';
    
    // Supprimer pour le domaine actuel
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    // Supprimer pour le domaine parent
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${domain}`;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${domain}`;
  }

  /**
   * Récupère un cookie
   */
  private getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return decodeURIComponent(parts.pop()?.split(';').shift() || '');
    }
    return null;
  }

  /**
   * Initialise la synchronisation
   */
  async initialize(): Promise<void> {
    // Vérifier d'abord les cookies pour récupérer une session existante
    const cookieSession = this.getCookie('supabase_session');
    if (cookieSession) {
      try {
        const sessionData = JSON.parse(cookieSession);
        if (sessionData.access_token) {
          // Restaurer la session depuis les cookies
          const supabase = supabaseBrowser();
          await supabase.auth.setSession({
            access_token: sessionData.access_token,
            refresh_token: sessionData.refresh_token
          });
        }
      } catch (error) {
        console.error('Erreur restauration session depuis cookies:', error);
      }
    }

    // Écouter les changements d'état d'authentification
    const supabase = supabaseBrowser();
    
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        this.syncSession();
      } else if (event === 'SIGNED_OUT') {
        this.clearStoredSession();
      }
    });

    // Synchroniser la session actuelle
    await this.syncSession();
  }
}

// Instance globale
export const sessionSync = SessionSync.getInstance();
