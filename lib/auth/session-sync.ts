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
        // Stocker la session dans localStorage pour le partage
        localStorage.setItem('supabase_session', JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          user: session.user
        }));
        
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
   * Initialise la synchronisation
   */
  async initialize(): Promise<void> {
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
